'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';


export default function SetupEmailPage() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [creatingEmail, setCreatingEmail] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1); // 1: 生成邮箱, 2: 输入TikTok链接并验证, 3: 完成
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // 检查用户是否已登录
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
        return;
      }
      setSession(session);

      // 获取用户资料
      supabase
        .from('profiles')
        .select('full_name, email, business_email, email_setup_completed, tiktok_url, tiktok_bio_verified')
        .eq('id', session.user.id)
        .single()
        .then(({ data, error }) => {
          if (error && error.code !== 'PGRST116') {
            console.error('Failed to get user profile:', error);
          }
          setProfile(data);
          
          // 如果已经设置了邮箱，直接显示
          if (data?.business_email) {
            setEmail(data.business_email);
            if (data.tiktok_url) {
              setTiktokUrl(data.tiktok_url);
            }
            if (data.email_setup_completed) {
              // 已完成设置，跳转到 dashboard
              router.push('/dashboard');
            } else if (data.tiktok_bio_verified) {
              // 已验证但未完成，进入最后确认步骤
              setStep(3);
              setVerificationResult({ verified: true });
            } else {
              // 有邮箱但未验证，进入验证步骤
              setStep(2);
            }
          }
          setLoading(false);
        });
    });
  }, [router]);

  // 刷新 token 并获取最新的 session
  const refreshSession = async (currentSession = null) => {
    try {
      const sessionToRefresh = currentSession || session;
      
      if (!sessionToRefresh || !sessionToRefresh.refresh_token) {
        console.error('无法刷新 session: 缺少 refresh_token');
        return null;
      }

      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession({
        refresh_token: sessionToRefresh.refresh_token
      });
      
      if (refreshError) {
        console.error('刷新 session 失败:', refreshError);
        return null;
      }
      
      if (refreshedSession) {
        setSession(refreshedSession);
        return refreshedSession;
      }
      
      return null;
    } catch (err) {
      console.error('刷新 session 异常:', err);
      return null;
    }
  };

  const handleCreateEmail = async (retryCount = 0) => {
    if (!profile?.full_name) {
      setError('Please complete your name information first');
      return;
    }

    setCreatingEmail(true);
    setError(null);

    try {
      // 获取最新的 session（确保使用最新的 token）
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        setError('Please log in again');
        router.push('/login');
        return;
      }

      // 调用 MySQL API 创建邮箱（同时创建邮箱和记录到 MySQL）
      const response = await fetch('/api/mysql/create-email', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profile.full_name,
        }),
      });

      const data = await response.json();

      // 如果是 401 错误且是第一次尝试，刷新 token 并重试
      if (response.status === 401 && retryCount === 0) {
        const refreshedSession = await refreshSession(currentSession);
        if (refreshedSession) {
          // 使用新的 session 重试
          setCreatingEmail(false);
          return handleCreateEmail(1);
        } else {
          throw new Error('Token expired, please log in again');
        }
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create email');
      }

      // 同时保存邮箱到 Supabase profiles 表（用于兼容）
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          business_email: data.email,
          business_email_created_at: new Date().toISOString(),
        })
        .eq('id', currentSession.user.id);

      if (updateError) {
        console.warn('更新 Supabase profiles 失败:', updateError);
        // 不抛出错误，因为 MySQL 中已创建成功
      }

      setEmail(data.email);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingEmail(false);
    }
  };

  const handleVerifyTikTok = async () => {
    if (!tiktokUrl || !email) {
      setError('Please enter TikTok link first');
      return;
    }

    setVerifying(true);
    setError(null);
    setVerificationResult(null);

    try {
      // 获取最新的 session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        setError('Please log in again');
        router.push('/login');
        return;
      }

      const response = await fetch('/api/verify-tiktok-bio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tiktokUrl: tiktokUrl,
          email: email,
          userId: currentSession.user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      setVerificationResult(data);

      if (data.verified) {
        // 验证成功，进入下一步
        setStep(3);
      }
    } catch (err) {
      setError(err.message);
      setVerificationResult({ verified: false });
    } finally {
      setVerifying(false);
    }
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // 2秒后恢复
    } catch (err) {
      console.error('Failed to copy:', err);
      // 降级方案：使用传统方法
      const textArea = document.createElement('textarea');
      textArea.value = email;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    setError(null);

    try {
      // 获取最新的 session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        setError('Please log in again');
        router.push('/login');
        return;
      }

      // 更新用户资料，标记邮箱设置已完成
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          email_setup_completed: true,
        })
        .eq('id', currentSession.user.id);

      if (updateError) {
        throw new Error('Failed to update status: ' + updateError.message);
      }

      // 跳转到 dashboard
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-50 px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-blue-100/50 p-6 sm:p-8 space-y-6">
          {/* 进度指示 */}
          <div className="flex items-center justify-center space-x-2 sm:space-x-4 mb-6">
            <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                {step > 1 ? '✓' : '1'}
              </div>
              <span className="ml-2 text-xs sm:text-sm font-medium hidden sm:inline">Create Email</span>
            </div>
            <div className="w-8 sm:w-12 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                {step > 2 ? '✓' : '2'}
              </div>
              <span className="ml-2 text-xs sm:text-sm font-medium hidden sm:inline">Verify TikTok</span>
            </div>
            <div className="w-8 sm:w-12 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                3
              </div>
              <span className="ml-2 text-xs sm:text-sm font-medium hidden sm:inline">Complete</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-center">Set Up Your Business Email</h1>
          <p className="text-center text-gray-600">
            We'll create a dedicated business email for you to receive brand collaboration invitations
          </p>

          {error && (
            <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          {/* 步骤 1: 生成邮箱 */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <h2 className="text-lg font-semibold text-blue-900 mb-2">Email Information</h2>
                <div className="space-y-2">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Email Format:</span>
                    {profile?.full_name ? (
                      <span className="font-mono bg-white px-2 py-1 rounded">
                        {profile.full_name.toLowerCase().replace(/\s+/g, '')}@binfluencer.xyz
                      </span>
                    ) : (
                      <span className="text-gray-500">yourname@binfluencer.xyz</span>
                    )}
                  </p>
                  <p className="text-sm text-blue-700">
                    This email will be used to receive brand collaboration invitation emails
                  </p>
                </div>
              </div>

              <button
                onClick={handleCreateEmail}
                disabled={creatingEmail || !profile?.full_name}
                className="w-full px-6 py-3 text-base font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
              >
                {creatingEmail ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating email...
                  </span>
                ) : (
                  'Create My Business Email'
                )}
              </button>
            </div>
          )}

          {/* 步骤 2: 输入 TikTok 链接并验证 */}
          {step === 2 && email && (
            <div className="space-y-6">
              <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-green-900 mb-2">Email Created Successfully!</h2>
                    <p className="text-sm text-green-800 mb-3">
                      Your business email:
                    </p>
                    <div className="bg-white px-4 py-2 rounded border border-green-300 flex items-center justify-between gap-2">
                      <p className="font-mono text-base font-semibold text-green-900 flex-1 break-all">{email}</p>
                      <button
                        onClick={handleCopyEmail}
                        className="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 border border-green-200 rounded-md transition-colors duration-200 flex items-center gap-1.5"
                        title="Copy email to clipboard"
                      >
                        {copied ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">Verify TikTok Bio Setup</h3>
                <p className="text-sm text-blue-800 mb-4">
                  Please add your business email to your TikTok account Bio, then enter your TikTok link to verify.
                </p>
                
                {/* 示例图片区域 */}
                <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-3">Example: Where to add your email</p>
                  <div className="relative max-w-md mx-auto">
                    <div className="relative rounded-md shadow-sm overflow-hidden bg-white">
                      {!imageError ? (
                        <img 
                          src="/images/tiktok-bio-example.png" 
                          alt="TikTok profile example showing where to add email"
                          className="w-full h-auto"
                          onError={() => setImageError(true)}
                        />
                      ) : (
                        <div className="p-8 text-center bg-gray-100 min-h-[200px] flex flex-col items-center justify-center">
                          <svg className="w-16 h-16 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-sm text-gray-500">Example image will appear here</p>
                          <p className="text-xs text-gray-400 mt-1">Place image at: public/images/tiktok-bio-example.png</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <p className="text-xs text-gray-600">
                      💡 Add: <span className="font-mono font-semibold text-gray-800">{email}</span> to your TikTok Bio
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="tiktok-url" className="block text-sm font-medium text-blue-900 mb-2">
                      TikTok Account Link
                    </label>
                    <input
                      id="tiktok-url"
                      type="text"
                      value={tiktokUrl}
                      onChange={(e) => setTiktokUrl(e.target.value)}
                      placeholder="https://www.tiktok.com/@username or @username"
                      className="w-full px-4 py-3 text-base border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90"
                    />
                    <p className="mt-2 text-xs text-blue-700">
                      Supported formats: https://www.tiktok.com/@username or just @username
                    </p>
                  </div>

                  <button
                    onClick={handleVerifyTikTok}
                    disabled={!tiktokUrl || verifying}
                    className="w-full px-6 py-3 text-base font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
                  >
                    {verifying ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Verifying...
                      </span>
                    ) : (
                      'Verify TikTok Bio'
                    )}
                  </button>
                </div>
              </div>

              {/* 验证结果 */}
              {verificationResult && (
                <div className={`p-4 rounded-lg border ${
                  verificationResult.verified 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start gap-3">
                    {verificationResult.verified ? (
                      <>
                        <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                          <h3 className="font-semibold text-green-900 mb-1">Verification Successful!</h3>
                          <p className="text-sm text-green-800">{verificationResult.message}</p>
                          {verificationResult.bio && (
                            <div className="mt-2 p-2 bg-white rounded border border-green-300">
                              <p className="text-xs text-green-700 font-medium mb-1">Detected Bio Content:</p>
                              <p className="text-xs text-green-600">{verificationResult.bio}</p>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <div className="flex-1">
                          <h3 className="font-semibold text-red-900 mb-1">Verification Failed</h3>
                          <p className="text-sm text-red-800">{verificationResult.message || verificationResult.error}</p>
                          <div className="mt-3 p-3 bg-white rounded border border-red-300">
                            <p className="text-xs text-red-700 font-medium mb-2">Please confirm:</p>
                            <ul className="text-xs text-red-600 space-y-1 list-disc list-inside">
                              <li>Email <span className="font-mono font-semibold">{email}</span> has been added to TikTok Bio</li>
                              <li>TikTok account is public (not private)</li>
                              <li>Link format is correct</li>
                              <li>Wait a few minutes before retrying (TikTok may need time to update)</li>
                            </ul>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 步骤 3: 完成设置 */}
          {step === 3 && email && verificationResult?.verified && (
            <div className="space-y-6">
              <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-green-900 mb-2">Setup Complete!</h2>
                    <p className="text-sm text-green-800 mb-3">
                      Your business email has been successfully created and verified:
                    </p>
                    <div className="bg-white px-4 py-2 rounded border border-green-300 mb-3">
                      <p className="font-mono text-base font-semibold text-green-900">{email}</p>
                    </div>
                    {tiktokUrl && (
                      <div className="bg-white px-4 py-2 rounded border border-green-300">
                        <p className="text-sm text-green-800">
                          <span className="font-medium">TikTok Account:</span>
                          <a 
                            href={tiktokUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline ml-1"
                          >
                            {tiktokUrl}
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  You can now start receiving brand collaboration invitation emails! All collaboration emails sent to your business email will be automatically processed.
                </p>
              </div>

              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="w-full px-6 py-3 text-base font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
              >
                {confirming ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : (
                  'Go to Dashboard'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

