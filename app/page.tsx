'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

export default function HomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 检查用户登录状态
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 监听认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleStartFree = () => {
    if (session) {
      router.push('/dashboard');
    } else {
      router.push('/signup');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-50">
      {/* Top Navigation */}
      <nav className="w-full border-b border-blue-100/50 bg-white/70 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                Binfluencer AI
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="hidden sm:inline">Contact:</span>
              <a 
                href="mailto:bin@binfluencer.xyz" 
                className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
              >
                bin@binfluencer.xyz
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mx-auto max-w-4xl w-full text-center">
          {/* Product Name */}
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl lg:text-7xl">
            Binfluencer AI
          </h1>

          {/* Product Positioning */}
          <p className="mb-8 text-xl font-medium text-blue-600 sm:text-2xl md:text-3xl">
            AI Talent Manager
          </p>

          {/* Product Features */}
          <div className="mb-12 space-y-6">
            <p className="text-base leading-relaxed text-gray-700 sm:text-lg md:text-xl max-w-3xl mx-auto">
              Set up your professional business email and display it on your TikTok profile. 
              Your AI talent manager agent handles everything for you.
            </p>
            
            <div className="mx-auto max-w-2xl space-y-4 pt-6">
              <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-blue-100/50 p-6 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="mb-3 text-base font-semibold text-gray-900 sm:text-lg">
                  Feature 1: Auto-Respond to Brand Collaborations
                </h3>
                <p className="text-sm leading-relaxed text-gray-600 sm:text-base">
                  Your AI agent automatically communicates with brands that send collaboration invitations. 
                  You only need to review and approve at key decision points.
                </p>
              </div>

              <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-blue-100/50 p-6 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="mb-3 text-base font-semibold text-gray-900 sm:text-lg">
                  Feature 2: Auto-Outreach to Brands
                </h3>
                <p className="text-sm leading-relaxed text-gray-600 sm:text-base">
                  Your AI agent proactively reaches out to brands you're interested in, 
                  helping you discover and secure new collaboration opportunities.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="flex justify-center pt-4">
            <button
              onClick={handleStartFree}
              disabled={loading}
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:from-blue-700 hover:to-blue-600 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 sm:px-12 sm:py-5 sm:text-lg"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </span>
              ) : (
                <span>Start Free</span>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
