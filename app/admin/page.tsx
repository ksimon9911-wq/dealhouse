'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function AdminPage() {
  const [secret, setSecret] = useState('')
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_secret')
    if (saved) setSecret(saved)
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    // 간단한 검증: 실제 API 호출로 확인
    const res = await fetch('/api/admin/listings', {
      headers: { Authorization: `Bearer ${input}` },
    })
    if (res.ok) {
      sessionStorage.setItem('admin_secret', input)
      setSecret(input)
      setError('')
    } else {
      setError('비밀번호가 올바르지 않습니다.')
    }
  }

  if (!secret) {
    return (
      <div className="max-w-sm mx-auto px-4 py-20">
        <h1 className="text-2xl font-black text-[#191F28] mb-6">관리자 로그인</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="관리자 비밀번호"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="w-full bg-[#3182F6] text-white font-bold py-3 rounded-xl text-sm hover:bg-blue-600 transition-colors"
          >
            로그인
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-black text-[#191F28] mb-8">관리자 대시보드</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AdminCard
          href="/admin/listings"
          title="매물 관리"
          desc="매물 숨김/공개 처리"
          icon="🏠"
        />
        <AdminCard
          href="/admin/agents"
          title="중개사 관리"
          desc="인증/정지 처리"
          icon="👤"
        />
        <AdminCard
          href="/admin/bids"
          title="입찰 관리"
          desc="입찰 노출/숨김 처리"
          icon="📋"
        />
      </div>
      <button
        onClick={() => { sessionStorage.removeItem('admin_secret'); setSecret('') }}
        className="mt-8 text-sm text-slate-400 hover:text-slate-600"
      >
        로그아웃
      </button>
    </div>
  )
}

function AdminCard({ href, title, desc, icon }: { href: string; title: string; desc: string; icon: string }) {
  return (
    <Link
      href={href}
      className="bg-white rounded-2xl border border-slate-100 p-6 hover:border-blue-200 hover:shadow-md transition-all"
    >
      <p className="text-3xl mb-3">{icon}</p>
      <p className="font-bold text-slate-900 mb-1">{title}</p>
      <p className="text-xs text-slate-400">{desc}</p>
    </Link>
  )
}
