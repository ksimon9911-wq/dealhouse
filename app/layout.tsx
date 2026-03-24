import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import Nav from './components/Nav'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'DealHouse - 부동산 중개비 경쟁입찰 플랫폼',
  description: '중개비를 비교하고, 가장 합리적인 조건으로 거래하세요.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} antialiased bg-[#F5F6F8] min-h-screen`}>
        <Nav />
        <main>{children}</main>
        <footer className="bg-white border-t border-slate-100 mt-20 py-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
            <p className="font-bold text-[#191F28] text-base mb-1">DealHouse</p>
            <p className="text-[#6B7684]">부동산 중개비 경쟁입찰 플랫폼 · 더 합리적인 거래를 위해</p>
            <p className="mt-3 text-xs text-slate-400">© 2025 DealHouse. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
