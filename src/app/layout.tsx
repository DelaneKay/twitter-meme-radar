import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Twitter Meme Radar',
  description: 'Real-time crypto meme coin trend detection from Twitter/X',
  keywords: ['crypto', 'meme coins', 'twitter', 'trends', 'blockchain'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">🚀</span>
                  </div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Twitter Meme Radar
                  </h1>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-50 text-success-600">
                    <span className="w-2 h-2 bg-success-500 rounded-full mr-1.5 animate-pulse"></span>
                    Live
                  </span>
                </div>
              </div>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}