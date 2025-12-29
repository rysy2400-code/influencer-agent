import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

/**
 * 获取 Supabase 客户端（运行时初始化）
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

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
 * 在 MySQL 中创建用户记录
 */
async function createUserInMySQL(supabaseUserId, email, fullName, password) {
  const pool = createMySQLConnection();
  
  try {
    // 获取下一个 red_id（如果表中有数据）
    const [maxRedId] = await pool.execute(
      'SELECT COALESCE(MAX(red_id), 0) + 1 as next_red_id FROM t_red_user'
    );
    const nextRedId = maxRedId[0]?.next_red_id || 1;

    // 加密密码（如果提供了密码）
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // 确保邮箱和用户名不为空
    const finalEmail = email || '';
    const finalFullName = fullName || finalEmail.split('@')[0] || 'User';

    // 插入用户记录（注意：t_red_user 表没有 created_at 和 updated_at 字段）
    const [result] = await pool.execute(
      `INSERT INTO t_red_user (
        supabase_user_id,
        red_id,
        login_email,
        shipping_full_name,
        password
      ) VALUES (?, ?, ?, ?, ?)`,
      [supabaseUserId, nextRedId, finalEmail, finalFullName, hashedPassword]
    );

    return {
      success: true,
      insertId: result.insertId,
      redId: nextRedId,
    };
  } finally {
    await pool.end();
  }
}

export async function POST(request) {
  let pool;
  
  try {
    console.log('[create-user API] 收到请求');
    
    // 从请求体获取用户信息（优先使用请求体中的信息，因为注册时 profile 可能还未创建）
    const body = await request.json().catch(() => ({}));
    const requestEmail = body.email;
    const requestFullName = body.full_name;
    const requestPassword = body.password;
    const requestSupabaseUserId = body.supabase_user_id;
    
    console.log('[create-user API] 请求体:', {
      hasEmail: !!requestEmail,
      hasFullName: !!requestFullName,
      hasPassword: !!requestPassword,
      hasSupabaseUserId: !!requestSupabaseUserId,
      supabaseUserId: requestSupabaseUserId,
    });

    let supabaseUserId = null;
    let userEmail = '';
    let userFullName = '';

    // 从请求头获取用户认证信息（如果有）
    const authHeader = request.headers.get('authorization');
    console.log('[create-user API] 认证头:', {
      hasAuthHeader: !!authHeader,
      startsWithBearer: authHeader?.startsWith('Bearer '),
    });
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // 有 token 的情况：验证 token 并获取用户信息
      console.log('[create-user API] 使用 token 验证');
      const token = authHeader.substring(7);
      const supabase = getSupabaseClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        console.error('[create-user API] Token 验证失败:', authError);
        return NextResponse.json(
          { error: '无效的认证令牌' },
          { status: 401 }
        );
      }
      
      supabaseUserId = user.id;
      userEmail = user.email || '';
      console.log('[create-user API] Token 验证成功，用户 ID:', supabaseUserId);
      
      // 获取用户信息（从 Supabase 获取作为备用）
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', user.id)
        .single();
      
      userEmail = profile?.email || userEmail;
      userFullName = profile?.full_name || '';
    } else if (requestSupabaseUserId) {
      // 没有 token 但提供了 supabase_user_id 的情况（注册时没有 session）
      console.log('[create-user API] 使用 supabase_user_id 验证:', requestSupabaseUserId);
      
      // 验证用户是否在 Supabase 中存在（使用 service role key）
      // 只有在验证成功的情况下才允许创建 MySQL 用户记录，提高安全性
      try {
        const supabase = getSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(requestSupabaseUserId);
        
        if (authError || !user) {
          console.error('[create-user API] Admin API 验证失败:', {
            error: authError?.message || '用户不存在',
            code: authError?.status || '未知',
          });
          return NextResponse.json(
            { error: '用户验证失败：用户不存在或无效。请确保用户已在 Supabase 中成功注册。' },
            { status: 401 }
          );
        }
        
        // 验证成功，使用验证后的用户信息
        supabaseUserId = requestSupabaseUserId;
        userEmail = user.email || '';
        console.log('[create-user API] Admin API 验证成功，用户邮箱:', userEmail);
        
        // 尝试从 profiles 获取信息
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', requestSupabaseUserId)
          .single();
        
        userEmail = profile?.email || userEmail;
        userFullName = profile?.full_name || '';
      } catch (adminError) {
        console.error('[create-user API] Admin API 调用异常:', {
          error: adminError.message,
          stack: adminError.stack,
        });
        return NextResponse.json(
          { error: '用户验证服务异常，无法创建用户。请稍后重试。' },
          { status: 500 }
        );
      }
    } else {
      console.error('[create-user API] 缺少认证信息');
      return NextResponse.json(
        { error: '未授权访问：需要提供认证令牌或 supabase_user_id' },
        { status: 401 }
      );
    }

    // 检查用户是否已在 MySQL 中存在
    pool = createMySQLConnection();
    const [existingUsers] = await pool.execute(
      'SELECT user_id, red_id FROM t_red_user WHERE supabase_user_id = ?',
      [supabaseUserId]
    );

    if (existingUsers.length > 0) {
      await pool.end();
      return NextResponse.json({
        success: true,
        message: '用户已存在',
        user_id: existingUsers[0].user_id,
        red_id: existingUsers[0].red_id,
      });
    }

    // 优先使用请求体中的信息，如果没有则从 Supabase 获取
    const email = requestEmail || userEmail || '';
    const fullName = requestFullName || userFullName || (email ? email.split('@')[0] : 'User');
    const password = requestPassword || null;

    console.log('[create-user API] 准备创建用户:', {
      supabaseUserId,
      email,
      fullName,
      hasPassword: !!password,
    });

    // 在 MySQL 中创建用户
    const result = await createUserInMySQL(supabaseUserId, email, fullName, password);

    console.log('[create-user API] MySQL 用户创建成功:', {
      user_id: result.insertId,
      red_id: result.redId,
    });

    await pool.end();

    return NextResponse.json({
      success: true,
      message: '用户创建成功',
      user_id: result.insertId,
      red_id: result.redId,
    });
  } catch (error) {
    console.error('[create-user API] 创建 MySQL 用户失败:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    
    if (pool) {
      await pool.end();
    }

    return NextResponse.json(
      { 
        error: error.message || '创建用户失败',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

