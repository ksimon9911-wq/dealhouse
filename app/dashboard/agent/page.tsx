'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { formatPrice } from '@/lib/utils'

interface AgentStats {
  agent: {
    id: string
    name: string
    agency_name: string
    district: string
    is_verified: boolean
    wins_count: number
  }
  stats: {
    total_bids: number
    won_bids: number
    win_rate: number
    avg_commission_rate: number
    total_earned: number
  }
  bids: Array<{
    id: string
    commission_rate: number
    commission_amount: number
    is_selected: boolean
    service_description: string
    listings?: {
      sell_address: string | null
      buy_address: string | null
      sell_price: number | null
      buy_price: number | null
      status: string
      bid_deadline: string
    }
  }>
}

function AgentDashboardContent() {
  const searchParams = useSearchParams()
  const agentToken = searchParams.get('agent_token')

  const [data, setData] = useState<AgentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!agentToken) { setLoading(false); return }
    fetch(`/api/agent-stats?agent_token=${agentToken}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setData(d)
        setLoading(false)
      })
      .catch(() => { setError('오류가 발생했습니다.'); setLoading(false) })
  }, [agentToken])

  if (!agentToken) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-xl font-bold text-slate-700 mb-2">대시보드 접근 불가</p>
        <p className="text-slate-500 text-sm">agent_token이 필요합니다. 입찰 완료 후 받은 링크를 사용해주세요.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 animate-pulse">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-2xl"></div>)}
        </div>
        <div className="h-64 bg-slate-200 rounded-2xl"></div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-xl font-bold text-slate-700 mb-2">접근 불가</p>
        <p className="text-slate-500 text-sm">{error ?? '유효하지 않은 토큰입니다.'}</p>
      </div>
    )
  }

  const { agent, stats, bids } = data

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-black text-[#191F28]">{agent.agency_name}</h1>
          {agent.is_verified && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">인증</span>
          )}
        </div>
        <p className="text-[#6B7684] text-sm">{agent.name} 대표 · {agent.district}</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatsCard label="총 입찰" value={`${stats.total_bids}건`} />
        <StatsCard label="낙찰" value={`${stats.won_bids}건`} />
        <StatsCard label="낙찰률" value={`${stats.win_rate}%`} highlight />
        <StatsCard label="평균 보수율" value={`${stats.avg_commission_rate}%`} />
      </div>

      {stats.total_earned > 0 && (
        <div className="bg-[#0C1B33] text-white rounded-2xl p-6 mb-6">
          <p className="text-slate-400 text-xs mb-1">누적 수익 (낙찰 기준)</p>
          <p className="text-2xl font-bold">{formatPrice(stats.total_earned)}</p>
        </div>
      )}

      {/* 입찰 목록 */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-5">입찰 현황</h2>
        {bids.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <p className="text-3xl mb-3">📋</p>
            <p className="text-sm">아직 입찰이 없습니다.</p>
            <Link href="/listings" className="mt-3 inline-block text-blue-600 hover:underline text-sm">
              매물 목록 보기 →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {bids.map((bid) => {
              const listing = bid.listings
              const addr = listing?.sell_address ?? listing?.buy_address ?? '-'
              const price = listing?.sell_price ?? listing?.buy_price ?? 0
              return (
                <div key={bid.id} className={`rounded-xl border p-4 ${bid.is_selected ? 'border-blue-200 bg-blue-50' : 'border-slate-100'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">{addr}</p>
                      {price > 0 && <p className="text-xs text-slate-400">{formatPrice(price)}</p>}
                      {listing?.bid_deadline && (
                        <p className="text-xs text-slate-400">마감: {listing.bid_deadline.substring(0, 10)}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold text-slate-900">{bid.commission_rate}%</p>
                      {bid.commission_amount > 0 && (
                        <p className="text-xs text-slate-500">{formatPrice(bid.commission_amount)}</p>
                      )}
                      {bid.is_selected && (
                        <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">낙찰</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AgentDashboardPage() {
  return (
    <Suspense fallback={
      <div className="max-w-3xl mx-auto px-4 py-12 animate-pulse">
        <div className="h-32 bg-slate-200 rounded-2xl mb-6"></div>
        <div className="h-64 bg-slate-200 rounded-2xl"></div>
      </div>
    }>
      <AgentDashboardContent />
    </Suspense>
  )
}

function StatsCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center shadow-sm">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${highlight ? 'text-blue-600' : 'text-slate-900'}`}>{value}</p>
    </div>
  )
}
