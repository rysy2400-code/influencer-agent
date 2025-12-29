import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// 创建服务端 Supabase 客户端
export function createServerClient() {
  const cookieStore = cookies()
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      getSession: async () => {
        // 从 cookies 中获取 session
        const accessToken = cookieStore.get('sb-access-token')?.value
        const refreshToken = cookieStore.get('sb-refresh-token')?.value
        
        if (!accessToken) {
          return { data: { session: null }, error: null }
        }
        
        // 使用 Supabase 客户端验证 session
        const client = createClient(supabaseUrl, supabaseAnonKey)
        const { data, error } = await client.auth.getSession()
        return { data, error }
      },
    },
  })
}

