import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import mysql from 'mysql2/promise';

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
 * 从 TikTok URL 中提取用户名
 * 支持格式：
 * - https://www.tiktok.com/@username
 * - https://tiktok.com/@username
 * - @username
 * - username
 */
function extractTikTokUsername(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // 移除前后空格
  url = url.trim();

  // 如果已经是 @username 格式
  if (url.startsWith('@')) {
    return url.substring(1);
  }

  // 如果是完整 URL
  const urlMatch = url.match(/tiktok\.com\/@([^/?]+)/i);
  if (urlMatch) {
    return urlMatch[1];
  }

  // 如果只是用户名（不包含 @ 和 URL）
  if (!url.includes('/') && !url.includes('@')) {
    return url;
  }

  return null;
}

/**
 * 构建 TikTok 用户页面 URL
 */
function buildTikTokUrl(username) {
  return `https://www.tiktok.com/@${username}`;
}

/**
 * 爬取 TikTok Bio 信息
 * 注意：TikTok 有反爬虫机制，可能需要使用无头浏览器
 * @param {string} username - TikTok 用户名
 * @returns {Promise<string|null>} Bio 内容，如果失败返回 null
 */
async function scrapeTikTokBio(username) {
  try {
    const url = buildTikTokUrl(username);
    
    // 尝试获取页面内容
    // 注意：TikTok 可能返回 JavaScript 渲染的内容，直接 fetch 可能无法获取
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
      console.error(`TikTok 页面请求失败: ${response.status} ${response.statusText}`);
      return null;
    }

    const html = await response.text();
    
    // 尝试从 HTML 中提取 Bio 信息
    // TikTok 的页面结构可能包含在 JSON-LD 或 script 标签中
    // 这里使用简单的正则匹配，实际可能需要更复杂的解析
    
    // 方法 1: 尝试从 JSON-LD 中提取
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/is);
    if (jsonLdMatch) {
      try {
        const jsonData = JSON.parse(jsonLdMatch[1]);
        if (jsonData.description) {
          return jsonData.description;
        }
      } catch (e) {
        // JSON 解析失败，继续尝试其他方法
      }
    }

    // 方法 2: 尝试从页面中查找 bio 相关的内容
    // TikTok 的 bio 可能在 data-e2e="user-bio" 或其他属性中
    const bioMatch = html.match(/data-e2e="user-bio"[^>]*>([^<]+)</i) || 
                   html.match(/"userInfo":\s*\{[^}]*"signature":\s*"([^"]+)"/i) ||
                   html.match(/"description":\s*"([^"]+)"/i);
    
    if (bioMatch && bioMatch[1]) {
      return bioMatch[1];
    }

    // 方法 3: 尝试从 window.__UNIVERSAL_DATA_FOR_REHYDRATION__ 中提取
    const universalDataMatch = html.match(/window\.__UNIVERSAL_DATA_FOR_REHYDRATION__\s*=\s*({.*?});/s);
    if (universalDataMatch) {
      try {
        const data = JSON.parse(universalDataMatch[1]);
        // 递归查找 bio 或 description
        const findBio = (obj) => {
          if (typeof obj !== 'object' || obj === null) return null;
          if (obj.signature || obj.bio || obj.description) {
            return obj.signature || obj.bio || obj.description;
          }
          for (const key in obj) {
            const result = findBio(obj[key]);
            if (result) return result;
          }
          return null;
        };
        const bio = findBio(data);
        if (bio) return bio;
      } catch (e) {
        // 解析失败
      }
    }

    // 如果所有方法都失败，返回 null
    console.warn('无法从 TikTok 页面提取 Bio 信息');
    return null;
  } catch (error) {
    console.error('爬取 TikTok Bio 失败:', error);
    return null;
  }
}

/**
 * 验证 Bio 中是否包含邮箱地址
 * @param {string} bio - Bio 内容
 * @param {string} email - 要验证的邮箱地址
 * @returns {boolean} 是否包含邮箱
 */
