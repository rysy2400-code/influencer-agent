'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 监听认证状态变化（Supabase OAuth 回调会触发这个事件）
        // 注意：profile 会通过数据库触发器自动创建，无需手动创建
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            // 数据库触发器会自动创建用户资料，等待一下确保触发器完成
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 在 MySQL 中创建用户记录（如果不存在）
            try {
              const mysqlResponse = await fetch('/api/mysql/create-user', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                },
              });
              if (!mysqlResponse.ok) {
                console.warn('MySQL 用户创建失败:', await mysqlResponse.text());
              }
            } catch (mysqlError) {
              console.warn('调用 MySQL API 失败:', mysqlError);
            }
            
            // 检查是否已完成邮箱设置
            const { data: profile } = await supabase
              .from('profiles')
              .select('email_setup_completed')
              .eq('id', session.user.id)
              .single();
            
            // 如果未完成邮箱设置，跳转到设置页面
            if (!profile?.email_setup_completed) {
              router.push('/setup-email');
            } else {
              router.push('/dashboard');
            }
            router.refresh();
            subscription.unsubscribe();
          } else if (event === 'SIGNED_OUT') {
            router.push('/login');
            subscription.unsubscribe();
          }
        });

        // 也尝试直接获取 session（作为备用）
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Failed to get session:', sessionError);
          router.push('/login?error=' + encodeURIComponent(sessionError.message));
          subscription.unsubscribe();
          return;
        }

        if (session?.user) {
          // 数据库触发器会自动创建用户资料，等待一下确保触发器完成
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // 检查是否已完成邮箱设置
          const { data: profile } = await supabase
            .from('profiles')
            .select('email_setup_completed')
            .eq('id', session.user.id)
            .single();
          
          // 如果未完成邮箱设置，跳转到设置页面
          if (!profile?.email_setup_completed) {
            router.push('/setup-email');
          } else {
            router.push('/dashboard');
          }
          router.refresh();
          subscription.unsubscribe();
        } else {
          // 如果没有 session，等待认证状态变化
          // 如果 5 秒后还没有，重定向到登录页
          setTimeout(() => {
            subscription.unsubscribe();
            router.push('/login');
          }, 5000);
        }

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Callback handling error:', error);
        router.push('/login?error=' + encodeURIComponent('Login failed, please try again'));
      }
    };

    // 延迟一下，确保 Supabase 已经处理了回调
    const timer = setTimeout(handleCallback, 1000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing login...</p>
      </div>
    </div>
  );
}

