'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatPrice, daysLeft, LISTING_TYPE_LABEL, PROPERTY_TYPE_LABEL } from '@/lib/utils'
import type { Listing } from '@/lib/supabase'

export default function MyPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState<'login' | 'loading' | 'dashboard'>('login')
  const [loginTab, setLoginTab] = useState<'login' | 'claim'>('login')
  const [listings, setListings] = useState<Listing[]>([])
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [resetEmail, setResetEmail] = useState('')
  const [resetStep, setResetStep] = useState<'idle' | 'form' | 'sent'>('idle')
  const [resetLoading, setResetLoading] = useState(false)

  // 기존 매물 연결 폼
  const [claimPhone, setClaimPhone] = useState('')
  const [claimEmail, setClaimEmail] = useState('')
  const [claimPassword, setClaimPassword] = useState('')
  const [claimPasswordConfirm, setClaimPasswordConfirm] = useState('')
  const [claimDone, setClaimDone] = useState(false)

  // 기존 세션 확인
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email)
        setAccessToken(session.access_token)
        fetchListings(session.access_token)
      }
    })
  }, [])

  async function fetchListings(token: string) {
    setStep('loading')
    const res = await fetch('/api/my-listings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    })
    const data = await res.json()
    if (data.error) {
      setError(data.error)
      setStep('login')
    } else {
      setListings(data.listings)
      setStep('dashboard')
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setStep('loading')

    try {
      let loginEmail = identifier.trim()

      // 전화번호인 경우 이메일 조회
      if (!loginEmail.includes('@')) {
        const res = await fetch('/api/auth/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: loginEmail }),
        })
        const data = await res.json()
        if (!res.ok || !data.email) {
          setError(data.error ?? '해당 전화번호로 등록된 계정이 없습니다.')
          setStep('login')
          return
        }
        loginEmail = data.email
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      })

      if (signInError) {
        const isUnconfirmed = signInError.message?.toLowerCase().includes('not confirmed')
        setError(
          isUnconfirmed
            ? '이메일 인증이 완료되지 않았습니다. 가입 시 발송된 인증 메일을 확인해주세요.'
            : '이메일(또는 전화번호) 또는 비밀번호가 올바르지 않습니다.'
        )
        setStep('login')
        return
      }

      setUserEmail(data.user.email ?? loginEmail)
      setAccessToken(data.session.access_token)
      await fetchListings(data.session.access_token)
    } catch {
      setError('오류가 발생했습니다.')
      setStep('login')
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setResetLoading(true)
    await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    })
    setResetLoading(false)
    setResetStep('sent')
  }

  async function handleDelete(listingId: string) {
    if (!confirm('이 매물을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.')) return
    setDeletingId(listingId)
    try {
      const res = await fetch('/api/delete-listing', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ listingId }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? '삭제 중 오류가 발생했습니다.')
      } else {
        setListings((prev) => prev.filter((l) => l.id !== listingId))
      }
    } catch {
      alert('오류가 발생했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setStep('login')
    setListings([])
    setUserEmail(null)
    setIdentifier('')
    setPassword('')
  }

  // 로딩
  if (step === 'loading') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-2xl"></div>)}
      </div>
    )
  }

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (claimPassword !== claimPasswordConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    setStep('loading')
    try {
      const res = await fetch('/api/auth/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: claimPhone, email: claimEmail, password: claimPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error)
        setStep('login')
        return
      }
      // 계정 생성 성공 → 자동 로그인
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: claimEmail.trim(),
        password: claimPassword,
      })
      if (signInError) {
        const isUnconfirmed = signInError.message?.toLowerCase().includes('not confirmed')
        setError(
          isUnconfirmed
            ? '계정이 생성되었습니다. 가입하신 이메일로 인증 메일이 발송되었습니다. 이메일 인증 후 로그인해주세요.'
            : '계정이 생성되었습니다. 로그인 탭에서 로그인해주세요.'
        )
        setLoginTab('login')
        setStep('login')
        return
      }
      setUserEmail(signInData.user.email ?? claimEmail)
      setAccessToken(signInData.session.access_token)
      setClaimDone(true)
      await fetchListings(signInData.session.access_token)
    } catch {
      setError('오류가 발생했습니다.')
      setStep('login')
    }
  }

  // 로그인 전
  if (step === 'login') {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="mb-8 text-center">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-[#191F28]">내 매물 관리</h1>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-5">
          {(['login', 'claim'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setLoginTab(t); setError(null) }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                loginTab === t ? 'bg-white text-[#191F28] shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'login' ? '로그인' : '기존 매물 연결'}
            </button>
          ))}
        </div>

        {/* 로그인 탭 */}
        {loginTab === 'login' && (
          <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#191F28] mb-1.5">
                이메일 또는 전화번호
              </label>
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="email@example.com 또는 010-0000-0000"
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#191F28] mb-1.5">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
            )}
            <button type="submit" className="w-full bg-[#3182F6] text-white font-bold py-3 rounded-xl text-sm hover:bg-blue-600 transition-colors">
              로그인
            </button>
            <div className="text-xs text-slate-400 text-center space-y-1">
              <p>
                아직 비밀번호가 없으신가요?{' '}
                <button type="button" onClick={() => { setLoginTab('claim'); setError(null) }} className="text-blue-600 hover:underline">
                  기존 매물 연결하기
                </button>
              </p>
              <p>
                비밀번호를 잊으셨나요?{' '}
                <button type="button" onClick={() => { setResetStep('form'); setError(null) }} className="text-blue-600 hover:underline">
                  비밀번호 찾기
                </button>
              </p>
            </div>
          </form>
        )}

        {/* 비밀번호 찾기 */}
        {resetStep === 'form' && (
          <form onSubmit={handleResetPassword} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4 mt-4">
            <p className="text-sm text-slate-500">가입하신 이메일로 비밀번호 재설정 링크를 보내드립니다.</p>
            <div>
              <label className="block text-sm font-semibold text-[#191F28] mb-1.5">이메일</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="email@example.com"
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
              />
            </div>
            <button type="submit" disabled={resetLoading} className="w-full bg-[#3182F6] text-white font-bold py-3 rounded-xl text-sm hover:bg-blue-600 transition-colors disabled:opacity-50">
              {resetLoading ? '발송 중...' : '재설정 메일 보내기'}
            </button>
            <button type="button" onClick={() => setResetStep('idle')} className="w-full text-xs text-slate-400 hover:text-slate-600">
              취소
            </button>
          </form>
        )}
        {resetStep === 'sent' && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-4 rounded-2xl text-center mt-4">
            재설정 메일을 발송했습니다.<br />이메일을 확인해주세요.
          </div>
        )}

        {/* 기존 매물 연결 탭 */}
        {loginTab === 'claim' && (
          <form onSubmit={handleClaim} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              이미 등록한 매물이 있다면, 당시 입력한 <strong>전화번호 + 이메일</strong>로 본인 확인 후 비밀번호를 설정하세요.
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#191F28] mb-1.5">등록 시 입력한 전화번호</label>
              <input
                value={claimPhone}
                onChange={(e) => setClaimPhone(e.target.value)}
                placeholder="010-0000-0000"
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#191F28] mb-1.5">등록 시 입력한 이메일</label>
              <input
                type="email"
                value={claimEmail}
                onChange={(e) => setClaimEmail(e.target.value)}
                placeholder="email@example.com"
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#191F28] mb-1.5">새 비밀번호 <span className="font-normal text-slate-400">(6자 이상)</span></label>
              <input
                type="password"
                value={claimPassword}
                onChange={(e) => setClaimPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#191F28] mb-1.5">비밀번호 확인</label>
              <input
                type="password"
                value={claimPasswordConfirm}
                onChange={(e) => setClaimPasswordConfirm(e.target.value)}
                placeholder="••••••••"
                required
                className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent ${
                  claimPasswordConfirm && claimPassword !== claimPasswordConfirm
                    ? 'border-red-300' : 'border-slate-200'
                }`}
              />
              {claimPasswordConfirm && claimPassword !== claimPasswordConfirm && (
                <p className="text-xs text-red-500 mt-1">비밀번호가 일치하지 않습니다.</p>
              )}
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
            )}
            <button type="submit" className="w-full bg-[#191F28] text-white font-bold py-3 rounded-xl text-sm hover:bg-slate-800 transition-colors">
              본인 확인 후 비밀번호 설정
            </button>
          </form>
        )}
      </div>
    )
  }

  // 대시보드
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-[#191F28]">내 매물</h1>
          {userEmail && <p className="text-sm text-slate-400 mt-0.5">{userEmail}</p>}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/register" className="text-sm text-blue-600 font-semibold hover:underline">
            + 새 매물 등록
          </Link>
          <button onClick={handleLogout} className="text-sm text-slate-400 hover:text-slate-600">
            로그아웃
          </button>
        </div>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
          <p className="text-3xl mb-3">📭</p>
          <p className="text-sm text-slate-400 mb-4">등록된 매물이 없습니다.</p>
          <Link href="/register" className="inline-block bg-[#3182F6] text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-blue-600 transition-colors">
            매물 등록하기
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => {
            const days = listing.bid_deadline ? daysLeft(listing.bid_deadline) : null
            const addr = listing.sell_address ?? listing.buy_address ?? '-'
            const price = listing.sell_price ?? listing.buy_price ?? 0

            return (
              <div key={listing.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 hover:shadow-md transition-all">
                <Link
                  href={`/my/${listing.id}?owner_token=${listing.owner_token}`}
                  className="block p-5"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        listing.status === 'active' ? 'bg-green-50 text-green-700' :
                        listing.status === 'closed' ? 'bg-blue-50 text-blue-700' :
                        listing.status === 'completed' ? 'bg-slate-100 text-slate-500' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {listing.status === 'active' ? '입찰 진행중' :
                         listing.status === 'closed' ? '중개사 선정됨' :
                         listing.status === 'completed' ? '거래 완료' : '마감'}
                      </span>
                      <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-semibold">
                        {PROPERTY_TYPE_LABEL[listing.property_type]}
                      </span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-semibold">
                        {LISTING_TYPE_LABEL[listing.listing_type]}
                      </span>
                    </div>
                    <svg className="w-4 h-4 text-slate-400 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="font-bold text-slate-900 mb-1 truncate">{addr}</p>
                  {price > 0 && <p className="text-sm text-blue-700 font-semibold mb-2">{formatPrice(price)}</p>}
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    {days !== null && listing.status === 'active' && (
                      <span className={days <= 3 ? 'text-red-500 font-semibold' : ''}>
                        마감 D-{days > 0 ? days : 0}
                      </span>
                    )}
                    <span>등록일 {listing.created_at?.substring(0, 10)}</span>
                  </div>
                </Link>
                <div className="border-t border-slate-100 px-5 py-2.5 flex justify-end">
                  <button
                    onClick={() => handleDelete(listing.id)}
                    disabled={deletingId === listing.id}
                    className="text-xs text-red-400 hover:text-red-600 font-semibold disabled:opacity-50"
                  >
                    {deletingId === listing.id ? '삭제 중...' : '매물 삭제'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
