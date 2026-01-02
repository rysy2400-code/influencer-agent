'use client';

import Link from 'next/link';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-50">
      {/* Navigation */}
      <nav className="w-full border-b border-blue-100/50 bg-white/70 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                Binfluencer AI
              </span>
            </Link>
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

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-blue-100/50 p-8 md:p-12 shadow-sm">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Terms of Service
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing and using Binfluencer AI, you accept and agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use our service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description of Service</h2>
              <p>
                Binfluencer AI is an AI-powered talent manager service that helps influencers manage brand collaborations, 
                negotiate deals, and grow their partnerships. Our service includes:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Business email creation and management</li>
                <li>AI-powered brand collaboration management</li>
                <li>Automated outreach and response to brand inquiries</li>
                <li>TikTok profile verification services</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. User Responsibilities</h2>
              <p>As a user, you agree to:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Provide accurate and complete information during registration</li>
                <li>Maintain the security of your account credentials</li>
                <li>Use the service in compliance with applicable laws and regulations</li>
                <li>Not use the service for any illegal or unauthorized purpose</li>
                <li>Not interfere with or disrupt the service or servers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Service Availability</h2>
              <p>
                We strive to provide continuous service availability but do not guarantee uninterrupted access. 
                The service may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Limitation of Liability</h2>
              <p>
                Binfluencer AI is provided "as is" without warranties of any kind. We are not liable for any indirect, 
                incidental, or consequential damages arising from your use of the service. Our liability is limited to 
                the maximum extent permitted by law.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. We will notify users of significant changes 
                via email or through our service. Continued use of the service after changes constitutes acceptance 
                of the modified terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Contact Information</h2>
              <p>
                If you have questions about these Terms of Service, please contact us at:{' '}
                <a href="mailto:bin@binfluencer.xyz" className="text-blue-600 hover:underline">
                  bin@binfluencer.xyz
                </a>
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <Link 
              href="/" 
              className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-blue-100/50 bg-white/70 backdrop-blur-md mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-sm text-gray-600">
            <Link 
              href="/privacy" 
              className="text-gray-600 hover:text-blue-600 hover:underline transition-colors"
            >
              Privacy Policy
            </Link>
            <span className="hidden sm:inline">|</span>
            <Link 
              href="/terms" 
              className="text-gray-600 hover:text-blue-600 hover:underline transition-colors"
            >
              Terms of Service
            </Link>
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

