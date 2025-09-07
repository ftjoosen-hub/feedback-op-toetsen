import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Scheikunde Toets Checker - HAVO/VWO',
  description: 'Upload je scheikundetoets en krijg persoonlijke feedback van je digitale scheikundedocent',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl">
      <body className="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen" suppressHydrationWarning={true}>
        <div className="min-h-screen">
          <header className="bg-white shadow-sm border-b border-blue-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">⚗️</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">Scheikunde Toets Checker</h1>
                    <p className="text-sm text-gray-600">HAVO/VWO Niveau</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Persoonlijke feedback</p>
                  <p className="text-xs text-gray-500">Stap voor stap begeleiding</p>
                </div>
              </div>
            </div>
          </header>
          <main className="py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}