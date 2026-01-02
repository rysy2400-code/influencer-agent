'use client';

import Link from 'next/link';

export default function PrivacyPolicy() {
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
            Privacy Policy
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
              <p>
                Welcome to Binfluencer AI. We respect your privacy and are committed to protecting your personal data. 
                This privacy policy explains how we collect, use, and protect your information when you use our service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
              <p>We collect the following types of information:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Account Information:</strong> Email address, name, and profile information you provide during registration</li>
                <li><strong>Business Email:</strong> Business email addresses created through our service</li>
                <li><strong>Usage Data:</strong> Information about how you interact with our service</li>
                <li><strong>TikTok Profile Information:</strong> Public profile information you provide for verification purposes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Provide and maintain our AI talent manager service</li>
                <li>Create and manage your business email account</li>
                <li>Verify your TikTok profile for collaboration purposes</li>
                <li>Communicate with you about your account and our services</li>
                <li>Improve and optimize our service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Data Protection</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal data against 
                unauthorized access, alteration, disclosure, or destruction. Your data is stored securely and accessed 
                only by authorized personnel.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to processing of your data</li>
                <li>Request data portability</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Contact Us</h2>
              <p>
                If you have questions about this privacy policy or wish to exercise your rights, 
                please contact us at:{' '}
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

