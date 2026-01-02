'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    // 在Supabase Auth中注册用户
    // 注意：profile 会通过数据库触发器自动创建，无需手动创建
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (authError) {
      setError(`Signup failed: ${authError.message}`);
      setLoading(false);
      return;
    }

    // 注册成功后，在 MySQL 中创建用户记录
    // 注意：即使没有 session（需要邮箱确认的情况），也要创建 MySQL 用户记录
    console.log('注册结果检查:', {
      hasUser: !!authData?.user,
      userId: authData?.user?.id,
      hasSession: !!authData?.session,
      hasToken: !!authData?.session?.access_token,
    });

    if (authData?.user?.id) {
      console.log('开始调用 MySQL API，用户 ID:', authData.user.id);
      try {
        // 如果有 session，使用 session token；否则使用临时 token 或直接传递用户信息
        const token = authData?.session?.access_token || null;
        
        const requestBody = {
          email: email,
          full_name: fullName,
          password: password, // 传递明文密码，API 会处理加密
          supabase_user_id: authData.user.id, // 直接传递 user ID，即使没有 session
        };
        
        console.log('MySQL API 请求参数:', {
          hasToken: !!token,
          email: email,
          full_name: fullName,
          hasPassword: !!password,
          supabase_user_id: authData.user.id,
        });
        
        const mysqlResponse = await fetch('/api/mysql/create-user', {
          method: 'POST',
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        console.log('MySQL API 响应状态:', mysqlResponse.status, mysqlResponse.statusText);

        if (!mysqlResponse.ok) {
          const errorText = await mysqlResponse.text();
          console.error('MySQL 用户创建失败:', {
            status: mysqlResponse.status,
            statusText: mysqlResponse.statusText,
            error: errorText,
          });
        } else {
          const responseData = await mysqlResponse.json();
          console.log('MySQL 用户创建成功:', responseData);
        }
      } catch (mysqlError) {
        console.error('调用 MySQL API 异常:', mysqlError);
      }
    } else {
      console.warn('无法创建 MySQL 用户：authData.user.id 不存在', authData);
    }

    // 注册成功
    // 数据库触发器会自动在 profiles 表中创建用户资料
    setMessage('Signup successful! Please check your email to confirm your account.');
    // 3秒后跳转到登录页
    setTimeout(() => router.push('/login'), 3000);
    setLoading(false);
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
    // OAuth 会重定向，不需要手动跳转
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-50 px-4 py-8">
      <div className="w-full max-w-md p-6 sm:p-8 space-y-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-blue-100/50">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-900">Create Binfluencer Account</h1>
        
        {/* Google 注册按钮 */}
        <button
          onClick={handleGoogleSignup}
          disabled={loading || googleLoading}
          className="w-full px-4 py-3 text-base font-medium text-gray-700 bg-white/90 border border-blue-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3 shadow-sm"
        >
          {googleLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing up...
            </span>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign up with Gmail
            </>
          )}
        </button>

        {/* 分隔线 */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or</span>
          </div>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-3 text-base border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90"
              placeholder="Enter your full name"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 text-base border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password (at least 6 characters)
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 text-base border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90"
              placeholder="At least 6 characters"
            />
          </div>
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}
          {message && (
            <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
              {message}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full px-4 py-3 text-base font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
          >
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-sm text-center text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
