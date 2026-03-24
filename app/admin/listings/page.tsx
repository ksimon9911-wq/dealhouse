'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ListingRow {
  id: string
  sell_address: string | null
  buy_address: string | null
  status: string
  listing_type: string
  property_type: string
  is_hidden: boolean
  created_at: string
  user_name: string
  user_phone: string
  bid_deadline: string
}

export default function AdminListingsPage() {
  const [listings, setListings] = useState<ListingRow[]>([])
  const [loading, setLoading] = useState(true)

  const secret = typeof window !== 'undefined' ? sessionStorage.getItem('admin_secret') ?? '' : ''

  useEffect(() => {
    fetch('/api/admin/listings', { headers: { Authorization: `Bearer ${secret}` } })
      .then((r) => r.json())
      .then((d) => { setListings(d.listings ?? []); setLoading(false) })
  }, [secret])

  async function toggleHidden(id: string, current: boolean) {
    await fetch('/api/admin/listings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_hidden: !current }),
    })
    setListings((prev) => prev.map((l) => l.id === id ? { ...l, is_hidden: !current } : l))
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin" className="text-slate-400 hover:text-slate-600 text-sm">← 대시보드</Link>
        <h1 className="text-xl font-black text-[#191F28]">매물 관리</h1>
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
                <th className="text-left px-4 py-3 font-semibold text-slate-600">주소</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">상태</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">등록자</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">마감일</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">숨김</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing) => (
                <tr key={listing.id} className={`border-b border-slate-50 hover:bg-slate-50 ${listing.is_hidden ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <Link href={`/listings/${listing.id}`} className="text-blue-600 hover:underline truncate block max-w-[200px]">
                      {listing.sell_address ?? listing.buy_address ?? '-'}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      listing.status === 'active' ? 'bg-green-100 text-green-700' :
                      listing.status === 'closed' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {listing.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{listing.user_name}</td>
                  <td className="px-4 py-3 text-slate-500">{listing.bid_deadline?.substring(0, 10)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleHidden(listing.id, listing.is_hidden)}
                      className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${
                        listing.is_hidden
                          ? 'bg-slate-100 text-slate-600 hover:bg-green-100 hover:text-green-700'
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                    >
                      {listing.is_hidden ? '공개하기' : '숨기기'}
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
