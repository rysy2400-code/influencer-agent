import { NextResponse } from 'next/server';
import XinnetMailAPI from '@/lib/xinnet-mail-api';

// 新网邮箱 API 配置
const XINNET_CORPID = process.env.XINNET_CORPID;
const XINNET_CORPSECRET = process.env.XINNET_CORPSECRET;
const XINNET_DOMAIN = process.env.XINNET_DOMAIN || 'binfluencer.xyz';

/**
 * 查询所有邮箱地址
 */
export async function GET(request) {
  try {
    // 检查配置
    if (!XINNET_CORPID || !XINNET_CORPSECRET) {
      return NextResponse.json(
        { error: '新网邮箱 API 配置缺失，请检查环境变量 XINNET_CORPID 和 XINNET_CORPSECRET' },
        { status: 500 }
      );
    }

    // 初始化 API 客户端
    const apiClient = new XinnetMailAPI(XINNET_CORPID, XINNET_CORPSECRET, XINNET_DOMAIN);

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const pageNo = parseInt(searchParams.get('pageNo') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '100'); // 默认每页 100 条
    const account = searchParams.get('account') || null; // 可选：按账号搜索

    // 查询用户列表
    const result = await apiClient.queryUsers(account, pageNo, pageSize);

    if (!result) {
      return NextResponse.json(
        { error: '查询邮箱列表失败' },
        { status: 500 }
      );
    }

    // 提取邮箱地址列表
    const emails = [];
    // 新网 API 返回的字段名是 list
    const userList = result.list || result.result || [];
    
    if (Array.isArray(userList)) {
      userList.forEach(user => {
        if (user.loginuserid) {
          emails.push({
            account: user.loginuserid, // 完整邮箱地址
            displayName: user.displayName || '', // 用户姓名
            position: user.position || '', // 职位
            mobile: user.mobile || '', // 手机号
            telephone: user.telephone || '', // 座机号
            orgNames: user.orgNames || '', // 部门名称
            quota: user.mail?.quota ? Math.round(user.mail.quota / 1024) : 0, // 邮箱空间(MB)，API返回的是KB
            pop: user.mail?.pop || false,
            imap: user.mail?.imap || false,
            smtp: user.mail?.smtp || false,
            webmail: user.mail?.webmail || false,
          });
        }
      });
    }

    return NextResponse.json({
      success: true,
      domain: XINNET_DOMAIN,
      total: result.count || 0,
      pageNo: pageNo,
      pageSize: pageSize,
      totalPages: Math.ceil((result.count || 0) / pageSize),
      emails: emails,
    });
  } catch (error) {
    console.error('查询邮箱列表失败:', error);
    return NextResponse.json(
      { error: error.message || '查询邮箱列表失败' },
      { status: 500 }
    );
  }
}

