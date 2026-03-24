'use client'

import { useEffect, useState, Suspense } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabase, type Listing, type Bid } from '@/lib/supabase'
import { formatPrice, daysLeft, LISTING_TYPE_LABEL, PROPERTY_TYPE_LABEL, inputClass, labelClass, sectionClass } from '@/lib/utils'

function MyListingContent({ id }: { id: string }) {
  const searchParams = useSearchParams()
  const ownerToken = searchParams.get('owner_token')

  const [listing, setListing] = useState<Listing | null>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'bids' | 'edit'>('bids')

  // 입찰 선정
  const [selectingBid, setSelectingBid] = useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<{ name?: string; agency_name?: string; phone?: string; email?: string } | null>(null)

  // 마감일 연장
  const [extendingDeadline, setExtendingDeadline] = useState(false)

  // 매물 수정 폼
  const [editForm, setEditForm] = useState({
    sell_price: '',
    buy_price: '',
    sell_area_sqm: '',
    buy_area_sqm: '',
    move_date: '',
    bid_deadline: '',
    description: '',
  })
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!ownerToken) { setLoading(false); return }
    Promise.all([
      supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .single(),
      supabase
        .from('bids')
        .select('*, agents(*)')
        .eq('listing_id', id)
        .eq('is_visible', true)
        .order('commission_rate', { ascending: true }),
    ]).then(([{ data: l }, { data: b }]) => {
      if (l) {
        setListing(l)
        setEditForm({
          sell_price: l.sell_price ? String(l.sell_price / 10000) : '',
          buy_price: l.buy_price ? String(l.buy_price / 10000) : '',
          sell_area_sqm: l.sell_area_sqm ? String(l.sell_area_sqm) : '',
          buy_area_sqm: l.buy_area_sqm ? String(l.buy_area_sqm) : '',
          move_date: l.move_date?.substring(0, 10) ?? '',
          bid_deadline: l.bid_deadline?.substring(0, 10) ?? '',
          description: l.description ?? '',
        })
      }
      if (b) setBids(b)
      setLoading(false)
    })
  }, [id, ownerToken])

  async function handleSelectBid(bidId: string) {
    if (!ownerToken || !listing) return
    setSelectingBid(bidId)
    const res = await fetch('/api/select-bid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: listing.id, bid_id: bidId, owner_token: ownerToken }),
    })
    const data = await res.json()
    if (data.success) {
      setSelectedAgent(data.agent)
      setBids((prev) => prev.map((b) => ({ ...b, is_selected: b.id === bidId })))
      setListing((prev) => prev ? { ...prev, status: 'closed', selected_bid_id: bidId } : prev)
    } else {
      alert(data.error ?? '오류가 발생했습니다.')
    }
    setSelectingBid(null)
  }

  async function handleExtendDeadline() {
    if (!ownerToken || !listing) return
    setExtendingDeadline(true)
    const res = await fetch('/api/extend-deadline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: listing.id, owner_token: ownerToken }),
    })
    const data = await res.json()
    if (data.success) {
      setListing((prev) => prev ? { ...prev, bid_deadline: data.new_deadline, deadline_extensions: data.extensions } : prev)
      setEditForm((prev) => ({ ...prev, bid_deadline: data.new_deadline }))
    } else {
      alert(data.error ?? '오류가 발생했습니다.')
    }
    setExtendingDeadline(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!ownerToken || !listing) return
    setSaving(true)
    setSaveMsg(null)
    const updates: Record<string, unknown> = {}
    if (editForm.sell_price) updates.sell_price = parseFloat(editForm.sell_price) * 10000
    if (editForm.buy_price) updates.buy_price = parseFloat(editForm.buy_price) * 10000
    if (editForm.sell_area_sqm) updates.sell_area_sqm = parseFloat(editForm.sell_area_sqm)
    if (editForm.buy_area_sqm) updates.buy_area_sqm = parseFloat(editForm.buy_area_sqm)
    if (editForm.move_date) updates.move_date = editForm.move_date
    if (editForm.bid_deadline) updates.bid_deadline = editForm.bid_deadline
    updates.description = editForm.description

    const res = await fetch('/api/update-listing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: listing.id, owner_token: ownerToken, updates }),
    })
    const data = await res.json()
    if (data.success) {
      setSaveMsg('저장되었습니다.')
      setListing((prev) => prev ? { ...prev, ...updates } : prev)
    } else {
      setSaveMsg(data.error ?? '오류가 발생했습니다.')
    }
    setSaving(false)
  }

  if (!ownerToken) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-xl font-bold text-slate-700 mb-4">접근 권한이 없습니다</p>
        <Link href="/my" className="text-blue-600 hover:underline text-sm">내 매물 목록으로</Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/2"></div>
        <div className="h-48 bg-slate-200 rounded-2xl"></div>
        <div className="h-48 bg-slate-200 rounded-2xl"></div>
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-xl font-bold text-slate-700 mb-4">매물을 찾을 수 없습니다</p>
        <Link href="/my" className="text-blue-600 hover:underline text-sm">내 매물 목록으로</Link>
      </div>
    )
  }

  const days = listing.bid_deadline ? daysLeft(listing.bid_deadline) : null
  const canExtend = listing.status === 'active' && (listing.deadline_extensions ?? 0) < 3

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/my" className="text-slate-400 hover:text-slate-700 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              listing.status === 'active' ? 'bg-green-50 text-green-700' :
              listing.status === 'closed' ? 'bg-blue-50 text-blue-700' :
              'bg-slate-100 text-slate-500'
            }`}>
              {listing.status === 'active' ? '입찰 진행중' :
               listing.status === 'closed' ? '중개사 선정됨' :
               listing.status === 'completed' ? '거래 완료' : '마감'}
            </span>
            <span className="text-xs text-slate-400">{PROPERTY_TYPE_LABEL[listing.property_type]} · {LISTING_TYPE_LABEL[listing.listing_type]}</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900 mt-1 truncate">
            {listing.sell_address ?? listing.buy_address ?? '매물'}
          </h1>
        </div>
      </div>

      {/* 선정 완료 알림 */}
      {selectedAgent && (
        <div className="mb-5 bg-green-50 border border-green-300 rounded-2xl p-5">
          <p className="font-bold text-green-800 mb-3">중개사 선정 완료!</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-slate-400">중개사무소</p><p className="font-semibold">{selectedAgent.agency_name}</p></div>
            <div><p className="text-xs text-slate-400">대표자</p><p className="font-semibold">{selectedAgent.name}</p></div>
            {selectedAgent.phone && <div><p className="text-xs text-slate-400">연락처</p><p className="font-semibold text-blue-700">{selectedAgent.phone}</p></div>}
            {selectedAgent.email && <div><p className="text-xs text-slate-400">이메일</p><p className="font-semibold text-blue-700">{selectedAgent.email}</p></div>}
          </div>
          <Link href={`/listings/${listing.id}/review?owner_token=${ownerToken}`} className="mt-4 block text-sm text-green-700 font-semibold hover:underline">
            거래 완료 후 후기 남기기 →
          </Link>
        </div>
      )}

      {/* 이미 선정된 경우 */}
      {!selectedAgent && listing.selected_bid_id && (
        <div className="mb-5 bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-sm text-blue-700">중개사를 선정하셨습니다.
            {listing.status !== 'completed' && (
              <Link href={`/listings/${listing.id}/review?owner_token=${ownerToken}`} className="ml-1 underline font-semibold">거래 완료 후 후기 남기기</Link>
            )}
          </p>
        </div>
      )}

      {/* 빠른 현황 */}
      <div className="bg-[#0C1B33] text-white rounded-2xl p-5 mb-5 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-slate-400 text-xs mb-1">입찰 수</p>
          <p className="text-xl font-bold">{bids.length}건</p>
        </div>
        <div className="text-center border-x border-slate-700">
          <p className="text-slate-400 text-xs mb-1">최저 보수율</p>
          <p className="text-xl font-bold text-blue-300">
            {bids.length > 0 ? `${bids[0].commission_rate}%` : '-'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-slate-400 text-xs mb-1">마감</p>
          <p className={`text-xl font-bold ${days !== null && days <= 3 ? 'text-red-400' : 'text-white'}`}>
            {days !== null ? (days > 0 ? `D-${days}` : '만료') : '-'}
          </p>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-5">
        {(['bids', 'edit'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === t ? 'bg-white text-[#191F28] shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'bids' ? `입찰 현황 (${bids.length})` : '매물 정보 수정'}
          </button>
        ))}
      </div>

      {/* 입찰 현황 탭 */}
      {tab === 'bids' && (
        <div className="space-y-4">
          {/* 마감일 연장 버튼 */}
          {canExtend && (
            <button
              onClick={handleExtendDeadline}
              disabled={extendingDeadline}
              className="w-full border border-blue-200 text-blue-600 hover:bg-blue-50 font-semibold py-3 rounded-2xl transition-colors text-sm disabled:opacity-50"
            >
              {extendingDeadline ? '연장 중...' : `입찰 마감일 연장 (+7일) · ${3 - (listing.deadline_extensions ?? 0)}회 남음`}
            </button>
          )}

          {bids.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
              <p className="text-3xl mb-3">📭</p>
              <p className="text-sm text-slate-400">아직 입찰이 없습니다.</p>
              <p className="text-xs text-slate-400 mt-1">중개사들이 곧 입찰할 거예요.</p>
            </div>
          ) : (
            bids.map((bid, index) => (
              <div
                key={bid.id}
                className={`bg-white rounded-2xl border p-5 shadow-sm ${
                  bid.is_selected ? 'border-blue-300 bg-blue-50' :
                  index === 0 ? 'border-green-200' : 'border-slate-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Link href={`/agents/${bid.agent_id}`} className="font-bold text-slate-900 hover:text-blue-600 transition-colors">
                        {bid.agents?.agency_name}
                      </Link>
                      {bid.agents?.is_verified && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">인증</span>
                      )}
                      {bid.is_selected && (
                        <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">선정됨</span>
                      )}
                      {!bid.is_selected && index === 0 && (
                        <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-medium">최저가</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{bid.agents?.name} 대표 · {bid.agents?.district}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-bold text-slate-900">{bid.commission_rate}%</p>
                    {bid.commission_amount > 0 && (
                      <p className="text-xs text-slate-500">{formatPrice(bid.commission_amount)}</p>
                    )}
                  </div>
                </div>

                {bid.service_description && (
                  <p className="text-xs text-slate-600 leading-relaxed mb-4 bg-slate-50 rounded-xl p-3">
                    {bid.service_description}
                  </p>
                )}

                <div className="flex gap-2 flex-wrap">
                  <Link
                    href={`/agents/${bid.agent_id}`}
                    className="text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
                  >
                    프로필 보기
                  </Link>
                  <Link
                    href={`/messages/${listing.id}/${bid.agent_id}?owner_token=${ownerToken}`}
                    className="text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
                  >
                    채팅
                  </Link>
                  {listing.status === 'active' && !listing.selected_bid_id && (
                    <button
                      onClick={() => handleSelectBid(bid.id)}
                      disabled={selectingBid !== null}
                      className="text-xs bg-[#3182F6] text-white px-4 py-1.5 rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                      {selectingBid === bid.id ? '선정 중...' : '이 중개사 선정하기'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 매물 정보 수정 탭 */}
      {tab === 'edit' && (
        <form onSubmit={handleSave} className="space-y-5">
          <div className={sectionClass}>
            <h3 className="text-sm font-bold text-slate-700 mb-4 pb-3 border-b border-slate-100">매물 정보 수정</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {listing.sell_address && (
                <>
                  <div>
                    <label className={labelClass}>희망 매도가 (만원)</label>
                    <input
                      type="number"
                      value={editForm.sell_price}
                      onChange={(e) => setEditForm((p) => ({ ...p, sell_price: e.target.value }))}
                      placeholder="예: 90000"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>전용면적 (㎡)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.sell_area_sqm}
                      onChange={(e) => setEditForm((p) => ({ ...p, sell_area_sqm: e.target.value }))}
                      placeholder="예: 84.99"
                      className={inputClass}
                    />
                  </div>
                </>
              )}
              {listing.buy_address && (
                <>
                  <div>
                    <label className={labelClass}>희망 매수가 (만원)</label>
                    <input
                      type="number"
                      value={editForm.buy_price}
                      onChange={(e) => setEditForm((p) => ({ ...p, buy_price: e.target.value }))}
                      placeholder="예: 70000"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>전용면적 (㎡)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.buy_area_sqm}
                      onChange={(e) => setEditForm((p) => ({ ...p, buy_area_sqm: e.target.value }))}
                      placeholder="예: 59.99"
                      className={inputClass}
                    />
                  </div>
                </>
              )}
              <div>
                <label className={labelClass}>희망 이사일</label>
                <input
                  type="date"
                  value={editForm.move_date}
                  onChange={(e) => setEditForm((p) => ({ ...p, move_date: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>입찰 마감일</label>
                <input
                  type="date"
                  value={editForm.bid_deadline}
                  onChange={(e) => setEditForm((p) => ({ ...p, bid_deadline: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>추가 설명</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  rows={4}
                  placeholder="매물에 대한 추가 설명을 입력하세요."
                  className={`${inputClass} resize-none`}
                />
              </div>
            </div>
          </div>

          {saveMsg && (
            <div className={`text-sm px-4 py-3 rounded-xl ${
              saveMsg === '저장되었습니다.' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {saveMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#3182F6] hover:bg-blue-600 text-white font-bold py-4 rounded-2xl transition-colors disabled:opacity-50 text-sm"
          >
            {saving ? '저장 중...' : '변경사항 저장'}
          </button>
        </form>
      )}
    </div>
  )
}

export default function MyListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto px-4 py-12 animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/2"></div>
        <div className="h-48 bg-slate-200 rounded-2xl"></div>
      </div>
    }>
      <MyListingContent id={id} />
    </Suspense>
  )
}
