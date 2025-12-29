import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { createClient } from '@supabase/supabase-js';

// 初始化 Supabase 客户端（用于验证用户）
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
 * 根据状态分类合作记录
 * 
 * 分类规则：
 * - 申请合作：pending_application（只有待申请状态）
 * - 确认合作：invited（只有已邀请状态）
 * - 回传草稿：brand_accepted、influencer_accepted、draft_uploaded
 * - 回传发布视频：video_approved
 * - 品牌方结算：video_uploaded（待结算）、settled（结算完成）
 */
function categorizeByStatus(cooperations) {
  const categories = {
    application: [],      // 申请合作
    confirmation: [],     // 确认合作
    draft: [],            // 回传草稿
    video: [],            // 回传发布视频
    settlement: [],       // 品牌方结算
  };

  cooperations.forEach(coop => {
    const status = coop.status;
    
    // 申请合作：只有 pending_application
    if (status === 'pending_application') {
      categories.application.push(coop);
    }
    // 确认合作：只有 invited
    else if (status === 'invited') {
      categories.confirmation.push(coop);
    }
    // 回传草稿：brand_accepted、influencer_accepted、draft_uploaded
    else if (['brand_accepted', 'influencer_accepted', 'draft_uploaded'].includes(status)) {
      categories.draft.push(coop);
    }
    // 回传发布视频：video_approved
    else if (status === 'video_approved') {
      categories.video.push(coop);
    }
    // 品牌方结算：video_uploaded（待结算）、settled（结算完成）
    else if (['video_uploaded', 'settled'].includes(status)) {
      categories.settlement.push(coop);
    }
  });

  return categories;
}

// 注意：现在直接使用 Supabase UUID 查询，不再需要 getInfluencerId 函数

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
      console.error('[cooperations API] Token 验证失败:', {
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

    console.log(`[API] 查询合作记录 - Supabase User ID: ${user.id}`);

    // 创建 MySQL 连接池
    pool = createMySQLConnection();

    // 查询合作记录
    // 使用 supabase_user_id 字段查询（UUID）
    const [rows] = await pool.execute(
      `SELECT * FROM t_red_cooperation 
       WHERE supabase_user_id = ? 
       ORDER BY id DESC`,
      [user.id]  // 直接使用 Supabase UUID
    );

    console.log(`[API] 查询结果 - 找到 ${rows.length} 条记录`);

    // 如果没有找到记录，提供更详细的日志信息（使用 Supabase UUID）
    if (rows.length === 0) {
      const [checkRows] = await pool.execute(
        `SELECT DISTINCT supabase_user_id FROM t_red_cooperation LIMIT 10`
      );
      const availableUserIds = checkRows.map(r => r.supabase_user_id);
      console.warn(`[API] 警告 - 未找到合作记录。查询的 supabase_user_id: ${user.id}, 数据库中存在的 supabase_user_id 示例: ${availableUserIds.join(', ')}`);
      // 正常返回空数组（用户可能确实没有记录）
    }

    // 分类合作记录
    const categorized = categorizeByStatus(rows);

    return NextResponse.json({
      success: true,
      data: {
        application: categorized.application,
        confirmation: categorized.confirmation,
        draft: categorized.draft,
        video: categorized.video,
        settlement: categorized.settlement,
      },
      total: rows.length,
    });
  } catch (error) {
    console.error('查询合作记录失败:', error);
    
    // 如果是 MySQL 连接错误，提供更友好的错误信息
    if (error.message.includes('MySQL') || error.message.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { 
          error: '无法连接到数据库，请检查 MySQL 配置',
          details: error.message 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        error: error.message || '查询合作记录失败',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  } finally {
    // 关闭连接池
    if (pool) {
      await pool.end();
    }
  }
}

