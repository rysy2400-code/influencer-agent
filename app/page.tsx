'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

export default function HomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError1, setImageError1] = useState(false);
  const [imageError2, setImageError2] = useState(false);
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
            Meet Bin, Your AI Talent Manager
          </p>

          {/* Product Features */}
          <div className="mb-12 space-y-6">
            <div className="max-w-3xl mx-auto">
              {/* Quote-style description */}
              <div className="relative px-6 py-6 md:px-8 md:py-8 bg-blue-50/30 rounded-2xl border-l-4 border-blue-500">
                <p className="text-base leading-relaxed text-gray-700 sm:text-lg md:text-xl italic mb-4">
                  "Hi, I'm Bin, the founder of Binfluencer and your personal AI talent manager. 
                  With years of experience managing influencer careers, I built this AI agent 
                  to handle deal negotiation in your inbox and find more brand partnerships for you . 
                  You focus on creating. I handle everything else."
                </p>
                {/* Signature */}
                <div className="text-right mt-4 pt-4 border-t border-blue-200/50">
                  <p className="text-sm text-gray-600 font-medium">
                    — Founder of Binfluencer AI, Bin
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

            <div className="mx-auto max-w-5xl space-y-6 md:space-y-12 pt-6">
              {/* Feature 1: Auto-Respond */}
              <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-blue-100/50 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="flex flex-col md:flex-row">
                  {/* Content Section - Mobile: order-1, Desktop: order-2 */}
                  <div className="w-full md:w-1/2 flex flex-col justify-center p-4 md:p-6 md:p-8 md:pl-10 order-1 md:order-2">
                    {/* Icon + Title */}
                    <div className="flex items-center gap-3 md:gap-4 mb-4">
                      <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                        <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-xl md:text-2xl font-bold text-gray-900 sm:text-3xl leading-tight">
                        Let Bin Handle Your Inbox
                      </h3>
                    </div>
                    
                    {/* Value Points List */}
                    <div className="ml-0 md:ml-16 space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">Auto-reply to every brand inquiry</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">Smart filtering and negotiation</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">Save 10+ hours per week</span>
                      </div>
                    </div>
                    
                    {/* Description */}
                    <p className="text-base leading-normal md:leading-relaxed text-gray-700 mb-5 ml-0 md:ml-16 text-left">
                      Brands reach out to you daily, but managing all those emails takes hours. 
                      Bin automatically responds to every collaboration inquiry, negotiates terms, 
                      and only bothers you when it's time to say 'yes' or 'no'. 
                      Focus on creating content while Bin handles the business side.
                    </p>
                  </div>
                  {/* Image Section - Mobile: order-2, Desktop: order-1 */}
                  <div className="w-full md:w-1/2 flex-shrink-0 bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center p-4 md:p-6 md:p-8 order-2 md:order-1">
                    {!imageError1 ? (
                      <img 
                        src="/images/feature-auto-respond.png" 
                        alt="Never Miss a Brand Opportunity"
                        className="w-full h-auto max-w-md rounded-lg shadow-md"
                        onError={() => setImageError1(true)}
                      />
                    ) : (
                      <div className="w-full h-64 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex flex-col items-center justify-center p-6">
                        <svg className="w-16 h-16 text-blue-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-blue-600 font-medium text-center">Feature Image</p>
                        <p className="text-xs text-blue-500 text-center mt-1">Place image at: public/images/feature-auto-respond.png</p>
                      </div>
                    )}
                  </div>
                </div>
        </div>

              {/* Feature 2: Auto-Outreach */}
              <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-blue-100/50 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="flex flex-col md:flex-row-reverse">
                  {/* Content Section - Mobile: order-1, Desktop: order-2 (due to flex-row-reverse) */}
                  <div className="w-full md:w-1/2 flex flex-col justify-center p-4 md:p-6 md:p-8 md:pr-10 order-1 md:order-2">
                    {/* Icon + Title */}
                    <div className="flex items-center gap-3 md:gap-4 mb-4">
                      <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                        <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl md:text-2xl font-bold text-gray-900 sm:text-3xl leading-tight">
                        Bin Finds Brands for You
                      </h3>
                    </div>
                    
                    {/* Value Points List */}
                    <div className="ml-0 md:ml-16 space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">Proactive brand discovery</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">Personalized outreach pitches</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">Grow your brand partnerships on autopilot</span>
                      </div>
                    </div>
                    
                    {/* Description */}
                    <p className="text-base leading-normal md:leading-relaxed text-gray-700 mb-5 ml-0 md:ml-16 text-left">
                      Don't wait for brands to find you. Bin actively searches for brands 
                      that match your niche and audience, reaches out with personalized pitches, 
                      and opens doors to collaborations you never knew existed. 
                      Turn your passive income into active growth.
                    </p>
                  </div>
                  {/* Image Section - Mobile: order-2, Desktop: order-1 (due to flex-row-reverse) */}
                  <div className="w-full md:w-1/2 flex-shrink-0 bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center p-4 md:p-6 md:p-8 order-2 md:order-1">
                    {!imageError2 ? (
                      <img 
                        src="/images/feature-auto-outreach.png" 
                        alt="Discover Your Next Big Collaboration"
                        className="w-full h-auto max-w-md rounded-lg shadow-md"
                        onError={() => setImageError2(true)}
                      />
                    ) : (
                      <div className="w-full h-64 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex flex-col items-center justify-center p-6">
                        <svg className="w-16 h-16 text-blue-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <p className="text-sm text-blue-600 font-medium text-center">Feature Image</p>
                        <p className="text-xs text-blue-500 text-center mt-1">Place image at: public/images/feature-auto-outreach.png</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Second CTA Button */}
            <div className="flex justify-center pt-8 pb-4">
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
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-blue-100/50 bg-white/70 backdrop-blur-md mt-6 md:mt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-sm text-gray-600">
            <a 
              href="/privacy" 
              className="text-gray-600 hover:text-blue-600 hover:underline transition-colors"
            >
              Privacy Policy
            </a>
            <span className="hidden sm:inline">|</span>
            <a 
              href="/terms" 
              className="text-gray-600 hover:text-blue-600 hover:underline transition-colors"
            >
              Terms of Service
            </a>
            <span className="hidden sm:inline">|</span>
            <a 
              href="mailto:bin@binfluencer.xyz" 
              className="text-gray-600 hover:text-blue-600 hover:underline transition-colors"
            >
              Contact
            </a>
          </div>
          <div className="mt-4 text-center text-xs text-gray-500">
            © 2026 Binfluencer AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
