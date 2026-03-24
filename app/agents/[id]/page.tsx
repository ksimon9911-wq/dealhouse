'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { supabase, type Agent, type Bid, type Review } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'

interface BidWithListing extends Bid {
  listings?: {
    sell_address: string | null
    buy_address: string | null
    sell_price: number | null
    buy_price: number | null
    status: string
  }
}

export default function AgentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [bids, setBids] = useState<BidWithListing[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const [{ data: agentData }, { data: bidsData }, { data: reviewsData }] = await Promise.all([
        supabase.from('agents').select('*').eq('id', id).single(),
        supabase
          .from('bids')
          .select('*, listings(sell_address, buy_address, sell_price, buy_price, status)')
          .eq('agent_id', id)
          .eq('is_visible', true)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('reviews')
          .select('*')
          .eq('agent_id', id)
          .eq('is_public', true)
          .order('created_at', { ascending: false }),
      ])
      if (agentData) setAgent(agentData)
      if (bidsData) setBids(bidsData as BidWithListing[])
      if (reviewsData) setReviews(reviewsData)
      setLoading(false)
    }
    fetchData()
  }, [id])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 animate-pulse">
        <div className="h-32 bg-slate-200 rounded-2xl mb-6"></div>
        <div className="h-48 bg-slate-200 rounded-2xl"></div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-xl font-bold text-slate-700 mb-2">중개사를 찾을 수 없습니다</p>
        <Link href="/listings" className="text-blue-600 hover:underline text-sm">매물 목록으로</Link>
      </div>
    )
  }

  const wonBids = bids.filter((b) => b.is_selected)
  const totalBids = bids.length
  const winRate = totalBids > 0 ? Math.round((wonBids.length / totalBids) * 100) : 0
  const avgRate = totalBids > 0
    ? (bids.reduce((sum, b) => sum + b.commission_rate, 0) / totalBids).toFixed(2)
    : null
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
      {/* 브레드크럼 */}
      <div className="flex items-center gap-2 text-sm text-[#6B7684] mb-8">
        <Link href="/" className="hover:text-[#191F28]">홈</Link>
        <span>/</span>
        <span className="text-[#191F28] font-medium">{agent.agency_name}</span>
      </div>

      {/* 프로필 카드 */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-sm mb-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[#0C1B33] flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {agent.agency_name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-slate-900">{agent.agency_name}</h1>
              {agent.is_verified && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  인증 중개사
                </span>
              )}
              {agent.is_suspended && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                  정지됨
                </span>
              )}
            </div>
            <p className="text-slate-500 text-sm">{agent.name} 대표 · {agent.district}</p>
            {agent.bio && (
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">{agent.bio}</p>
            )}
          </div>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <StatCard label="총 입찰" value={`${totalBids}건`} />
          <StatCard label="낙찰" value={`${wonBids.length}건`} />
          <StatCard label="낙찰률" value={`${winRate}%`} highlight />
          {avgRate && <StatCard label="평균 중개보수율" value={`${avgRate}%`} />}
        </div>

        {/* 평점 */}
        {avgRating && (
          <div className="mt-4 flex items-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((s) => (
                <svg key={s} className={`w-4 h-4 ${parseFloat(avgRating) >= s ? 'text-yellow-400' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-sm font-bold text-slate-700">{avgRating}</span>
            <span className="text-xs text-slate-400">({reviews.length}개 후기)</span>
          </div>
        )}
      </div>

      {/* 후기 */}
      {reviews.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-sm mb-6">
          <h2 className="text-base font-bold text-slate-900 mb-5">거래 후기</h2>
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <svg key={s} className={`w-3.5 h-3.5 ${review.rating >= s ? 'text-yellow-400' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  {review.savings_amount && review.savings_amount > 0 && (
                    <span className="text-xs text-green-700 font-semibold bg-green-50 px-2 py-0.5 rounded-full">
                      {formatPrice(review.savings_amount)} 절약
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{review.created_at.substring(0, 10)}</span>
                </div>
                {review.body && (
                  <p className="text-sm text-slate-600 leading-relaxed">{review.body}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 입찰 이력 */}
      {bids.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-5">입찰 이력</h2>
          <div className="space-y-3">
            {bids.map((bid) => {
              const listing = bid.listings
              const addr = listing?.sell_address ?? listing?.buy_address ?? '-'
              const price = listing?.sell_price ?? listing?.buy_price ?? 0
              return (
                <div key={bid.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-700 truncate max-w-[220px]">{addr}</p>
                    {price > 0 && <p className="text-xs text-slate-400">{formatPrice(price)}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{bid.commission_rate}%</p>
                    {bid.is_selected && (
                      <span className="text-xs text-blue-600 font-semibold">낙찰</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-center">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-blue-600' : 'text-slate-900'}`}>{value}</p>
    </div>
  )
}
