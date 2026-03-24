'use client'

import { useEffect, useState, Suspense } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, type Listing } from '@/lib/supabase'
import { formatPrice, getLegalMaxCommission } from '@/lib/utils'

function ReviewForm({ id }: { id: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ownerToken = searchParams.get('owner_token')

  const [listing, setListing] = useState<Partial<Listing> | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [savingsAmount, setSavingsAmount] = useState('')
  const [body, setBody] = useState('')

  useEffect(() => {
    if (!ownerToken) return
    supabase
      .from('listings')
      .select('id, sell_price, buy_price, selected_bid_id, status, sell_address, buy_address')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) setListing(data)
        setLoading(false)
      })
  }, [id, ownerToken])

  // 예상 절약액 자동 계산
  useEffect(() => {
    if (!listing) return
    const price = listing.sell_price ?? listing.buy_price ?? 0
    if (price > 0) {
      const legalMax = getLegalMaxCommission(price)
      setSavingsAmount(String(Math.round(legalMax * 0.3))) // 법정 최고의 30% 절약 기본값
    }
  }, [listing])

  if (!ownerToken) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-xl font-bold text-slate-700 mb-2">접근 권한이 없습니다</p>
        <Link href="/listings" className="text-blue-600 hover:underline text-sm">매물 목록으로</Link>
      </div>
    )
  }

  if (loading) {
    return <div className="max-w-xl mx-auto px-4 py-12 animate-pulse"><div className="h-64 bg-slate-200 rounded-2xl"></div></div>
  }

  if (!listing || !listing.selected_bid_id) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-xl font-bold text-slate-700 mb-2">후기를 작성할 수 없습니다</p>
        <p className="text-slate-500 text-sm mb-4">중개사 선정 후 거래 완료 시 후기를 남길 수 있습니다.</p>
        <Link href={`/listings/${id}?owner_token=${ownerToken}`} className="text-blue-600 hover:underline text-sm">
          매물 상세로 돌아가기
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">후기가 등록되었습니다!</h2>
        <p className="text-slate-500 mb-6">소중한 후기 감사합니다.</p>
        <Link href="/listings" className="inline-block bg-[#3182F6] text-white font-bold px-6 py-3 rounded-2xl text-sm">
          매물 목록으로
        </Link>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/submit-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: id,
          owner_token: ownerToken,
          rating,
          savings_amount: savingsAmount ? parseInt(savingsAmount) : null,
          body: body || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setDone(true)
      } else {
        setError(data.error ?? '오류가 발생했습니다.')
      }
    } catch {
      setError('오류가 발생했습니다.')
    }
    setSubmitting(false)
  }

  const price = listing.sell_price ?? listing.buy_price ?? 0
  const legalMax = price > 0 ? getLegalMaxCommission(price) : 0

  return (
    <div className="max-w-xl mx-auto px-4 py-10 sm:py-14">
      <div className="mb-8">
        <Link href={`/listings/${id}?owner_token=${ownerToken}`} className="text-sm text-[#6B7684] hover:text-slate-900">
          ← 매물 상세로
        </Link>
        <h1 className="text-2xl font-black text-[#191F28] mt-4">거래 완료 후기</h1>
        <p className="text-[#6B7684] text-sm mt-1">다른 집주인에게 도움이 됩니다.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <p className="text-sm font-bold text-slate-700 mb-4">별점</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onMouseEnter={() => setHoverRating(s)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(s)}
                className="transition-transform hover:scale-110"
              >
                <svg className={`w-10 h-10 ${(hoverRating || rating) >= s ? 'text-yellow-400' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <label className="block text-sm font-bold text-slate-700 mb-1.5">
            절약 금액 (원)
          </label>
          {legalMax > 0 && (
            <p className="text-xs text-slate-400 mb-2">
              법정 최고 중개보수: {formatPrice(legalMax)} — 실제 절약액을 입력해주세요
            </p>
          )}
          <input
            type="number"
            value={savingsAmount}
            onChange={(e) => setSavingsAmount(e.target.value)}
            placeholder="절약한 금액 (원)"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
          />
          {savingsAmount && parseInt(savingsAmount) > 0 && (
            <p className="text-xs text-green-600 mt-1 font-semibold">
              약 {formatPrice(parseInt(savingsAmount))} 절약
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <label className="block text-sm font-bold text-slate-700 mb-1.5">후기 내용</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="중개사 서비스에 대한 솔직한 후기를 남겨주세요."
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent resize-none"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#3182F6] hover:bg-blue-600 text-white font-bold py-4 rounded-2xl transition-colors disabled:opacity-50 text-sm"
        >
          {submitting ? '등록 중...' : '후기 등록하기'}
        </button>
      </form>
    </div>
  )
}

export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <Suspense fallback={<div className="max-w-xl mx-auto px-4 py-12 animate-pulse"><div className="h-64 bg-slate-200 rounded-2xl"></div></div>}>
      <ReviewForm id={id} />
    </Suspense>
  )
}
