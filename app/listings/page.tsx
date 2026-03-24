'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, type Listing } from '@/lib/supabase'

const LISTING_TYPE_LABEL: Record<string, string> = {
  sell: '매도', buy: '매수', both: '매도/매수',
  offer: '임대', seek: '임차',
}
const TRANSACTION_TYPE_LABEL: Record<string, { label: string; color: string }> = {
  sale:   { label: '매매', color: 'bg-blue-50 text-[#3182F6]' },
  jeonse: { label: '전세', color: 'bg-violet-50 text-violet-700' },
  wolse:  { label: '월세', color: 'bg-orange-50 text-orange-700' },
}

const PROPERTY_TYPE_LABEL: Record<string, string> = {
  apartment: '아파트',
  villa: '빌라',
  officetel: '오피스텔',
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  active: { label: '입찰 진행중', color: 'bg-emerald-50 text-emerald-700' },
  closed: { label: '입찰 마감', color: 'bg-slate-100 text-slate-500' },
  completed: { label: '거래 완료', color: 'bg-blue-50 text-[#3182F6]' },
}

function formatPrice(price: number) {
  if (price >= 100000000) {
    const eok = Math.floor(price / 100000000)
    const man = Math.floor((price % 100000000) / 10000)
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`
  }
  return `${(price / 10000).toLocaleString()}만원`
}

function formatSavings(price: number) {
  const s = Math.round(price * 0.006)
  if (s >= 100000000) return `${Math.floor(s / 100000000)}억원`
  if (s >= 10000) return `${Math.floor(s / 10000)}만원`
  return `${s.toLocaleString()}원`
}

function daysLeft(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const DUMMY_LISTINGS: Listing[] = [
  {
    id: 'dummy-1',
    sell_address: '서울 마포구 도화동',
    sell_building_name: '도화자이',
    sell_dong: '101동',
    sell_ho: null,
    sell_area_sqm: 84.5,
    sell_supply_area_sqm: 113.4,
    sell_price: 920000000,
    transaction_type: 'sale' as const,
    deposit: null,
    monthly_rent: null,
    lease_months: null,
    buy_address: null,
    buy_building_name: null,
    buy_dong: null,
    buy_ho: null,
    buy_area_sqm: null,
    buy_supply_area_sqm: null,
    buy_price: null,
    property_type: 'apartment',
    listing_type: 'sell',
    status: 'active',
    bid_deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    description: '리모델링 완료. 역세권 단지.',
    move_date: '',
    image_urls: null,
    created_at: new Date().toISOString(),
    user_name: '',
    user_phone: '',
    user_email: '',
  },
  {
    id: 'dummy-2',
    sell_address: '경기 성남시 분당구 정자동',
    sell_building_name: '파크뷰자이',
    sell_dong: null,
    sell_ho: null,
    sell_area_sqm: 59.0,
    sell_supply_area_sqm: 84.7,
    sell_price: 780000000,
    transaction_type: 'sale' as const,
    deposit: null,
    monthly_rent: null,
    lease_months: null,
    buy_address: null,
    buy_building_name: null,
    buy_dong: null,
    buy_ho: null,
    buy_area_sqm: null,
    buy_supply_area_sqm: null,
    buy_price: null,
    property_type: 'apartment',
    listing_type: 'sell',
    status: 'active',
    bid_deadline: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
    description: '학군 우수. 교통 편리.',
    move_date: '',
    image_urls: null,
    created_at: new Date().toISOString(),
    user_name: '',
    user_phone: '',
    user_email: '',
  },
]

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'apartment' | 'villa' | 'officetel'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'sell' | 'buy' | 'both'>('all')

  useEffect(() => {
    async function fetchListings() {
      let query = supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false })

      if (filter !== 'all') query = query.eq('property_type', filter)
      if (typeFilter !== 'all') query = query.eq('listing_type', typeFilter)

      const { data } = await query
      if (data) setListings(data)
      setLoading(false)
    }
    fetchListings()
  }, [filter, typeFilter])

  const showDummy = !loading && listings.length === 0

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#191F28]">매물 목록</h1>
          <p className="text-[#6B7684] mt-1 text-sm">
            {loading ? '불러오는 중...' : `${listings.length}개 매물`}
          </p>
        </div>
        <Link
          href="/register"
          className="inline-flex items-center justify-center gap-2 bg-[#3182F6] hover:bg-blue-600 text-white font-bold px-5 py-3 rounded-2xl transition-colors text-sm"
        >
          + 매물 등록
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-x-6 gap-y-3 mb-8">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[#6B7684] font-medium">부동산</span>
          {(['all', 'apartment', 'villa', 'officetel'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === f
                  ? 'bg-[#191F28] text-white'
                  : 'bg-white border border-slate-200 text-[#6B7684] hover:border-slate-300'
              }`}
            >
              {f === 'all' ? '전체' : PROPERTY_TYPE_LABEL[f]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[#6B7684] font-medium">거래</span>
          {(['all', 'sell', 'buy', 'both'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                typeFilter === f
                  ? 'bg-[#3182F6] text-white'
                  : 'bg-white border border-slate-200 text-[#6B7684] hover:border-slate-300'
              }`}
            >
              {f === 'all' ? '전체' : LISTING_TYPE_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 animate-pulse h-52" />
          ))}
        </div>
      ) : (
        <>
          {showDummy && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-3.5 mb-6">
              <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-amber-800">
                <strong>실제 등록된 매물이 없습니다.</strong> 아래는 예시 매물입니다.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(showDummy ? DUMMY_LISTINGS : listings).map((listing) => {
              const days = listing.bid_deadline ? daysLeft(listing.bid_deadline) : null
              const statusInfo = STATUS_LABEL[listing.status] ?? { label: listing.status, color: 'bg-slate-100 text-slate-500' }
              const price = listing.sell_price ?? listing.buy_price ?? 0
              const isDummy = listing.id.startsWith('dummy-')
              return (
                <div
                  key={listing.id}
                  className={`bg-white rounded-2xl border transition-all flex flex-col ${
                    isDummy
                      ? 'border-dashed border-slate-200 opacity-70'
                      : 'border-slate-100 hover:border-[#3182F6]/30 hover:shadow-lg cursor-pointer'
                  }`}
                >
                  {isDummy ? (
                    <div className="p-5 flex flex-col h-full">
                      <DummyCardContent listing={listing} statusInfo={statusInfo} days={days} price={price} />
                    </div>
                  ) : (
                    <Link href={`/listings/${listing.id}`} className="p-5 flex flex-col h-full group">
                      <RealCardContent listing={listing} statusInfo={statusInfo} days={days} price={price} />
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function fmtArea(v: number) {
  return `${v}㎡ (${Math.round((v / 3.3058) * 10) / 10}평)`
}

function AreaDisplay({ listing }: { listing: Listing }) {
  const excl = listing.sell_area_sqm ?? listing.buy_area_sqm
  const supp = listing.sell_supply_area_sqm ?? listing.buy_supply_area_sqm
  if (!excl) return <p className="text-[#6B7684] text-xs mb-1">면적 미입력</p>
  return (
    <p className="text-[#6B7684] text-xs mb-1">
      {supp ? `공급 ${fmtArea(supp)} / 전용 ${fmtArea(excl)}` : `전용 ${fmtArea(excl)}`}
    </p>
  )
}

function CardBadges({
  listing,
  statusInfo,
  days,
  isDummy,
}: {
  listing: Listing
  statusInfo: { label: string; color: string }
  days: number | null
  isDummy?: boolean
}) {
  const txInfo = TRANSACTION_TYPE_LABEL[listing.transaction_type ?? 'sale']
  return (
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      {isDummy && (
        <span className="text-[10px] font-bold bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">예시</span>
      )}
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
      <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
        {PROPERTY_TYPE_LABEL[listing.property_type]}
      </span>
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${txInfo.color}`}>
        {txInfo.label}
      </span>
      <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">
        {LISTING_TYPE_LABEL[listing.listing_type]}
      </span>
      {days !== null && days >= 0 && listing.status === 'active' && (
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${days <= 2 ? 'bg-red-50 text-red-600' : days <= 7 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
          D-{days}
        </span>
      )}
    </div>
  )
}

function RealCardContent({
  listing,
  statusInfo,
  days,
  price,
}: {
  listing: Listing
  statusInfo: { label: string; color: string }
  days: number | null
  price: number
}) {
  return (
    <>
      <CardBadges listing={listing} statusInfo={statusInfo} days={days} />
      <h3 className="font-bold text-[#191F28] mb-0.5 group-hover:text-[#3182F6] transition-colors truncate text-sm">
        {listing.sell_building_name ?? listing.buy_building_name ?? listing.sell_address ?? listing.buy_address ?? '주소 미입력'}
        {(listing.sell_dong ?? listing.buy_dong) && (
          <span className="font-normal text-slate-500 ml-1">{listing.sell_dong ?? listing.buy_dong}</span>
        )}
      </h3>
      <p className="text-[#6B7684] text-xs mb-1 truncate">
        {listing.sell_address ?? listing.buy_address ?? ''}
      </p>
      <AreaDisplay listing={listing} />
      {listing.description && (
        <p className="text-[#6B7684] text-xs mb-3 line-clamp-2 leading-relaxed">{listing.description}</p>
      )}
      <div className="flex items-end justify-between mt-auto pt-4 border-t border-slate-50">
        <div>
          {listing.transaction_type === 'jeonse' && listing.deposit && (
            <>
              <p className="text-xs text-[#6B7684] mb-0.5">보증금</p>
              <p className="text-lg font-black text-[#191F28]">{formatPrice(listing.deposit)}</p>
            </>
          )}
          {listing.transaction_type === 'wolse' && listing.deposit && (
            <>
              <p className="text-xs text-[#6B7684] mb-0.5">보증금 / 월세</p>
              <p className="text-lg font-black text-[#191F28]">
                {formatPrice(listing.deposit)}
                {listing.monthly_rent && <span className="text-sm font-semibold text-slate-500"> / {formatPrice(listing.monthly_rent)}</span>}
              </p>
            </>
          )}
          {(!listing.transaction_type || listing.transaction_type === 'sale') && (
            <>
              {listing.sell_price && (
                <>
                  <p className="text-xs text-[#6B7684] mb-0.5">희망 매도가</p>
                  <p className="text-lg font-black text-[#191F28]">{formatPrice(listing.sell_price)}</p>
                </>
              )}
              {listing.buy_price && !listing.sell_price && (
                <>
                  <p className="text-xs text-[#6B7684] mb-0.5">희망 매수가</p>
                  <p className="text-lg font-black text-[#191F28]">{formatPrice(listing.buy_price)}</p>
                </>
              )}
            </>
          )}
        </div>
        {price > 0 && (!listing.transaction_type || listing.transaction_type === 'sale') && (
          <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-xl">
            최대 {formatSavings(price)} 절약
          </p>
        )}
      </div>
    </>
  )
}

function DummyCardContent({
  listing,
  statusInfo,
  days,
  price,
}: {
  listing: Listing
  statusInfo: { label: string; color: string }
  days: number | null
  price: number
}) {
  return (
    <>
      <CardBadges listing={listing} statusInfo={statusInfo} days={days} isDummy />
      <h3 className="font-bold text-[#191F28] mb-0.5 truncate text-sm">
        {listing.sell_building_name ?? listing.buy_building_name ?? listing.sell_address ?? listing.buy_address ?? '주소 미입력'}
      </h3>
      <p className="text-[#6B7684] text-xs mb-1 truncate">
        {listing.sell_address ?? listing.buy_address ?? ''}
      </p>
      <AreaDisplay listing={listing} />
      {listing.description && (
        <p className="text-[#6B7684] text-xs mb-3 line-clamp-2 leading-relaxed">{listing.description}</p>
      )}
      <div className="flex items-end justify-between mt-auto pt-4 border-t border-slate-50">
        <div>
          {listing.sell_price && (
            <>
              <p className="text-xs text-[#6B7684] mb-0.5">희망 매도가</p>
              <p className="text-lg font-black text-[#191F28]">{formatPrice(listing.sell_price)}</p>
            </>
          )}
        </div>
        {price > 0 && (
          <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-xl">
            최대 {formatSavings(price)} 절약
          </p>
        )}
      </div>
    </>
  )
}
