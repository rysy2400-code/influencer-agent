import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { createClient } from '@supabase/supabase-js';
import XinnetMailAPI from '@/lib/xinnet-mail-api';

// 获取 Supabase 客户端（运行时初始化）
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// 获取新网邮箱配置（运行时获取）
function getXinnetConfig() {
  const XINNET_CORPID = process.env.XINNET_CORPID;
  const XINNET_CORPSECRET = process.env.XINNET_CORPSECRET;
  const XINNET_DOMAIN = process.env.XINNET_DOMAIN || 'binfluencer.xyz';
  const DEFAULT_PASSWORD = process.env.XINNET_DEFAULT_PASSWORD || 'Qwer1324..';

  return {
    XINNET_CORPID,
    XINNET_CORPSECRET,
    XINNET_DOMAIN,
    DEFAULT_PASSWORD,
  };
}

// 创建 MySQL 连接池
function createMySQLConnection() {
  const config = {
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || 'tiktok',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };

  if (!config.host || !config.user || !config.password) {
    throw new Error('Missing MySQL environment variables');
  }

  return mysql.createPool(config);
}

// 生成邮箱地址
function generateEmailAddress(name) {
  const { XINNET_DOMAIN } = getXinnetConfig();
  const cleanName = (name || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');

  const base = cleanName || 'user';
  return `${base}@${XINNET_DOMAIN}`;
}

// 拆分中文姓名
function splitChineseName(fullName) {
  if (!fullName || fullName.trim().length === 0) {
    return { firstname: 'User', lastname: 'Influencer' };
  }

  const trimmed = fullName.trim();

  if (trimmed.includes(' ')) {
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      return {
        lastname: parts[0],
        firstname: parts.slice(1).join(' '),
      };
    }
  }

  if (trimmed.length <= 2) {
    return {
      lastname: trimmed[0] || 'User',
      firstname: trimmed.substring(1) || 'User',
    };
  }

  return {
    lastname: trimmed[0] || 'User',
    firstname: trimmed.substring(1) || 'User',
  };
}

// 调用新网企业邮箱 API 创建邮箱
async function createEmailWithProvider(email, fullName) {
  const { XINNET_CORPID, XINNET_CORPSECRET, XINNET_DOMAIN, DEFAULT_PASSWORD } =
    getXinnetConfig();

  if (!XINNET_CORPID || !XINNET_CORPSECRET) {
    throw new Error('新网邮箱 API 配置缺失，请检查环境变量 XINNET_CORPID 和 XINNET_CORPSECRET');
  }

  const apiClient = new XinnetMailAPI(XINNET_CORPID, XINNET_CORPSECRET, XINNET_DOMAIN);

  const { firstname, lastname } = splitChineseName(fullName);

  try {
    const success = await apiClient.addUser(
      email, // loginuserid: 完整邮箱地址
      DEFAULT_PASSWORD, // 默认密码
      firstname,
      lastname,
      1024, // 配额 MB
      {
        pop: true,
        imap: true,
        smtp: true,
        webmail: true,
      }
    );

    if (success) {
      return {
        success: true,
        email,
        message: '邮箱创建成功',
      };
    }

    throw new Error('创建邮箱失败：API 返回失败');
  } catch (error) {
    const msg = String(error?.message || '');
    if (msg.includes('40006902')) {
      throw new Error('该邮箱地址已被使用，请尝试其他名称');
    }
    if (msg.includes('20002005')) {
      throw new Error('邮箱地址格式不正确');
    }
    if (msg.includes('20002004')) {
      throw new Error('密码加密失败，请联系管理员');
    }
    throw error;
  }
}

