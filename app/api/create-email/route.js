import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import XinnetMailAPI from '@/lib/xinnet-mail-api';

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
 * 获取新网邮箱配置（运行时获取）
 */
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

/**
 * 生成邮箱地址
 * 格式：红人名字@binfluencer.xyz
 */
function generateEmailAddress(name, domain) {
  // 移除空格，转换为小写，移除特殊字符
  const cleanName = name
    .toLowerCase()
    .replace(/\s+/g, '') // 移除所有空格
    .replace(/[^a-z0-9]/g, ''); // 只保留字母和数字
  
  return `${cleanName}@${domain}`;
}

/**
 * 将中文姓名拆分为 firstname 和 lastname
 * 简单策略：如果姓名长度 <= 2，第一个字符作为 lastname，其余作为 firstname
 * 如果姓名长度 > 2，前两个字符作为 lastname，其余作为 firstname
 * @param {string} fullName - 完整姓名
 * @returns {object} { firstname, lastname }
 */
function splitChineseName(fullName) {
  if (!fullName || fullName.trim().length === 0) {
    return { firstname: 'User', lastname: 'Influencer' };
  }
  
  const trimmed = fullName.trim();
  
  // 如果包含空格，按空格拆分
  if (trimmed.includes(' ')) {
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      return {
        lastname: parts[0],
        firstname: parts.slice(1).join(' '),
      };
    }
  }
  
  // 中文姓名处理
  if (trimmed.length <= 2) {
    // 2个字或更少：第一个字是姓，其余是名
    return {
      lastname: trimmed[0] || 'User',
      firstname: trimmed.substring(1) || 'User',
    };
  } else {
    // 3个字或更多：前两个字是姓，其余是名（适用于复姓）
    // 但更常见的做法是第一个字是姓，其余是名
    return {
      lastname: trimmed[0] || 'User',
      firstname: trimmed.substring(1) || 'User',
    };
  }
}

/**
 * 调用新网企业邮箱 API 创建邮箱
 * @param {string} email - 邮箱地址
 * @param {string} userId - 用户 ID
 * @param {string} fullName - 用户全名
 * @returns {Promise<object>} 创建结果
 */
async function createEmailWithProvider(email, userId, fullName) {
  const { XINNET_CORPID, XINNET_CORPSECRET, XINNET_DOMAIN, DEFAULT_PASSWORD } = getXinnetConfig();

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

export async function POST(request) {
  try {
    // 运行时获取配置和客户端
    const supabase = getSupabaseClient();
    const { XINNET_DOMAIN } = getXinnetConfig();

    const { name, userId } = await request.json();

    if (!name || !userId) {
      return NextResponse.json(
        { error: '缺少必要参数：name 和 userId' },
        { status: 400 }
      );
    }

    // 生成邮箱地址
    let emailAddress = generateEmailAddress(name, XINNET_DOMAIN);
    let finalEmail = emailAddress;
    let attempts = 0;
    const maxAttempts = 10; // 最多尝试 10 次

    // 尝试创建邮箱，如果已存在则添加数字后缀重试
    while (attempts < maxAttempts) {
      try {
        // 先检查数据库中是否已存在
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

        // 尝试通过 API 创建邮箱
        await createEmailWithProvider(emailAddress, userId, name);
        
        // 创建成功
        finalEmail = emailAddress;
        break;
      } catch (error) {
        // 如果是邮箱已存在的错误，尝试下一个
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

    // 更新数据库中的邮箱地址和创建时间
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        business_email: finalEmail,
        business_email_created_at: new Date().toISOString(),
      })
      .eq('id', userId);

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

