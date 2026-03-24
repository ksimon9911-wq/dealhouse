'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, type Listing } from '@/lib/supabase'

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

function formatPrice(price: number) {
  if (price >= 100000000) {
    const eok = Math.floor(price / 100000000)
    const man = Math.floor((price % 100000000) / 10000)
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`
  }
  return `${(price / 10000).toLocaleString()}만원`
}

function daysLeft(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const STEPS = [
  {
    num: '01',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    title: '매물 등록',
    desc: '주소와 희망 가격만 입력하면 끝',
  },
  {
    num: '02',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: '중개사 입찰',
    desc: '검증된 중개사들이 조건을 제안',
  },
  {
    num: '03',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: '비교 선택',
    desc: '수수료·서비스를 한눈에 비교',
  },
  {
    num: '04',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: '절약 완료',
    desc: '수백만 원의 중개비를 아낍니다',
  },
]

const DUMMY_CARDS = [
  {
    address: '서울 마포구 도화동 도화자이',
    area: 84.5,
    price: 920000000,
    type: 'apartment',
    listingType: 'sell',
    days: 7,
  },
  {
    address: '경기 성남시 분당구 정자동 파크뷰자이',
    area: 59.0,
    price: 780000000,
    type: 'apartment',
    listingType: 'sell',
    days: 14,
  },
  {
    address: '서울 송파구 신천동 잠실파크리오',
    area: 114.9,
    price: 1680000000,
    type: 'apartment',
    listingType: 'sell',
    days: 5,
  },
]

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchListings() {
      const { data } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(6)
      if (data) setListings(data)
      setLoading(false)
    }
    fetchListings()
  }, [])

  return (
    <div>
      {/* Hero */}
      <section className="bg-[#0C1B33] text-white pt-20 pb-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 text-sm text-blue-200 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3182F6] animate-pulse inline-block"></span>
            지금 {loading ? '–' : listings.length}개 매물 입찰 진행 중
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] mb-6 tracking-tight">
            중개비,<br />
            <span className="text-[#3182F6]">이제 경쟁시키세요</span>
          </h1>
          <p className="text-slate-400 text-base sm:text-lg mb-4 max-w-2xl mx-auto leading-relaxed">
            매물을 등록하면 여러 중개사가 직접 입찰합니다.<br className="hidden sm:block" />
            가장 낮은 수수료와 좋은 조건을 직접 선택하세요.
          </p>
          <p className="text-sm text-slate-500 mb-10">
            10억 매물 기준 · 평균 <strong className="text-white">0.4%</strong> 절감 →{' '}
            <strong className="text-[#3182F6]">약 400만원</strong> 절약
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="bg-[#3182F6] hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl transition-colors text-base shadow-lg shadow-blue-900/30"
            >
              무료로 매물 등록하기
            </Link>
            <Link
              href="/listings"
              className="bg-white/8 hover:bg-white/15 text-white font-semibold px-8 py-4 rounded-2xl transition-colors text-base border border-white/15"
            >
              매물 목록 보기
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#3182F6] font-bold text-sm mb-2 tracking-wide uppercase">How it works</p>
            <h2 className="text-2xl sm:text-3xl font-black text-[#191F28]">
              4단계로 끝나는 중개비 절약
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-0">
            {STEPS.map((step, i) => (
              <div key={step.num} className="flex lg:flex-col items-start lg:items-center gap-4 lg:gap-0 relative">
                {/* Connector line (desktop) */}
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[calc(50%+32px)] right-[calc(-50%+32px)] h-0.5 bg-slate-100 z-0" />
                )}
                <div className="relative z-10 w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 text-[#3182F6] lg:mb-5">
                  {step.icon}
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#3182F6] text-white text-[10px] font-black rounded-full flex items-center justify-center">
                    {step.num}
                  </span>
                </div>
                <div className="lg:text-center lg:px-4">
                  <h3 className="font-bold text-[#191F28] text-base mb-1">{step.title}</h3>
                  <p className="text-[#6B7684] text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-14 px-4 bg-[#F5F6F8]">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 sm:gap-8 text-center">
          {[
            { num: '0원', label: '서비스 이용료', sub: '완전 무료' },
            { num: '3분', label: '매물 등록 시간', sub: '간단 입력만으로' },
            { num: '최대 0.9%', label: '법정 최고 요율', sub: '입찰로 낮추세요' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-5 sm:p-7 shadow-sm border border-slate-100">
              <div className="text-xl sm:text-3xl font-black text-[#3182F6] mb-1">{stat.num}</div>
              <div className="text-[#191F28] text-xs sm:text-sm font-semibold">{stat.label}</div>
              <div className="text-[#6B7684] text-xs mt-0.5">{stat.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Active Listings */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#191F28]">진행 중인 입찰 매물</h2>
              <p className="text-[#6B7684] mt-1 text-sm">지금 중개사 입찰을 받고 있는 매물입니다</p>
            </div>
            <Link href="/listings" className="text-[#3182F6] hover:text-blue-700 text-sm font-semibold hidden sm:block">
              전체 보기 →
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-[#F5F6F8] rounded-2xl p-6 animate-pulse h-48" />
              ))}
            </div>
          ) : listings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {listings.map((listing) => {
                const days = listing.bid_deadline ? daysLeft(listing.bid_deadline) : null
                const price = listing.sell_price ?? listing.buy_price ?? 0
                const savings = Math.round(price * 0.006)
                return (
                  <Link
                    key={listing.id}
                    href={`/listings/${listing.id}`}
                    className="bg-white rounded-2xl border border-slate-100 hover:border-[#3182F6]/30 hover:shadow-lg transition-all p-5 group flex flex-col"
                  >
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className="text-xs font-semibold bg-blue-50 text-[#3182F6] px-2.5 py-1 rounded-full">
                        {PROPERTY_TYPE_LABEL[listing.property_type]}
                      </span>
                      <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                        {LISTING_TYPE_LABEL[listing.listing_type]}
                      </span>
                      {days !== null && days >= 0 && days <= 7 && (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${days <= 2 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                          D-{days}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-[#191F28] mb-0.5 group-hover:text-[#3182F6] transition-colors truncate text-sm">
                      {listing.sell_building_name ?? listing.buy_building_name ?? listing.sell_address ?? listing.buy_address ?? '주소 미입력'}
                      {(listing.sell_dong ?? listing.buy_dong) && (
                        <span className="font-normal text-slate-500 ml-1">{listing.sell_dong ?? listing.buy_dong}</span>
                      )}
                    </h3>
                    <p className="text-[#6B7684] text-xs mb-0.5 truncate">
                      {listing.sell_address ?? listing.buy_address ?? ''}
                    </p>
                    <p className="text-[#6B7684] text-xs mb-4">
                      {(() => {
                        const excl = listing.sell_area_sqm ?? listing.buy_area_sqm
                        const supp = listing.sell_supply_area_sqm ?? listing.buy_supply_area_sqm
                        const fmt = (v: number) => `${v}㎡ (${Math.round((v / 3.3058) * 10) / 10}평)`
                        if (supp && excl) return `공급 ${fmt(supp)} / 전용 ${fmt(excl)}`
                        if (excl) return `전용 ${fmt(excl)}`
                        return '-'
                      })()}
                    </p>
                    <div className="flex items-end justify-between mt-auto pt-4 border-t border-slate-50">
                      <div>
                        <p className="text-xs text-[#6B7684] mb-0.5">
                          {listing.sell_price ? '희망 매도가' : '희망 매수가'}
                        </p>
                        <p className="text-lg font-black text-[#191F28]">{formatPrice(price)}</p>
                      </div>
                      {savings > 0 && (
                        <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-xl">
                          최대 {formatPrice(savings)} 절약
                        </p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <>
              <p className="text-center text-[#6B7684] text-sm mb-6">
                아직 등록된 매물이 없습니다. 아래는 예시입니다.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {DUMMY_CARDS.map((card, i) => {
                  const savings = Math.round(card.price * 0.006)
                  return (
                    <div
                      key={i}
                      className="bg-white rounded-2xl border border-dashed border-slate-200 p-5 flex flex-col opacity-75 relative overflow-hidden"
                    >
                      <div className="absolute top-3 right-3">
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">예시</span>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-semibold bg-blue-50 text-[#3182F6] px-2.5 py-1 rounded-full">
                          {PROPERTY_TYPE_LABEL[card.type]}
                        </span>
                        <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                          {LISTING_TYPE_LABEL[card.listingType]}
                        </span>
                        <span className="text-xs font-bold bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full">
                          D-{card.days}
                        </span>
                      </div>
                      <h3 className="font-bold text-[#191F28] mb-1 truncate text-sm">{card.address}</h3>
                      <p className="text-[#6B7684] text-xs mb-4">전용 {card.area}㎡</p>
                      <div className="flex items-end justify-between mt-auto pt-4 border-t border-slate-50">
                        <div>
                          <p className="text-xs text-[#6B7684] mb-0.5">희망 매도가</p>
                          <p className="text-lg font-black text-[#191F28]">{formatPrice(card.price)}</p>
                        </div>
                        <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-xl">
                          최대 {formatPrice(savings)} 절약
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="text-center mt-8">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 bg-[#3182F6] text-white font-bold px-8 py-4 rounded-2xl text-sm hover:bg-blue-600 transition-colors"
                >
                  첫 번째 매물 등록하기 →
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Agent CTA */}
      <section className="py-20 px-4 bg-[#F5F6F8]">
        <div className="max-w-3xl mx-auto">
          <div className="bg-[#0C1B33] rounded-3xl p-10 text-center text-white">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-7 h-7 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mb-3">중개사이신가요?</h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto text-sm leading-relaxed">
              DealHouse에서 새로운 고객을 만나보세요.<br />
              원하는 매물에 직접 입찰하고 중개 기회를 잡으세요.
            </p>
            <Link
              href="/agent-bid"
              className="inline-block bg-[#3182F6] hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl transition-colors text-sm"
            >
              입찰 참여하기
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
