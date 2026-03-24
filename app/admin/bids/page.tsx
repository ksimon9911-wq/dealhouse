'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'

interface BidRow {
  id: string
  commission_rate: number
  commission_amount: number
  is_selected: boolean
  is_visible: boolean
  service_description: string
  agents?: { name: string; agency_name: string }
  listings?: { sell_address: string | null; buy_address: string | null }
}

export default function AdminBidsPage() {
  const [bids, setBids] = useState<BidRow[]>([])
  const [loading, setLoading] = useState(true)

  const secret = typeof window !== 'undefined' ? sessionStorage.getItem('admin_secret') ?? '' : ''

  useEffect(() => {
    fetch('/api/admin/bids', { headers: { Authorization: `Bearer ${secret}` } })
      .then((r) => r.json())
      .then((d) => { setBids(d.bids ?? []); setLoading(false) })
  }, [secret])

  async function toggleVisible(id: string, current: boolean) {
    await fetch('/api/admin/bids', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_visible: !current }),
    })
    setBids((prev) => prev.map((b) => b.id === id ? { ...b, is_visible: !current } : b))
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin" className="text-slate-400 hover:text-slate-600 text-sm">← 대시보드</Link>
        <h1 className="text-xl font-black text-[#191F28]">입찰 관리</h1>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-200 rounded-xl"></div>)}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">매물</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">중개사</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">보수율</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">낙찰</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">노출</th>
              </tr>
            </thead>
            <tbody>
              {bids.map((bid) => (
                <tr key={bid.id} className={`border-b border-slate-50 hover:bg-slate-50 ${!bid.is_visible ? 'opacity-40' : ''}`}>
                  <td className="px-4 py-3 text-slate-700 truncate max-w-[160px]">
                    {bid.listings?.sell_address ?? bid.listings?.buy_address ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {bid.agents?.agency_name ?? '-'}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {bid.commission_rate}%
                    {bid.commission_amount > 0 && (
                      <span className="text-xs text-slate-400 ml-1">({formatPrice(bid.commission_amount)})</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {bid.is_selected && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">낙찰</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleVisible(bid.id, bid.is_visible)}
                      className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${
                        bid.is_visible
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-slate-100 text-slate-500 hover:bg-green-100 hover:text-green-700'
                      }`}
                    >
                      {bid.is_visible ? '숨기기' : '보이기'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
