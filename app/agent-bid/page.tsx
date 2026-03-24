'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase, type Listing } from '@/lib/supabase'

const inputClass =
  'w-full border border-slate-200 rounded-xl px-4 py-3 text-[#191F28] text-sm focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent transition bg-white placeholder:text-slate-400'
const labelClass = 'block text-sm font-semibold text-[#191F28] mb-1.5'
const sectionClass = 'bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-sm'

function formatPrice(price: number) {
  if (price >= 100000000) {
    const eok = Math.floor(price / 100000000)
    const man = Math.floor((price % 100000000) / 10000)
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`
  }
  return `${(price / 10000).toLocaleString()}만원`
}

const PROPERTY_TYPE_LABEL: Record<string, string> = {
  apartment: '아파트',
  villa: '빌라',
  officetel: '오피스텔',
}

const LISTING_TYPE_LABEL: Record<string, string> = {
  sell: '매도',
  buy: '매수',
  both: '매도/매수',
}

function AgentBidForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedListingId = searchParams.get('listing_id')

  const [listings, setListings] = useState<Listing[]>([])
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [dashboardToken, setDashboardToken] = useState<string | null>(null)
  const [successListingId, setSuccessListingId] = useState<string | null>(null)
  const [listingSearch, setListingSearch] = useState('')
  const [commissionMode, setCommissionMode] = useState<'rate' | 'fixed'>('rate')

  const [agentForm, setAgentForm] = useState({
    name: '',
    agency_name: '',
    license_number: '',   // 공인중개사 자격번호
    reg_number: '',       // 중개사무소 등록번호
    phone: '',
    email: '',
    district: '',
  })
  const [licenseDoc, setLicenseDoc] = useState<File | null>(null)

  const [bidForm, setBidForm] = useState({
    listing_id: preselectedListingId ?? '',
    commission_rate: '',
    commission_amount: '',
    service_description: '',
  })

  useEffect(() => {
    async function fetchActiveListings() {
      const { data } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      if (data) setListings(data)
    }
    fetchActiveListings()
  }, [])

  useEffect(() => {
    if (bidForm.listing_id) {
      const found = listings.find((l) => l.id === bidForm.listing_id) ?? null
      setSelectedListing(found)
    } else {
      setSelectedListing(null)
    }
  }, [bidForm.listing_id, listings])

  // 요율 모드일 때 예상 수수료 자동 계산
  useEffect(() => {
    if (commissionMode === 'rate' && selectedListing && bidForm.commission_rate) {
      const basePrice = selectedListing.sell_price ?? selectedListing.buy_price ?? 0
      const amount = Math.round((basePrice * parseFloat(bidForm.commission_rate)) / 100)
      setBidForm((prev) => ({ ...prev, commission_amount: String(amount) }))
    }
  }, [bidForm.commission_rate, selectedListing, commissionMode])

  const filteredListings = listings.filter((l) => {
    if (!listingSearch.trim()) return true
    const q = listingSearch.toLowerCase()
    return (
      (l.sell_building_name ?? '').toLowerCase().includes(q) ||
      (l.buy_building_name ?? '').toLowerCase().includes(q) ||
      (l.sell_address ?? '').toLowerCase().includes(q) ||
      (l.buy_address ?? '').toLowerCase().includes(q) ||
      ((l as unknown as Record<string, unknown>).listing_no as string ?? '').toLowerCase().includes(q)
    )
  })

  function handleAgentChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAgentForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleBidChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setBidForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // 1) 서류 업로드 (있는 경우)
    let licenseDocUrl: string | null = null
    if (licenseDoc) {
      const ext = licenseDoc.name.split('.').pop()
      const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('agent-docs')
        .upload(path, licenseDoc, { upsert: false })
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('agent-docs').getPublicUrl(path)
        licenseDocUrl = urlData.publicUrl
      }
    }

    // 2) 중개사 upsert (license_number 기준)
    const { data: agentData, error: agentError } = await supabase
      .from('agents')
      .upsert(
        [
          {
            name: agentForm.name,
            agency_name: agentForm.agency_name,
            license_number: agentForm.license_number,
            phone: agentForm.phone,
            email: agentForm.email,
            district: agentForm.district,
            is_verified: false,
            ...(licenseDocUrl ? { license_doc_url: licenseDocUrl } : {}),
          },
        ],
        { onConflict: 'license_number' }
      )
      .select()
      .single()

    if (agentError) {
      setError(`중개사 등록 오류: ${agentError.message}`)
      setLoading(false)
      return
    }

    // 2) 입찰 등록
    const { data: bidData, error: bidError } = await supabase.from('bids').insert([
      {
        listing_id: bidForm.listing_id,
        agent_id: agentData.id,
        commission_rate: parseFloat(bidForm.commission_rate),
        commission_amount: bidForm.commission_amount ? parseFloat(bidForm.commission_amount) : 0,
        service_description: bidForm.service_description,
        is_selected: false,
        is_visible: true,
      },
    ]).select().single()

    setLoading(false)

    if (bidError) {
      setError(`입찰 등록 오류: ${bidError.message}`)
      return
    }

    // 알림 발송 (비동기, 실패해도 무시)
    if (bidData) {
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bid_id: bidData.id }),
      }).catch(() => {})
    }

    setDashboardToken(agentData.dashboard_token ?? null)
    setSuccessListingId(bidForm.listing_id)
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">입찰이 등록되었습니다!</h2>
        <p className="text-slate-500 mb-6">집주인이 입찰 내용을 검토할 예정입니다.</p>

        {dashboardToken && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left mb-6">
            <p className="text-sm font-bold text-slate-700 mb-2">대시보드 링크 (저장 필수!)</p>
            <p className="text-xs text-slate-500 mb-3">
              아래 링크를 저장해두세요. 입찰 현황 및 통계를 확인할 수 있습니다.
            </p>
            <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-600 break-all">
              /dashboard/agent?agent_token={dashboardToken}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/dashboard/agent?agent_token=${dashboardToken}`)
                alert('복사되었습니다!')
              }}
              className="mt-3 text-xs text-blue-600 hover:underline"
            >
              링크 복사하기
            </button>
          </div>
        )}

        {successListingId && (
          <Link
            href={`/listings/${successListingId}`}
            className="inline-block bg-[#3182F6] text-white font-bold px-6 py-3 rounded-2xl hover:bg-blue-600 transition-colors text-sm"
          >
            매물 상세 보기 →
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
      <div className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-black text-[#191F28]">중개사 입찰</h1>
        <p className="text-[#6B7684] mt-2 text-sm">
          매물을 선택하고 중개 조건을 입력해 입찰에 참여하세요.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 매물 선택 */}
        <div className={sectionClass}>
          <h2 className="text-base font-bold text-slate-900 mb-6 pb-3 border-b border-slate-100">
            입찰 매물 선택
          </h2>
          <div>
            <label className={labelClass}>입찰할 매물 *</label>
            <input
              type="text"
              value={listingSearch}
              onChange={(e) => setListingSearch(e.target.value)}
              placeholder="건물명, 주소, 관리번호로 검색..."
              className={`${inputClass} mb-2`}
            />
            <select
              name="listing_id"
              value={bidForm.listing_id}
              onChange={handleBidChange}
              required
              className={inputClass}
              size={filteredListings.length > 0 && listingSearch ? Math.min(filteredListings.length + 1, 6) : 1}
            >
              <option value="">-- 매물을 선택하세요 --</option>
              {filteredListings.map((listing) => {
                const buildingName = listing.sell_building_name ?? listing.buy_building_name ?? ''
                const addr = listing.sell_address ?? listing.buy_address ?? ''
                const price = listing.sell_price ?? listing.buy_price ?? listing.deposit ?? 0
                const displayName = buildingName || addr
                const listingNo = (listing as unknown as Record<string, unknown>).listing_no as string
                return (
                  <option key={listing.id} value={listing.id}>
                    {listingNo ? `[${listingNo}] ` : ''}
                    {displayName} · {PROPERTY_TYPE_LABEL[listing.property_type]} · {formatPrice(price)}
                  </option>
                )
              })}
            </select>
            {listingSearch && filteredListings.length === 0 && (
              <p className="text-xs text-slate-400 mt-1">검색 결과가 없습니다.</p>
            )}
            {listings.length === 0 && (
              <p className="text-xs text-slate-400 mt-2">
                현재 입찰 가능한 매물이 없습니다.{' '}
                <Link href="/listings" className="text-blue-600 hover:underline">
                  매물 목록 보기
                </Link>
              </p>
            )}
          </div>

          {/* Selected listing preview */}
          {selectedListing && (
            <div className="mt-4 bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
              {selectedListing.sell_address && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-400">매도 주소</p>
                    <p className="font-medium text-slate-700 truncate">{selectedListing.sell_address}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">매도 면적</p>
                    <p className="font-medium text-slate-700">{selectedListing.sell_area_sqm}㎡</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">희망 매도가</p>
                    <p className="font-semibold text-blue-700">{formatPrice(selectedListing.sell_price ?? 0)}</p>
                  </div>
                </div>
              )}
              {selectedListing.buy_address && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm border-t border-slate-200 pt-3">
                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-400">매수 주소</p>
                    <p className="font-medium text-slate-700 truncate">{selectedListing.buy_address}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">매수 면적</p>
                    <p className="font-medium text-slate-700">{selectedListing.buy_area_sqm}㎡</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">희망 매수가</p>
                    <p className="font-semibold text-green-700">{formatPrice(selectedListing.buy_price ?? 0)}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 중개사 정보 */}
        <div className={sectionClass}>
          <h2 className="text-base font-bold text-slate-900 mb-6 pb-3 border-b border-slate-100">
            중개사 정보
          </h2>

          {/* 중개사무소 등록번호 + 서류 업로드 */}
          <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <div>
              <label className={labelClass}>
                중개사무소 등록번호 *
                <span className="ml-2 text-xs font-normal text-slate-400">(예: 11440-2023-00123)</span>
              </label>
              <input
                name="reg_number"
                value={agentForm.reg_number}
                onChange={handleAgentChange}
                required
                placeholder="시도코드-연도-일련번호"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                중개사무소 등록증 사진/스캔본 *
                <span className="ml-2 text-xs font-normal text-slate-400">(JPG, PNG, PDF)</span>
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                required
                onChange={(e) => setLicenseDoc(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {licenseDoc && (
                <p className="text-xs text-green-600 mt-1">선택됨: {licenseDoc.name}</p>
              )}
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700">
              제출된 서류는 딜하우스 운영팀이 검토 후 인증 처리합니다. 인증 완료 시 입찰이 매물주에게 공개됩니다.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>이름 (대표자) *</label>
              <input
                name="name"
                value={agentForm.name}
                onChange={handleAgentChange}
                required
                placeholder="홍길동"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>중개사무소명 *</label>
              <input
                name="agency_name"
                value={agentForm.agency_name}
                onChange={handleAgentChange}
                required
                placeholder="○○부동산"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>공인중개사 자격번호</label>
              <input
                name="license_number"
                value={agentForm.license_number}
                onChange={handleAgentChange}
                placeholder="제XXXXXXXX호"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>연락처 *</label>
              <input
                name="phone"
                value={agentForm.phone}
                onChange={handleAgentChange}
                required
                placeholder="010-0000-0000"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>이메일</label>
              <input
                name="email"
                type="email"
                value={agentForm.email}
                onChange={handleAgentChange}
                placeholder="agent@example.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>담당 지역 *</label>
              <input
                name="district"
                value={agentForm.district}
                onChange={handleAgentChange}
                required
                placeholder="예: 서울 강남구"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* 입찰 조건 */}
        <div className={sectionClass}>
          <h2 className="text-base font-bold text-slate-900 mb-6 pb-3 border-b border-slate-100">
            입찰 조건
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className={labelClass}>중개보수 제안 방식 *</label>
              <div className="flex gap-2 mb-3">
                {(['rate', 'fixed'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setCommissionMode(mode)
                      setBidForm((prev) => ({ ...prev, commission_rate: '', commission_amount: '' }))
                    }}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                      commissionMode === mode
                        ? 'border-[#3182F6] bg-blue-50 text-[#3182F6]'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {mode === 'rate' ? '요율 (%)' : '정액 (원)'}
                  </button>
                ))}
              </div>

              {commissionMode === 'rate' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">중개보수율 (%)</label>
                    <input
                      name="commission_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="9"
                      value={bidForm.commission_rate}
                      onChange={handleBidChange}
                      required={commissionMode === 'rate'}
                      placeholder="예: 0.4"
                      className={inputClass}
                    />
                    <p className="text-xs text-slate-400 mt-1">법정 최고 요율 이하로 입력해주세요</p>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">예상 중개보수</label>
                    <input
                      name="commission_amount"
                      type="number"
                      value={bidForm.commission_amount}
                      readOnly
                      placeholder="요율 입력 시 자동 계산"
                      className={`${inputClass} bg-slate-50 cursor-default`}
                    />
                    {selectedListing && bidForm.commission_rate && (
                      <p className="text-xs text-blue-600 mt-1 font-semibold">
                        ≈ {formatPrice(Math.round(
                          ((selectedListing.sell_price ?? selectedListing.buy_price ?? selectedListing.deposit ?? 0) *
                            parseFloat(bidForm.commission_rate || '0')) / 100
                        ))}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">중개보수 정액 (원)</label>
                  <input
                    name="commission_amount"
                    type="number"
                    value={bidForm.commission_amount}
                    onChange={handleBidChange}
                    required={commissionMode === 'fixed'}
                    placeholder="예: 1500000 (150만원)"
                    className={inputClass}
                  />
                  {bidForm.commission_amount && (
                    <p className="text-xs text-blue-600 mt-1 font-semibold">
                      = {formatPrice(parseFloat(bidForm.commission_amount))}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>서비스 설명 *</label>
              <textarea
                name="service_description"
                value={bidForm.service_description}
                onChange={handleBidChange}
                required
                rows={4}
                placeholder="제공할 서비스, 강점, 차별화 포인트 등을 자세히 적어주세요. (예: 전담 매니저 배정, 24시간 상담 가능, 계약 완료 전까지 전액 환불 보장 등)"
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>안내:</strong> 입찰된 정보는 의뢰인에게 공개됩니다. 허위 정보 입력 시 불이익이
          발생할 수 있습니다.
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 sm:flex-none px-6 py-3.5 rounded-2xl border border-slate-200 text-[#6B7684] font-semibold hover:bg-slate-50 transition-colors text-sm"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading || listings.length === 0}
            className="flex-1 sm:flex-none px-8 py-3.5 rounded-2xl bg-[#3182F6] hover:bg-blue-600 text-white font-bold transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '입찰 중...' : '입찰 제출하기'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function AgentBidPage() {
  return (
    <Suspense fallback={
      <div className="max-w-3xl mx-auto px-4 py-12 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-slate-200 rounded w-1/2 mb-8"></div>
        <div className="bg-white rounded-2xl border border-slate-100 p-8">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    }>
      <AgentBidForm />
    </Suspense>
  )
}
