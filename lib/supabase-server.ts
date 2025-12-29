import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// 创建服务端 Supabase 客户端
export async function createServerClient() {
  // 在运行时检查环境变量（而不是在模块加载时）
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const cookieStore = await cookies()
  
  // 从 cookies 中获取 token
  const accessToken = cookieStore.get('sb-access-token')?.value
  const refreshToken = cookieStore.get('sb-refresh-token')?.value
  
  // 创建客户端
  const client = createClient(supabaseUrl, supabaseAnonKey)
  
  // 如果有 token，设置 session
  if (accessToken && refreshToken) {
    await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
  }
  
  return client
}