function verifyEmailInBio(bio, email) {
  if (!bio || !email) {
    return false;
  }

  // 转换为小写进行比较（不区分大小写）
  const bioLower = bio.toLowerCase();
  const emailLower = email.toLowerCase();

  // 直接包含邮箱地址
  if (bioLower.includes(emailLower)) {
    return true;
  }

  // 也检查邮箱的变体（去除空格等）
  const emailNormalized = emailLower.replace(/\s+/g, '');
  if (bioLower.includes(emailNormalized)) {
    return true;
  }

  return false;
}

export async function POST(request) {
  try {
    const { tiktokUrl, email, userId } = await request.json();

    if (!tiktokUrl || !email || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters: tiktokUrl, email, and userId' },
        { status: 400 }
      );
    }

    // 获取 Supabase 客户端
    const supabase = getSupabaseClient();

    // 提取 TikTok 用户名
    const username = extractTikTokUsername(tiktokUrl);
    if (!username) {
      return NextResponse.json(
        { error: 'Invalid TikTok link format. Please use format: https://www.tiktok.com/@username or @username' },
        { status: 400 }
      );
    }

    // 爬取 TikTok Bio
    const bio = await scrapeTikTokBio(username);

    if (!bio) {
      return NextResponse.json(
        { 
          error: 'Unable to fetch TikTok Bio information.',
          verified: false,
        },
        { status: 200 }
      );
    }

    // 验证 Bio 中是否包含邮箱
    const isVerified = verifyEmailInBio(bio, email);

    // 更新数据库（同时更新 Supabase 和 MySQL）
    if (isVerified) {
      const tiktokUrl = buildTikTokUrl(username);
      const now = new Date();
      // Supabase 使用 ISO 格式
      const verifiedAtISO = now.toISOString();
      // MySQL 使用 YYYY-MM-DD HH:MM:SS 格式
      const verifiedAtMySQL = now.toISOString().slice(0, 19).replace('T', ' ');

      // 1. 更新 Supabase profiles 表
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          tiktok_username: username,
          tiktok_url: tiktokUrl,
          tiktok_bio_verified: true,
          tiktok_bio_verified_at: verifiedAtISO,
        })
        .eq('id', userId);

      if (updateError) {
        console.error('更新 Supabase profiles 表失败:', updateError);
        // 继续尝试更新 MySQL，即使 Supabase 更新失败
      } else {
        console.log('Supabase profiles 表更新成功');
      }

      // 2. 更新 MySQL t_red_user_email 表
      let pool;
      try {
        pool = createMySQLConnection();
        
        // 检查是否存在邮箱记录
        const [emailRows] = await pool.execute(
          'SELECT id FROM t_red_user_email WHERE supabase_user_id = ?',
          [userId]
        );

        if (emailRows.length > 0) {
          // 更新现有记录（使用 MySQL 兼容的日期格式）
          await pool.execute(
            `UPDATE t_red_user_email 
             SET tiktok_username = ?,
                 tiktok_url = ?,
                 tiktok_bio_verified = ?,
                 tiktok_bio_verified_at = ?,
                 updated_at = NOW()
             WHERE supabase_user_id = ?`,
            [username, tiktokUrl, 1, verifiedAtMySQL, userId]
          );
          console.log('MySQL t_red_user_email 表更新成功（更新现有记录）');
        } else {
          console.warn('MySQL t_red_user_email 表中未找到该用户的邮箱记录，跳过更新');
        }
      } catch (mysqlError) {
        console.error('更新 MySQL t_red_user_email 表失败:', mysqlError);
        // 即使 MySQL 更新失败，也返回验证结果（因为 Supabase 可能已更新成功）
      } finally {
        if (pool) {
          await pool.end();
        }
      }
    }

    return NextResponse.json({
      verified: isVerified,
      bio: bio.substring(0, 200), // 返回部分 Bio 内容用于 display
      username: username,
      message: isVerified 
        ? 'Verification successful! Your email has been correctly added to your TikTok Bio.' 
        : 'Your email address was not found in your TikTok Bio.',
    });
  } catch (error) {
    console.error('验证 TikTok Bio 失败:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Verification failed.',
        verified: false,
      },
      { status: 500 }
    );
  }
}
