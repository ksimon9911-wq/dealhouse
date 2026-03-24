'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function Nav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const links = [
    { href: '/listings', label: '매물 목록' },
    { href: '/calculator', label: '비용 계산기' },
    { href: '/agent-bid', label: '중개사 입찰' },
    { href: '/my', label: '내 매물' },
  ]

  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0" onClick={() => setOpen(false)}>
            <div className="w-7 h-7 bg-[#3182F6] rounded-[8px] flex items-center justify-center">
              <span className="text-white font-black text-xs">D</span>
            </div>
            <span className="font-bold text-[#191F28] text-lg tracking-tight">DealHouse</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'text-[#3182F6] bg-blue-50'
                    : 'text-[#6B7684] hover:text-[#191F28] hover:bg-slate-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/register"
              className="ml-3 bg-[#3182F6] hover:bg-blue-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
            >
              매물 등록
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
            onClick={() => setOpen(!open)}
            aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
          >
            {open ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-slate-100 bg-white">
          <div className="max-w-6xl mx-auto px-4 py-3 space-y-1">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className={`flex items-center px-4 py-3.5 rounded-xl text-sm font-semibold transition-colors ${
                pathname === '/' ? 'bg-blue-50 text-[#3182F6]' : 'text-[#191F28] hover:bg-slate-50'
              }`}
            >
              홈
            </Link>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`flex items-center px-4 py-3.5 rounded-xl text-sm font-semibold transition-colors ${
                  pathname === link.href ? 'bg-blue-50 text-[#3182F6]' : 'text-[#191F28] hover:bg-slate-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-1">
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center bg-[#3182F6] text-white font-semibold px-4 py-3.5 rounded-xl text-sm transition-colors hover:bg-blue-600"
              >
                매물 등록하기
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
