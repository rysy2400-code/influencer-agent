import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const BASE_URL = 'http://open.global-mail.cn';

class XinnetMailAPI {
  /**
   * 初始化新网企业邮箱 API 客户端
   * @param {string} corpid - 企业 ID
   * @param {string} corpsecret - 企业密钥
   * @param {string} domain - 域名（如：binfluencer.xyz）
   */
  constructor(corpid, corpsecret, domain = 'binfluencer.xyz') {
    this.corpid = corpid;
    this.corpsecret = corpsecret;
    this.domain = domain;
    this.accessToken = null;
    this.tokenExpiry = 0;
  }

  /**
   * 计算 MD5 哈希值
   * @param {string} content - 待计算的内容
   * @returns {string} MD5 哈希值（小写）
   */
  _calculateMD5(content) {
    return crypto.createHash('md5').update(content, 'utf8').digest('hex');
  }

  /**
   * AES 加密（用于密码加密）
   * 算法：AES/CBC/PKCS5Padding
   * Key: MD5(corpsecret) 的前16字节
   * IV: MD5(corpsecret) 的后16字节
   * @param {string} plainText - 明文
   * @returns {string} Base64 编码的密文
   */
  _aesEncrypt(plainText) {
    // 1. 计算 secret 的 MD5
    const md5Secret = this._calculateMD5(this.corpsecret);
    
    // 2. 派生 Key 和 IV
    const key = Buffer.from(md5Secret.substring(0, 16), 'utf8');
    const iv = Buffer.from(md5Secret.substring(16), 'utf8');
    
    // 3. 创建加密器
    const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
    
    // 4. 加密
    let encrypted = cipher.update(plainText, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    return encrypted;
  }

  /**
   * 获取 Access Token
   * @returns {Promise<string>} Access Token
   */
  async getAccessToken() {
    const uid = uuidv4();
    const ts = Date.now().toString();
    
    // 计算签名：md5(corpid + "_" + uuid + "_" + ts + "_" + corpsecret)
    const rawStr = `${this.corpid}_${uid}_${ts}_${this.corpsecret}`;
    const sign = this._calculateMD5(rawStr);
    
    const params = new URLSearchParams({
      corpId: this.corpid,
      uuid: uid,
      ts: ts,
      sign: sign,
    });
    
    const url = `${BASE_URL}/token?${params.toString()}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      const code = result.code;
      if (code !== '0' && code !== 0) {
        throw new Error(`获取 Token 失败: ${result.msg || '未知错误'}`);
      }
      
      // 提取 access_token
      let accessToken = null;
      const data = result.data;
      
      if (typeof data === 'string') {
        accessToken = data;
      } else if (typeof data === 'object' && data !== null) {
        accessToken = data.access_token || data.accessToken;
      }
      
      if (!accessToken) {
        accessToken = result.access_token || result.accessToken;
      }
      
      if (!accessToken) {
        throw new Error('响应中未找到 access_token');
      }
      
      this.accessToken = accessToken;
      // Token 有效期通常是 2 小时，这里设置为 1.5 小时以确保安全
      this.tokenExpiry = Date.now() + 90 * 60 * 1000;
      
      return accessToken;
    } catch (error) {
      console.error('获取 Access Token 失败:', error);
      throw error;
    }
  }

  /**
   * 确保拥有有效的 Access Token
   * @returns {Promise<string>} Access Token
   */
  async _ensureToken() {
    // 如果 token 不存在或已过期，重新获取
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      await this.getAccessToken();
    }
    return this.accessToken;
  }

  /**
   * 发送带签名的 POST 请求
   * @param {string} path - API 路径
   * @param {object} data - 请求体数据
   * @returns {Promise<object>} API 响应
   */
  async _postSignedRequest(path, data) {
    const token = await this._ensureToken();
    const uid = uuidv4();
    const ts = Date.now().toString();
    
    // JSON 请求体字符串（不包含空格，与签名保持一致）
    const jsonStr = JSON.stringify(data);
    
    // 计算签名：md5(json + "_" + corpid + "_" + uuid + "_" + ts + "_" + access_token + "_" + corpsecret)
    const rawStr = `${jsonStr}_${this.corpid}_${uid}_${ts}_${token}_${this.corpsecret}`;
    const sign = this._calculateMD5(rawStr);
    
    // 构建查询参数
    const params = new URLSearchParams({
      access_token: token,
      corpid: this.corpid,
      uuid: uid,
      ts: ts,
      sign: sign,
    });
    
    const url = `${BASE_URL}${path}?${params.toString()}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonStr,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API 请求失败:', error);
      throw error;
    }
  }

