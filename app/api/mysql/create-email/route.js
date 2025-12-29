import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { createClient } from '@supabase/supabase-js';
import XinnetMailAPI from '@/lib/xinnet-mail-api';

// 初始化 Supabase 客户端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 新网邮箱 API 配置
const XINNET_CORPID = process.env.XINNET_CORPID;
const XINNET_CORPSECRET = process.env.XINNET_CORPSECRET;
const XINNET_DOMAIN = process.env.XINNET_DOMAIN || 'binfluencer.xyz';
const DEFAULT_PASSWORD = process.env.XINNET_DEFAULT_PASSWORD || 'Qwer1324..';

/**
 * 创建 MySQL 连接池
 */
function createMySQLConnection() {
  const config = {
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306'),
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

/**
 * 生成邮箱地址
 */
function generateEmailAddress(name) {
  const cleanName = name
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
  
  return `${cleanName}@${XINNET_DOMAIN}`;
}

/**
 * 拆分中文姓名
 */
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
  } else {
    return {
      lastname: trimmed[0] || 'User',
      firstname: trimmed.substring(1) || 'User',
    };
  }
}

/**
 * 调用新网企业邮箱 API 创建邮箱
 * @param {string} email - 邮箱地址
 * @param {string} fullName - 用户全名
 * @returns {Promise<object>} 创建结果
 */
async function createEmailWithProvider(email, fullName) {
  // 检查配置
  if (!XINNET_CORPID || !XINNET_CORPSECRET) {
    throw new Error('新网邮箱 API 配置缺失，请检查环境变量 XINNET_CORPID 和 XINNET_CORPSECRET');
  }

  // 初始化 API 客户端
  const apiClient = new XinnetMailAPI(XINNET_CORPID, XINNET_CORPSECRET, XINNET_DOMAIN);

  // 拆分姓名
  const { firstname, lastname } = splitChineseName(fullName);

  try {
    // 调用 API 创建用户
    const success = await apiClient.addUser(
      email,                    // loginuserid: 完整邮箱地址
      DEFAULT_PASSWORD,         // password: 默认密码
      firstname,                // firstname: 名字
      lastname,                 // lastname: 姓氏
      1024,                     // quota: 邮箱空间 1024 MB
      {
        // 可选参数
        pop: true,
        imap: true,
        smtp: true,
        webmail: true,
      }
    );

    if (success) {
      return {
        success: true,
        email: email,
        message: '邮箱创建成功',
      };
    } else {
      throw new Error('创建邮箱失败：API 返回失败');
    }
  } catch (error) {
    // 处理特定错误码
    if (error.message.includes('40006902')) {
      throw new Error('该邮箱地址已被使用，请尝试其他名称');
    } else if (error.message.includes('20002005')) {
      throw new Error('邮箱地址格式不正确');
    } else if (error.message.includes('20002004')) {
      throw new Error('密码加密失败，请联系管理员');
    }
    
    // 重新抛出其他错误
    throw error;
  }
}

/**
 * 在 MySQL 中创建邮箱记录
 */
async function createEmailInMySQL(supabaseUserId, email, fullName) {
  const pool = createMySQLConnection();
  
  try {
    // 检查是否已存在
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

    // 获取用户的 user_id（从 t_red_user 表）
    let [userRows] = await pool.execute(
      'SELECT user_id FROM t_red_user WHERE supabase_user_id = ?',
      [supabaseUserId]
    );

    // 如果用户不存在，自动创建用户记录
    if (userRows.length === 0) {
      // 获取用户信息
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', supabaseUserId)
        .single();

      const userEmail = profile?.email || '';
      const userName = profile?.full_name || userEmail.split('@')[0] || 'User';

      // 获取下一个 red_id
      const [maxRedId] = await pool.execute(
        'SELECT COALESCE(MAX(red_id), 0) + 1 as next_red_id FROM t_red_user'
      );
      const nextRedId = maxRedId[0]?.next_red_id || 1;

      // 创建用户记录（注意：t_red_user 表没有 created_at 和 updated_at 字段）
      const [insertResult] = await pool.execute(
        `INSERT INTO t_red_user (
          supabase_user_id,
          red_id,
          login_email,
          shipping_full_name
        ) VALUES (?, ?, ?, ?)`,
        [supabaseUserId, nextRedId, userEmail, userName]
      );

      // 重新查询获取 user_id
      [userRows] = await pool.execute(
        'SELECT user_id FROM t_red_user WHERE supabase_user_id = ?',
        [supabaseUserId]
      );
    }

    const userId = userRows[0].user_id;

    // 获取下一个 id（如果表中有数据）
    const [maxId] = await pool.execute(
      'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM t_red_user_email'
    );
    const nextId = maxId[0]?.next_id || 1;

    // 插入邮箱记录（包含所有必填字段）
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
      email: email,
      message: '邮箱记录创建成功',
    };
  } finally {
    await pool.end();
  }
}

export async function POST(request) {
  try {
    // 从请求头获取用户认证信息
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // 验证 Supabase token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: '无效的认证令牌' },
        { status: 401 }
      );
    }

    const { name } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: '缺少必要参数：name' },
        { status: 400 }
      );
    }

    // 获取用户信息
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const fullName = profile?.full_name || name;

    // 生成邮箱地址
    let emailAddress = generateEmailAddress(fullName);
    let finalEmail = emailAddress;
    let attempts = 0;
    const maxAttempts = 10; // 最多尝试 10 次

    // 尝试创建邮箱，如果已存在则添加数字后缀重试
    while (attempts < maxAttempts) {
      try {
        // 先检查 Supabase profiles 表中是否已存在（与 /api/create-email 保持一致）
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('business_email')
          .eq('business_email', emailAddress)
          .single();

        if (existingProfile) {
          // 数据库中已存在，生成新的邮箱地址
          const baseName = emailAddress.split('@')[0];
          const counter = attempts + 1;
          emailAddress = `${baseName}${counter}@${XINNET_DOMAIN}`;
          attempts++;
          continue;
        }

        // 检查 MySQL 中是否已存在（额外检查）
        const pool = createMySQLConnection();
        const [existing] = await pool.execute(
          'SELECT * FROM t_red_user_email WHERE email = ?',
          [emailAddress]
        );
        await pool.end();

        if (existing.length > 0) {
          // MySQL 中已存在，生成新的邮箱地址
          const baseName = emailAddress.split('@')[0];
          const counter = attempts + 1;
          emailAddress = `${baseName}${counter}@${XINNET_DOMAIN}`;
          attempts++;
          continue;
        }

        // 尝试通过 API 创建邮箱
        await createEmailWithProvider(emailAddress, fullName);
        
        // 创建成功
        finalEmail = emailAddress;
        break;
      } catch (error) {
        // 如果是邮箱已存在的错误，尝试下一个（与 /api/create-email 保持一致）
        if (error.message.includes('已被使用') || error.message.includes('40006902')) {
          const baseName = emailAddress.split('@')[0];
          const counter = attempts + 1;
          emailAddress = `${baseName}${counter}@${XINNET_DOMAIN}`;
          attempts++;
          continue;
        }
        
        // 其他错误直接抛出
        throw error;
      }
    }

    if (attempts >= maxAttempts) {
      throw new Error('尝试创建邮箱失败次数过多，请稍后重试或联系管理员');
    }

    // 在 MySQL 中创建邮箱记录
    await createEmailInMySQL(user.id, finalEmail, fullName);

    // 更新 Supabase profiles 表中的邮箱地址和创建时间（与 /api/create-email 保持一致）
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

