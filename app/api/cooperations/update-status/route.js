import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { createClient } from '@supabase/supabase-js';

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
 * 验证状态转换是否合法
 */
function isValidStatusTransition(currentStatus, newStatus) {
  const validTransitions = {
    pending_application: ['influencer_applied', 'influencer_dislike'],
    invited: ['influencer_accepted', 'influencer_rejected'],
    brand_accepted: ['draft_uploaded'],
    influencer_accepted: ['draft_uploaded'],
    draft_uploaded: ['video_approved'],
    video_approved: ['video_uploaded'],
    video_uploaded: ['settled'], // 品牌方结算，但红人也可以看到
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
}

export async function PATCH(request) {
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
    const supabase = getSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: '无效的认证令牌' },
        { status: 401 }
      );
    }

    // 解析请求体
    const body = await request.json();
    const { cooperationId, newStatus, draftLink, videoLink, sparkCode, brandFeedback } = body;

    if (!cooperationId || !newStatus) {
      return NextResponse.json(
        { error: '缺少必要参数：cooperationId 和 newStatus' },
        { status: 400 }
      );
    }

    // 创建 MySQL 连接池
    pool = createMySQLConnection();

    // 先查询当前合作记录，验证所有权和当前状态
    const [rows] = await pool.execute(
      `SELECT * FROM t_red_cooperation 
       WHERE id = ? AND supabase_user_id = ?`,
      [cooperationId, user.id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: '合作记录不存在或无权访问' },
        { status: 404 }
      );
    }

    const currentCooperation = rows[0];
    const currentStatus = currentCooperation.status;

    // 验证状态转换是否合法
    // 如果新状态和当前状态相同，且是 draft_uploaded，允许更新（用于更新草稿链接）
    if (currentStatus === newStatus && newStatus === 'draft_uploaded') {
      // 允许更新草稿链接
    } else if (!isValidStatusTransition(currentStatus, newStatus)) {
      return NextResponse.json(
        { 
          error: `无效的状态转换：从 ${currentStatus} 到 ${newStatus}`,
          currentStatus,
          newStatus
        },
        { status: 400 }
      );
    }

    // 构建更新 SQL
    const updateFields = ['status = ?'];
    const updateValues = [newStatus];

    // 根据新状态更新相关字段
    if (newStatus === 'draft_uploaded' && draftLink) {
      updateFields.push('draft_link = ?');
      updateValues.push(draftLink);
    }

    if (newStatus === 'video_uploaded' || newStatus === 'video_approved') {
      if (videoLink) {
        updateFields.push('video_link = ?');
        updateValues.push(videoLink);
      }
      if (sparkCode) {
        updateFields.push('spark_code = ?');
        updateValues.push(sparkCode);
      }
    }

    if (brandFeedback) {
      updateFields.push('brand_feedback = ?');
      updateValues.push(brandFeedback);
    }

    updateValues.push(cooperationId, user.id);

    // 执行更新
    const [result] = await pool.execute(
      `UPDATE t_red_cooperation 
       SET ${updateFields.join(', ')}
       WHERE id = ? AND supabase_user_id = ?`,
      updateValues
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: '更新失败' },
        { status: 500 }
      );
    }

    // 查询更新后的记录
    const [updatedRows] = await pool.execute(
      `SELECT * FROM t_red_cooperation 
       WHERE id = ? AND supabase_user_id = ?`,
      [cooperationId, user.id]
    );

    return NextResponse.json({
      success: true,
      message: '状态更新成功',
      data: updatedRows[0],
    });
  } catch (error) {
    console.error('更新合作状态失败:', error);
    
    return NextResponse.json(
      { 
        error: error.message || '更新合作状态失败',
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