// 在 MySQL 中创建邮箱记录（方案A：显式接收 supabase）
async function createEmailInMySQL(supabase, supabaseUserId, email, fullName) {
  const pool = createMySQLConnection();

  try {
    // 是否已存在记录
    const [existing] = await pool.execute(
      'SELECT * FROM t_red_user_email WHERE supabase_user_id = ?',
      [supabaseUserId]
    );

    if (existing.length > 0) {
      return {
        success: true,
        email: existing[0].email || email,
        message: '邮箱记录已存在',
      };
    }

    // 先查 t_red_user 是否有用户
    let [userRows] = await pool.execute(
      'SELECT user_id FROM t_red_user WHERE supabase_user_id = ?',
      [supabaseUserId]
    );

    if (userRows.length === 0) {
      // 从 Supabase profiles 取用户信息
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', supabaseUserId)
        .single();

      const userEmail = profile?.email || '';
      const userName = profile?.full_name || userEmail.split('@')[0] || 'User';

      // 下一个 red_id
      const [maxRedId] = await pool.execute(
        'SELECT COALESCE(MAX(red_id), 0) + 1 as next_red_id FROM t_red_user'
      );
      const nextRedId = maxRedId[0]?.next_red_id || 1;

      await pool.execute(
        `INSERT INTO t_red_user (
          supabase_user_id,
          red_id,
          login_email,
          shipping_full_name
        ) VALUES (?, ?, ?, ?)`,
        [supabaseUserId, nextRedId, userEmail, userName]
      );

      [userRows] = await pool.execute(
        'SELECT user_id FROM t_red_user WHERE supabase_user_id = ?',
        [supabaseUserId]
      );
    }

    const userId = userRows[0].user_id;

    // 下一个 id
    const [maxId] = await pool.execute(
      'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM t_red_user_email'
    );
    const nextId = maxId[0]?.next_id || 1;

    await pool.execute(
      `INSERT INTO t_red_user_email (
        id,
        user_id,
        supabase_user_id,
        email,
        email_type,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [nextId, userId, supabaseUserId, email, 1, 1]
    );

    return {
      success: true,
      email,
      message: '邮箱记录创建成功',
    };
  } finally {
    await pool.end();
  }
}

export async function POST(request) {
  try {
    // 认证头
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // Supabase 认证
    const supabase = getSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }

    const { name } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: '缺少必要参数：name' },
        { status: 400 }
      );
    }

    // 读取用户姓名
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const fullName = profile?.full_name || name;
    const { XINNET_DOMAIN } = getXinnetConfig();

    // 生成邮箱地址并处理重名
    let emailAddress = generateEmailAddress(fullName);
    let finalEmail = emailAddress;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      try {
        console.log(`[创建邮箱] 尝试 ${attempts + 1}/${maxAttempts}: ${emailAddress}`);
        
        // Supabase 检查是否已存在
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('business_email')
          .eq('business_email', emailAddress)
          .single();

        if (existingProfile) {
          console.log(`[创建邮箱] Supabase 中已存在: ${emailAddress}`);
          const baseName = emailAddress.split('@')[0];
          const counter = attempts + 1;
          emailAddress = `${baseName}${counter}@${XINNET_DOMAIN}`;
          attempts++;
          continue;
        }

        // MySQL 检查是否已存在
        const pool = createMySQLConnection();
        const [existing] = await pool.execute(
          'SELECT * FROM t_red_user_email WHERE email = ?',
          [emailAddress]
        );
        await pool.end();

        if (existing.length > 0) {
          console.log(`[创建邮箱] MySQL 中已存在: ${emailAddress}`);
          const baseName = emailAddress.split('@')[0];
          const counter = attempts + 1;
          emailAddress = `${baseName}${counter}@${XINNET_DOMAIN}`;
          attempts++;
          continue;
        }

        // 通过新网 API 创建邮箱
        console.log(`[创建邮箱] 调用新网 API 创建: ${emailAddress}`);
        await createEmailWithProvider(emailAddress, fullName);
        console.log(`[创建邮箱] 新网 API 创建成功: ${emailAddress}`);

        finalEmail = emailAddress;
        break;
      } catch (error) {
        const msg = String(error?.message || '');
        console.error(`[创建邮箱] 尝试 ${attempts + 1} 失败: ${emailAddress}`, error.message);
        
        // 如果是邮箱已存在的错误，尝试下一个
        if (msg.includes('已被使用') || msg.includes('40006902')) {
          console.log(`[创建邮箱] 邮箱已被使用，尝试下一个: ${emailAddress}`);
          const baseName = emailAddress.split('@')[0];
          const counter = attempts + 1;
          emailAddress = `${baseName}${counter}@${XINNET_DOMAIN}`;
          attempts++;
          continue;
        }

        // 对于配置错误等不可重试的错误，直接抛出
        if (msg.includes('配置缺失') || msg.includes('环境变量')) {
          console.error(`[创建邮箱] 配置错误，停止重试:`, error.message);
          throw error;
        }

        // 其他错误也抛出，但记录详细信息
        console.error(`[创建邮箱] 非重试错误，停止重试:`, error.message);
        throw error;
      }
    }

    if (attempts >= maxAttempts) {
      throw new Error('尝试创建邮箱失败次数过多，请稍后重试或联系管理员');
    }

    // 写入 MySQL 记录（方案A：传入 supabase）
    await createEmailInMySQL(supabase, user.id, finalEmail, fullName);

    // 更新 Supabase profiles 表
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        business_email: finalEmail,
        business_email_created_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('更新数据库失败:', updateError);
      // 即使数据库更新失败，邮箱已创建成功，所以继续返回成功
    }

    return NextResponse.json({
      email: finalEmail,
      message: '邮箱创建成功',
    });
  } catch (error) {
    console.error('创建邮箱失败:', error);
    return NextResponse.json(
      { error: error.message || '创建邮箱失败，请稍后重试' },
      { status: 500 }
    );
  }
}


