import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { createClient } from '@supabase/supabase-js';

// 初始化 Supabase 客户端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 创建 MySQL 连接
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
 * GET: 获取用户个人信息
 */
export async function GET(request) {
  let pool;
  
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
      console.error('[user-profile API] Token 验证失败:', {
        error: authError?.message || 'Unknown error',
        errorCode: authError?.status || 'N/A',
        tokenLength: token.length,
        usingServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      });
      return NextResponse.json(
        { error: '无效的认证令牌', details: authError?.message || 'Token validation failed' },
        { status: 401 }
      );
    }

    // 创建 MySQL 连接池
    pool = createMySQLConnection();

    // 查询用户信息
    const [rows] = await pool.execute(
      `SELECT 
        shipping_full_name,
        shipping_country,
        shipping_state_province,
        shipping_city,
        shipping_address_line,
        shipping_post_zip_code,
        shipping_telephone,
        payment_method,
        payment_account
       FROM t_red_user 
       WHERE supabase_user_id = ?`,
      [user.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
        isInitialized: false,
      });
    }

    const userData = rows[0];
    
    // 检查是否已初始化（至少需要寄样信息和收款信息）
    const isInitialized = !!(
      userData.shipping_full_name &&
      userData.shipping_country &&
      userData.shipping_city &&
      userData.shipping_address_line &&
      userData.shipping_telephone &&
      userData.payment_method &&
      userData.payment_account
    );

    return NextResponse.json({
      success: true,
      data: userData,
      isInitialized,
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json(
      { 
        error: error.message || '获取用户信息失败',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

/**
 * POST: 创建或更新用户个人信息
 */
export async function POST(request) {
  let pool;
  
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

    // 解析请求体
    const body = await request.json();
    const {
      shipping_full_name,
      shipping_country,
      shipping_state_province,
      shipping_city,
      shipping_address_line,
      shipping_post_zip_code,
      shipping_telephone,
      payment_method,
      payment_account,
    } = body;

    // 验证必填字段
    if (!shipping_full_name || !shipping_country || !shipping_city || 
        !shipping_address_line || !shipping_telephone || 
        !payment_method || !payment_account) {
      return NextResponse.json(
        { error: '请填写所有必填字段' },
        { status: 400 }
      );
    }

    // 创建 MySQL 连接池
    pool = createMySQLConnection();

    // 检查用户是否已存在
    const [existing] = await pool.execute(
      'SELECT user_id FROM t_red_user WHERE supabase_user_id = ?',
      [user.id]
    );

    if (existing.length > 0) {
      // 更新现有用户
      await pool.execute(
        `UPDATE t_red_user SET
          shipping_full_name = ?,
          shipping_country = ?,
          shipping_state_province = ?,
          shipping_city = ?,
          shipping_address_line = ?,
          shipping_post_zip_code = ?,
          shipping_telephone = ?,
          payment_method = ?,
          payment_account = ?
        WHERE supabase_user_id = ?`,
        [
          shipping_full_name,
          shipping_country,
          shipping_state_province,
          shipping_city,
          shipping_address_line,
          shipping_post_zip_code,
          shipping_telephone,
          payment_method,
          payment_account,
          user.id,
        ]
      );
    } else {
      // 创建新用户记录
      // 需要先获取一个可用的 user_id（可以使用 MAX(user_id) + 1 或自增）
      const [maxId] = await pool.execute('SELECT MAX(user_id) as max_id FROM t_red_user');
      const newUserId = (maxId[0]?.max_id || 0) + 1;

      await pool.execute(
        `INSERT INTO t_red_user (
          user_id, supabase_user_id, red_id,
          shipping_full_name, shipping_country, shipping_state_province,
          shipping_city, shipping_address_line, shipping_post_zip_code,
          shipping_telephone, payment_method, payment_account
        ) VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newUserId,
          user.id,
          shipping_full_name,
          shipping_country,
          shipping_state_province,
          shipping_city,
          shipping_address_line,
          shipping_post_zip_code,
          shipping_telephone,
          payment_method,
          payment_account,
        ]
      );
    }

    return NextResponse.json({
      success: true,
      message: '个人信息保存成功',
    });
  } catch (error) {
    console.error('保存用户信息失败:', error);
    return NextResponse.json(
      { 
        error: error.message || '保存用户信息失败',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