  /**
   * 添加用户（创建邮箱账户）
   * @param {string} loginuserid - 登录账号（完整邮箱地址）
   * @param {string} password - 密码（明文，会自动加密）
   * @param {string} firstname - 名字
   * @param {string} lastname - 姓氏
   * @param {number} quota - 邮箱空间大小（MB），默认 1024
   * @param {object} options - 可选参数
   * @returns {Promise<boolean>} 是否成功
   */
  async addUser(loginuserid, password, firstname, lastname, quota = 1024, options = {}) {
    const path = '/api/user/addUser';
    
    // 加密密码
    const encryptedPassword = this._aesEncrypt(password);
    
    // 构建 mail 对象
    const mailObj = {
      quota: quota,
      pop: options.pop !== undefined ? options.pop : true,
      imap: options.imap !== undefined ? options.imap : true,
      smtp: options.smtp !== undefined ? options.smtp : true,
      webmail: options.webmail !== undefined ? options.webmail : true,
      maxrcptnum: options.maxrcptnum || 200,
      maxmessagesize: options.maxmessagesize || 50,
      maxattachsize: options.maxattachsize || 50,
    };
    
    const body = {
      loginuserid: loginuserid,
      password: encryptedPassword,
      firstname: firstname,
      lastname: lastname,
      mail: mailObj,
      gender: options.gender !== undefined ? options.gender : 2, // 2-未知
    };
    
    if (this.domain) {
      body.domainName = this.domain;
    }
    if (options.orgids) {
      body.orgids = options.orgids;
    }
    if (options.position) {
      body.position = options.position;
    }
    if (options.mobile) {
      body.mobile = options.mobile;
    }
    if (options.telephone) {
      body.telephone = options.telephone;
    }
    if (options.birthday) {
      body.birthday = options.birthday;
    }
    
    try {
      const result = await this._postSignedRequest(path, body);
      
      const code = result.code;
      if (code === '0' || code === 0) {
        return true;
      } else {
        const errorMsg = result.msg || '未知错误';
        throw new Error(`创建用户失败: ${errorMsg} (错误码: ${code})`);
      }
    } catch (error) {
      console.error('添加用户失败:', error);
      throw error;
    }
  }

  /**
   * 查询用户（用于检查邮箱是否已存在）
   * @param {string} account - 账号（邮箱地址）
   * @param {number} pageNo - 页码，默认 1
   * @param {number} pageSize - 每页数量，默认 20
   * @returns {Promise<object|null>} 查询结果
   */
  async queryUsers(account = null, pageNo = 1, pageSize = 20) {
    const path = '/api/user/queryUsers';
    
    const queryMap = {};
    if (account) {
      queryMap.account = account;
    }
    
    const body = {
      pageNo: pageNo,
      pageSize: pageSize,
      queryMap: queryMap,
    };
    
    if (this.domain) {
      body.domainName = this.domain;
    }
    
    try {
      const result = await this._postSignedRequest(path, body);
      
      const code = result.code;
      if (code === '0' || code === 0) {
        return result.data || null;
      } else {
        console.warn(`查询用户失败: ${result.msg || '未知错误'}`);
        return null;
      }
    } catch (error) {
      console.error('查询用户失败:', error);
      return null;
    }
  }
}

export default XinnetMailAPI;

