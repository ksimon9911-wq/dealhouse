'use client'

import { useEffect, useState, Suspense } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabase, type Listing, type Bid } from '@/lib/supabase'
import { formatPrice, daysLeft } from '@/lib/utils'
import KakaoShare from '@/app/components/KakaoShare'

const LISTING_TYPE_LABEL: Record<string, string> = {
  sell: '매도',
  buy: '매수',
  both: '매도/매수',
}

const PROPERTY_TYPE_LABEL: Record<string, string> = {
  apartment: '아파트',
  villa: '빌라',
  officetel: '오피스텔',
}

function ListingDetailContent({ id }: { id: string }) {
  const searchParams = useSearchParams()
  const ownerToken = searchParams.get('owner_token')

  const [listing, setListing] = useState<Listing | null>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [selectingBid, setSelectingBid] = useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<{
    name?: string; agency_name?: string; phone?: string; email?: string
  } | null>(null)
  const [extendingDeadline, setExtendingDeadline] = useState(false)

  useEffect(() => {
    async function fetchData() {
      const [{ data: listingData }, { data: bidsData }] = await Promise.all([
        supabase
          .from('listings')
          .select('id, user_name, user_phone, user_email, listing_type, property_type, transaction_type, sell_address, sell_building_name, sell_dong, sell_ho, sell_area_sqm, sell_supply_area_sqm, sell_price, buy_address, buy_building_name, buy_dong, buy_ho, buy_area_sqm, buy_supply_area_sqm, buy_price, deposit, monthly_rent, lease_months, move_date, description, status, bid_deadline, image_urls, created_at, selected_bid_id, deadline_extensions, is_hidden')
          .eq('id', id)
          .single(),
        supabase
          .from('bids')
          .select('*, agents(*)')
          .eq('listing_id', id)
          .eq('is_visible', true)
          .order('commission_rate', { ascending: true }),
      ])
      if (listingData) setListing(listingData)
      if (bidsData) setBids(bidsData)
      setLoading(false)
    }
    fetchData()
  }, [id])

  async function handleSelectBid(bidId: string) {
    if (!ownerToken || !listing) return
    setSelectingBid(bidId)
    try {
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
    } catch {
      alert('오류가 발생했습니다.')
    }
    setSelectingBid(null)
  }

  async function handleExtendDeadline() {
    if (!ownerToken || !listing) return
    if ((listing.deadline_extensions ?? 0) >= 3) {
      alert('마감일 연장은 최대 3회까지 가능합니다.')
      return
    }
    setExtendingDeadline(true)
    try {
      const res = await fetch('/api/extend-deadline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listing.id, owner_token: ownerToken }),
      })
      const data = await res.json()
      if (data.success) {
        setListing((prev) => prev ? {
          ...prev,
          bid_deadline: data.new_deadline,
          deadline_extensions: data.extensions,
        } : prev)
      } else {
        alert(data.error ?? '오류가 발생했습니다.')
      }
    } catch {
      alert('오류가 발생했습니다.')
    }
    setExtendingDeadline(false)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-slate-200 rounded w-1/2 mb-8"></div>
        <div className="bg-white rounded-2xl border border-slate-100 p-8 mb-6">
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 bg-slate-200 rounded w-full"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-4">❌</p>
        <h2 className="text-xl font-bold text-slate-700 mb-2">매물을 찾을 수 없습니다</h2>
        <Link href="/listings" className="text-blue-600 hover:underline text-sm">
          매물 목록으로 돌아가기
        </Link>
      </div>
    )
  }

  const days = listing.bid_deadline ? daysLeft(listing.bid_deadline) : null
  const lowestBid = bids.length > 0 ? bids[0] : null
  const isOwner = !!ownerToken
  const canExtend = isOwner && listing.status === 'active' && (listing.deadline_extensions ?? 0) < 3

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:py-14">
      {/* 소유자 배너 */}
      {isOwner && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-bold text-blue-800 mb-0.5">내 매물 관리 페이지</p>
            <p className="text-xs text-blue-600">이 URL을 저장해두세요. 입찰 선정 및 마감일 연장에 필요합니다.</p>
          </div>
        </div>
      )}

      {/* 선정 완료 후 중개사 연락처 표시 */}
      {selectedAgent && (
        <div className="mb-6 bg-green-50 border border-green-300 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-bold text-green-800">중개사 선정 완료!</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-400">중개사무소</p>
              <p className="font-semibold">{selectedAgent.agency_name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">대표자</p>
              <p className="font-semibold">{selectedAgent.name}</p>
            </div>
            {selectedAgent.phone && (
              <div>
                <p className="text-xs text-slate-400">연락처</p>
                <p className="font-semibold text-blue-700">{selectedAgent.phone}</p>
              </div>
            )}
            {selectedAgent.email && (
              <div>
                <p className="text-xs text-slate-400">이메일</p>
                <p className="font-semibold text-blue-700">{selectedAgent.email}</p>
              </div>
            )}
          </div>
          {isOwner && (
            <div className="mt-4 pt-3 border-t border-green-200">
              <Link
                href={`/listings/${listing.id}/review?owner_token=${ownerToken}`}
                className="text-sm text-green-700 font-semibold hover:underline"
              >
                거래 완료 후 후기 남기기 →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 선정됨 (이미 선정된 경우) */}
      {!selectedAgent && listing.selected_bid_id && isOwner && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-sm text-blue-700 font-semibold">
            중개사를 선정하셨습니다. 거래가 완료되면{' '}
            <Link href={`/listings/${listing.id}/review?owner_token=${ownerToken}`} className="underline">
              후기를 남겨주세요
            </Link>
            .
          </p>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#6B7684] mb-8">
        <Link href="/" className="hover:text-[#191F28] transition-colors">홈</Link>
        <span className="text-slate-300">/</span>
        <Link href="/listings" className="hover:text-[#191F28] transition-colors">매물 목록</Link>
        <span className="text-slate-300">/</span>
        <span className="text-[#191F28] truncate max-w-[200px] font-medium">
          {listing.sell_address ?? listing.buy_address ?? '매물 상세'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Property Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                listing.status === 'active' ? 'bg-green-50 text-green-700' :
                listing.status === 'closed' ? 'bg-blue-50 text-blue-700' :
                'bg-slate-100 text-slate-500'
              }`}>
                {listing.status === 'active' ? '입찰 진행중' :
                 listing.status === 'closed' ? '중개사 선정됨' : '마감'}
              </span>
              <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                {PROPERTY_TYPE_LABEL[listing.property_type]}
              </span>
              <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                {LISTING_TYPE_LABEL[listing.listing_type]}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">
              {listing.sell_address ?? listing.buy_address ?? '주소 미입력'}
            </h1>

            {/* 매도 정보 */}
            {listing.sell_address && (
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold shrink-0">팔</span>
                  <span className="text-sm font-bold text-slate-700">매도할 집</span>
                </div>
                <div className="grid grid-cols-2 gap-y-4 gap-x-8 pl-7">
                  {(listing.sell_building_name || listing.sell_dong || listing.sell_ho) && (
                    <InfoRow label="건물정보" value={[listing.sell_building_name, listing.sell_dong, listing.sell_ho].filter(Boolean).join(' ')} />
                  )}
                  <InfoRow label="주소" value={listing.sell_address} />
                  {listing.sell_supply_area_sqm && <InfoRow label="공급면적" value={`${listing.sell_supply_area_sqm}㎡ (${Math.round(listing.sell_supply_area_sqm / 3.3058 * 10) / 10}평)`} />}
                  {listing.sell_area_sqm && <InfoRow label="전용면적" value={`${listing.sell_area_sqm}㎡ (${Math.round(listing.sell_area_sqm / 3.3058 * 10) / 10}평)`} />}
                  {listing.sell_price && <InfoRow label="희망 매도가" value={formatPrice(listing.sell_price)} highlight />}
                </div>
              </div>
            )}

            {/* 매수 정보 */}
            {listing.buy_address && (
              <div className={listing.sell_address ? 'pt-5 border-t border-slate-100 mb-5' : 'mb-5'}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-5 h-5 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold shrink-0">살</span>
                  <span className="text-sm font-bold text-slate-700">매수할 집</span>
                </div>
                <div className="grid grid-cols-2 gap-y-4 gap-x-8 pl-7">
                  {(listing.buy_building_name || listing.buy_dong || listing.buy_ho) && (
                    <InfoRow label="건물정보" value={[listing.buy_building_name, listing.buy_dong, listing.buy_ho].filter(Boolean).join(' ')} />
                  )}
                  <InfoRow label="주소" value={listing.buy_address} />
                  {listing.buy_supply_area_sqm && <InfoRow label="공급면적" value={`${listing.buy_supply_area_sqm}㎡ (${Math.round(listing.buy_supply_area_sqm / 3.3058 * 10) / 10}평)`} />}
                  {listing.buy_area_sqm && <InfoRow label="전용면적" value={`${listing.buy_area_sqm}㎡ (${Math.round(listing.buy_area_sqm / 3.3058 * 10) / 10}평)`} />}
                  {listing.buy_price && <InfoRow label="희망 매수가" value={formatPrice(listing.buy_price)} highlight />}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-y-4 gap-x-8 pt-4 border-t border-slate-100">
              {listing.move_date && (
                <InfoRow label="희망 이사일" value={listing.move_date.substring(0, 10)} />
              )}
              {listing.bid_deadline && (
                <InfoRow
                  label="입찰 마감일"
                  value={`${listing.bid_deadline.substring(0, 10)}${days !== null ? ` (D-${days > 0 ? days : 0})` : ''}`}
                  highlight={days !== null && days <= 3}
                />
              )}
              <InfoRow label="등록일" value={listing.created_at?.substring(0, 10) ?? '-'} />
            </div>

            {listing.description && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-sm font-semibold text-slate-700 mb-2">추가 설명</p>
                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                  {listing.description}
                </p>
              </div>
            )}
          </div>

          {/* Bids Section */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                입찰 현황
                <span className="ml-2 text-sm font-normal text-slate-400">{bids.length}건</span>
              </h2>
              {listing.status === 'active' && (
                <Link
                  href={`/agent-bid?listing_id=${listing.id}`}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  입찰 참여 →
                </Link>
              )}
            </div>

            {bids.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <p className="text-3xl mb-3">📭</p>
                <p className="text-sm">아직 입찰이 없습니다.</p>
                {listing.status === 'active' && (
                  <Link
                    href={`/agent-bid?listing_id=${listing.id}`}
                    className="mt-3 inline-block text-blue-600 hover:underline text-sm"
                  >
                    첫 번째 입찰하기 →
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {bids.map((bid, index) => (
                  <div
                    key={bid.id}
                    className={`rounded-xl border p-4 sm:p-5 ${
                      bid.is_selected
                        ? 'border-blue-300 bg-blue-50'
                        : index === 0
                        ? 'border-green-200 bg-green-50/50'
                        : 'border-slate-100 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/agents/${bid.agent_id}`}
                          className="font-semibold text-slate-900 text-sm hover:text-blue-600 transition-colors"
                        >
                          {bid.agents?.agency_name ?? '중개사무소'}
                        </Link>
                        {bid.agents?.name && (
                          <span className="text-slate-500 text-xs">{bid.agents.name} 대표</span>
                        )}
                        {bid.agents?.is_verified && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                            인증
                          </span>
                        )}
                        {bid.is_selected && (
                          <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">
                            선정됨
                          </span>
                        )}
                        {!bid.is_selected && index === 0 && (
                          <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-medium">
                            최저가
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-slate-900">{bid.commission_rate}%</p>
                        {bid.commission_amount > 0 && (
                          <p className="text-xs text-slate-500">{formatPrice(bid.commission_amount)}</p>
                        )}
                      </div>
                    </div>
                    {bid.agents?.district && (
                      <p className="text-xs text-slate-400 mb-2">{bid.agents.district}</p>
                    )}
                    {bid.service_description && (
                      <p className="text-xs text-slate-600 leading-relaxed mb-3">{bid.service_description}</p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/agents/${bid.agent_id}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        프로필 보기
                      </Link>
                      {isOwner && listing.status === 'active' && !listing.selected_bid_id && (
                        <button
                          onClick={() => handleSelectBid(bid.id)}
                          disabled={selectingBid !== null}
                          className="text-xs bg-[#3182F6] text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
                        >
                          {selectingBid === bid.id ? '선정 중...' : '이 중개사 선정하기'}
                        </button>
                      )}
                      {isOwner && listing.status === 'active' && (
                        <Link
                          href={`/messages/${listing.id}/${bid.agent_id}?owner_token=${ownerToken}`}
                          className="text-xs border border-slate-300 text-slate-600 px-3 py-1.5 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
                        >
                          채팅하기
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick Stats */}
          <div className="bg-[#0C1B33] text-white rounded-2xl p-6 shadow-sm">
            {listing.sell_price && (
              <div className="mb-3">
                <p className="text-slate-400 text-xs mb-0.5">희망 매도가</p>
                <p className="text-xl font-bold text-white">{formatPrice(listing.sell_price)}</p>
              </div>
            )}
            {listing.buy_price && (
              <div className="mb-3">
                <p className="text-slate-400 text-xs mb-0.5">희망 매수가</p>
                <p className="text-xl font-bold text-white">{formatPrice(listing.buy_price)}</p>
              </div>
            )}
            <div className="border-t border-slate-700 pt-4 space-y-3">
              {bids.length > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">최저 중개보수율</span>
                    <span className="text-blue-300 font-bold">{bids[0].commission_rate}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">예상 최저 중개비</span>
                    <span className="text-white font-semibold">
                      {formatPrice(Math.round(
                        ((listing.sell_price ?? listing.buy_price ?? 0) * bids[0].commission_rate) / 100
                      ))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">입찰 수</span>
                    <span className="text-white font-semibold">{bids.length}건</span>
                  </div>
                </>
              )}
              {days !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">입찰 마감</span>
                  <span className={`font-semibold ${days <= 3 ? 'text-red-400' : 'text-white'}`}>
                    {days > 0 ? `D-${days}` : '마감됨'}
                  </span>
                </div>
              )}
              {isOwner && (listing.deadline_extensions ?? 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">연장 횟수</span>
                  <span className="text-white">{listing.deadline_extensions}/3회</span>
                </div>
              )}
            </div>
          </div>

          {/* Lowest Bid */}
          {lowestBid && (
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <p className="text-xs font-semibold text-slate-500 mb-3">최저 입찰 중개사</p>
              <Link href={`/agents/${lowestBid.agent_id}`} className="font-bold text-slate-900 text-sm hover:text-blue-600 transition-colors">
                {lowestBid.agents?.agency_name}
              </Link>
              <p className="text-slate-500 text-xs mt-0.5">{lowestBid.agents?.name} · {lowestBid.agents?.district}</p>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">중개보수율</span>
                <span className="text-base font-bold text-green-700">{lowestBid.commission_rate}%</span>
              </div>
            </div>
          )}

          {/* 마감일 연장 버튼 */}
          {canExtend && (
            <button
              onClick={handleExtendDeadline}
              disabled={extendingDeadline}
              className="w-full text-center border border-blue-200 text-blue-600 hover:bg-blue-50 font-semibold py-3 rounded-2xl transition-colors text-sm disabled:opacity-50"
            >
              {extendingDeadline ? '연장 중...' : `마감일 연장 (+7일) · ${3 - (listing.deadline_extensions ?? 0)}회 남음`}
            </button>
          )}

          {listing.status === 'active' && (
            <Link
              href={`/agent-bid?listing_id=${listing.id}`}
              className="block w-full text-center bg-[#3182F6] hover:bg-blue-600 text-white font-bold py-3.5 rounded-2xl transition-colors text-sm"
            >
              이 매물에 입찰하기
            </Link>
          )}

          {/* 카카오톡 공유 */}
          <KakaoShare
            title={`[딜하우스] ${listing.sell_address ?? listing.buy_address ?? '매물'}`}
            description={`${PROPERTY_TYPE_LABEL[listing.property_type]} · ${LISTING_TYPE_LABEL[listing.listing_type]} · 중개사 ${bids.length}명 입찰중`}
            imageUrl={listing.image_urls?.[0] ?? ''}
            linkUrl={typeof window !== 'undefined' ? window.location.href.split('?')[0] : ''}
          />

          <Link
            href="/listings"
            className="block w-full text-center border border-slate-200 text-[#6B7684] hover:bg-slate-50 font-semibold py-3.5 rounded-2xl transition-colors text-sm"
          >
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-slate-200 rounded w-1/2 mb-8"></div>
        <div className="bg-white rounded-2xl border border-slate-100 p-8 mb-6">
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 bg-slate-200 rounded w-full"></div>
            ))}
          </div>
        </div>
      </div>
    }>
      <ListingDetailContent id={id} />
    </Suspense>
  )
}

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? 'text-blue-700' : 'text-slate-900'}`}>
        {value}
      </p>
    </div>
  )
}
