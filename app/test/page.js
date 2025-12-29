'use client'

import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export default function TestPage() {
  const [connectionStatus, setConnectionStatus] = useState('检查中...')
  const [error, setError] = useState(null)
  const [projectInfo, setProjectInfo] = useState(null)

  useEffect(() => {
    async function testConnection() {
      try {
        // 检查环境变量配置
        if (!isSupabaseConfigured()) {
          setConnectionStatus('❌ 配置缺失')
          setError('请检查 .env.local 文件中的 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY 是否已正确配置')
          return
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        // 测试 Supabase 连接 - 使用 auth.getSession() 是最可靠的方法
        const { data, error: authError } = await supabase.auth.getSession()
        
        // 即使没有 session，如果没有错误，说明连接是正常的
        if (authError) {
          // 检查是否是网络错误或配置错误
          if (authError.message.includes('Invalid API key') || authError.message.includes('JWT')) {
            setConnectionStatus('❌ API Key 无效')
            setError('请检查 NEXT_PUBLIC_SUPABASE_ANON_KEY 是否正确')
          } else if (authError.message.includes('fetch')) {
            setConnectionStatus('❌ 网络连接失败')
            setError('无法连接到 Supabase 服务器，请检查 NEXT_PUBLIC_SUPABASE_URL')
          } else {
            setConnectionStatus('⚠️ 连接可能有问题')
            setError(authError.message)
          }
        } else {
          // 连接成功
          setConnectionStatus('✅ 连接成功！')
          setProjectInfo({
            url: supabaseUrl,
            hasKey: !!supabaseKey,
            hasSession: !!data?.session
          })
        }
      } catch (err) {
        setConnectionStatus('❌ 连接失败')
        setError(err.message || '未知错误')
      }
    }

    testConnection()
  }, [])

  return (
    <div className="min-h-screen p-8 bg-zinc-50 dark:bg-black">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-black dark:text-zinc-50">
          Supabase 连接测试
        </h1>
        
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-md">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2 text-black dark:text-zinc-50">
              连接状态
            </h2>
            <p className="text-lg text-black dark:text-zinc-50">
              {connectionStatus}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
              <p className="text-red-800 dark:text-red-200 font-semibold">错误信息：</p>
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {projectInfo && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
              <h3 className="font-semibold mb-2 text-green-800 dark:text-green-200">
                项目信息：
              </h3>
              <ul className="space-y-1 text-green-700 dark:text-green-300">
                <li>
                  <strong>Supabase URL:</strong> {projectInfo.url}
                </li>
                <li>
                  <strong>API Key:</strong> {projectInfo.hasKey ? '已配置' : '未配置'}
                </li>
                <li>
                  <strong>Session:</strong> {projectInfo.hasSession ? '已登录' : '未登录（正常）'}
                </li>
              </ul>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
            <h3 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">
              配置说明：
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-300 text-sm">
              <li>在项目根目录创建 <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">.env.local</code> 文件</li>
              <li>添加以下环境变量：</li>
            </ol>
            <pre className="mt-2 p-3 bg-blue-100 dark:bg-blue-800 rounded text-xs overflow-x-auto">
{`NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key`}
            </pre>
            <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">
              你可以在 Supabase 项目设置中找到这些值：
              <a 
                href="https://app.supabase.com/project/_/settings/api" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline ml-1"
              >
                https://app.supabase.com/project/_/settings/api
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
  }
  