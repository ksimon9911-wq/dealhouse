'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import RealTradePrice from '@/app/components/RealTradePrice'

// Kakao 우편번호 서비스 타입
declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: KakaoAddressData) => void
      }) => { open: () => void }
    }
  }
}
interface KakaoAddressData {
  roadAddress: string
  jibunAddress: string
  zonecode: string
  bcode: string         // 법정동코드 10자리
  sigunguCode: string   // 시군구코드 5자리 → LAWD_CD
  buildingName: string  // 건물명(아파트명)
  bname: string         // 법정동명
}

interface AddressMeta {
  lawdCd: string   // MOLIT API용 5자리 코드
  aptName?: string  // 아파트명 (미사용, 제거 예정)
}

const inputClass =
  'w-full border border-slate-200 rounded-xl px-4 py-3 text-[#191F28] text-sm focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent transition bg-white placeholder:text-slate-400'
const labelClass = 'block text-sm font-semibold text-[#191F28] mb-1.5'
const sectionClass = 'bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-sm'

const MAX_IMAGES = 10

interface ImageFile {
  file: File
  preview: string
}

// 주소 검색 버튼 + 입력 필드
function AddressField({
  label,
  name,
  value,
  required,
  onChange,
  onSearch,
}: {
  label: string
  name: string
  value: string
  required?: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSearch: () => void
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex gap-2">
        <input
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          placeholder="주소 검색 버튼을 눌러주세요"
          className={`${inputClass} ${value ? 'bg-slate-50 cursor-default' : ''}`}
          readOnly={!!value}
          onClick={!value ? onSearch : undefined}
        />
        <button
          type="button"
          onClick={onSearch}
          className="shrink-0 px-4 py-2.5 rounded-xl bg-[#191F28] hover:bg-[#2D3748] text-white text-sm font-semibold transition-colors whitespace-nowrap"
        >
          {value ? '재검색' : '주소 검색'}
        </button>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [images, setImages] = useState<ImageFile[]>([])
  const [buyUndecided, setBuyUndecided] = useState(false)
  const [transactionType, setTransactionType] = useState<'sale' | 'jeonse' | 'wolse'>('sale')
  const [rentalRole, setRentalRole] = useState<'offer' | 'seek'>('offer')
  const [rentalMeta, setRentalMeta] = useState<AddressMeta | null>(null)
  const [rentalAreas, setRentalAreas] = useState<number[]>([])

  const [sellMeta, setSellMeta] = useState<AddressMeta | null>(null)
  const [buyMeta, setBuyMeta] = useState<AddressMeta | null>(null)

  // 실거래가 조회 후 평형 칩 힌트
  const [sellAreas, setSellAreas] = useState<number[]>([])
  const [buyAreas, setBuyAreas] = useState<number[]>([])

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [emailExists, setEmailExists] = useState(false)
  const [emailCheckTimer, setEmailCheckTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const [form, setForm] = useState({
    user_name: '',
    user_phone: '',
    user_email: '',
    listing_type: 'sell' as 'sell' | 'buy' | 'both',
    property_type: 'apartment',
    // 전세/월세 전용
    rental_address: '',
    rental_building_name: '',
    rental_dong: '',
    rental_ho: '',
    rental_area_sqm: '',
    rental_supply_area_sqm: '',
    deposit: '',
    monthly_rent: '',
    lease_months: '24',
    sell_address: '',
    sell_building_name: '',
    sell_dong: '',
    sell_ho: '',
    sell_area_sqm: '',
    sell_supply_area_sqm: '',
    sell_price: '',
    buy_address: '',
    buy_building_name: '',
    buy_dong: '',
    buy_ho: '',
    buy_area_sqm: '',
    buy_supply_area_sqm: '',
    buy_price: '',
    move_date: '',
    description: '',
    bid_deadline: '',
  })

  const isRental = transactionType !== 'sale'
  const isSell = !isRental && (form.listing_type === 'sell' || form.listing_type === 'both')
  const isBuy = !isRental && (form.listing_type === 'buy' || form.listing_type === 'both')

  // 카카오 우편번호 스크립트 로드
  useEffect(() => {
    const id = 'kakao-postcode'
    if (document.getElementById(id)) return
    const s = document.createElement('script')
    s.id = id
    s.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
    s.async = true
    document.head.appendChild(s)
  }, [])

  // 평형 목록 조회 (areas_only 모드, 3개월)
  // 카카오 주소 검색 팝업 열기
  function openAddressSearch(field: 'sell_address' | 'buy_address' | 'rental_address') {
    if (typeof window === 'undefined' || !window.daum?.Postcode) {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }
    new window.daum.Postcode({
      oncomplete(data: KakaoAddressData) {
        const address = data.roadAddress || data.jibunAddress
        const lawdCd = data.bcode.substring(0, 5)
        const meta: AddressMeta = { lawdCd, aptName: data.buildingName }
        const buildingNameField =
          field === 'sell_address' ? 'sell_building_name' :
          field === 'buy_address' ? 'buy_building_name' : 'rental_building_name'
        setForm((prev) => ({
          ...prev,
          [field]: address,
          [buildingNameField]: data.buildingName || prev[buildingNameField as keyof typeof prev],
        }))
        if (field === 'sell_address') setSellMeta(meta)
        else if (field === 'buy_address') setBuyMeta(meta)
        else setRentalMeta(meta)
      },
    }).open()
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (e.target.name === 'user_email') {
      const val = e.target.value
      if (emailCheckTimer) clearTimeout(emailCheckTimer)
      if (!val.includes('@')) { setEmailExists(false); return }
      const timer = setTimeout(async () => {
        const res = await fetch('/api/auth/check-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: val }),
        })
        const data = await res.json()
        setEmailExists(data.exists)
      }, 600)
      setEmailCheckTimer(timer)
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const remaining = MAX_IMAGES - images.length
    const toAdd = files.slice(0, remaining).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setImages((prev) => [...prev, ...toAdd])
    e.target.value = ''
  }

  function removeImage(index: number) {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function uploadImages(listingId: string): Promise<string[]> {
    const urls: string[] = []
    for (const img of images) {
      const ext = img.file.name.split('.').pop()
      const path = `${listingId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(path, img.file, { upsert: false })
      if (uploadError) throw new Error(`이미지 업로드 실패: ${uploadError.message}`)
      const { data: urlData } = supabase.storage.from('listing-images').getPublicUrl(path)
      urls.push(urlData.publicUrl)
    }
    return urls
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!form.user_email) throw new Error('이메일을 입력해주세요.')
      if (!password) throw new Error('비밀번호를 입력해주세요.')
      if (password.length < 6) throw new Error('비밀번호는 6자 이상이어야 합니다.')
      if (password !== passwordConfirm) throw new Error('비밀번호가 일치하지 않습니다.')

      // 계정 생성 또는 기존 계정으로 로그인
      const { error: signUpError } = await supabase.auth.signUp({
        email: form.user_email,
        password,
        options: { data: { name: form.user_name, phone: form.user_phone } },
      })

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes('already registered') ||
            signUpError.message.toLowerCase().includes('already been registered')) {
          // 기존 계정이면 비밀번호 확인 후 로그인
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: form.user_email,
            password,
          })
          if (signInError) throw new Error('비밀번호가 올바르지 않습니다. 처음 매물 등록 시 설정하신 비밀번호를 입력해주세요.')
        } else {
          throw new Error(signUpError.message)
        }
      }

      // 관리번호 생성: DH-YYMMDD-XXX
      const now = new Date()
      const datePart = now.getFullYear().toString().slice(2) +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0')
      const randPart = Math.floor(Math.random() * 900 + 100)
      const listing_no = `DH-${datePart}-${randPart}`

      const payload: Record<string, unknown> = {
        listing_no,
        user_name: form.user_name,
        user_phone: form.user_phone,
        user_email: form.user_email,
        listing_type: isRental ? rentalRole : form.listing_type,
        property_type: form.property_type,
        transaction_type: transactionType,
        move_date: form.move_date || null,
        description: form.description,
        bid_deadline: form.bid_deadline,
        status: 'active',
        // 주소/면적 — 전세/월세는 sell_ 컬럼에 통합 저장
        sell_address: isRental ? form.rental_address || null : isSell ? form.sell_address : null,
        sell_building_name: isRental ? form.rental_building_name || null : isSell ? form.sell_building_name || null : null,
        sell_dong: isRental ? form.rental_dong || null : isSell ? form.sell_dong || null : null,
        sell_ho: isRental ? form.rental_ho || null : isSell ? form.sell_ho || null : null,
        sell_area_sqm: isRental
          ? (form.rental_area_sqm ? parseFloat(form.rental_area_sqm) : null)
          : (isSell && form.sell_area_sqm ? parseFloat(form.sell_area_sqm) : null),
        sell_supply_area_sqm: isRental
          ? (form.rental_supply_area_sqm ? parseFloat(form.rental_supply_area_sqm) : null)
          : (isSell && form.sell_supply_area_sqm ? parseFloat(form.sell_supply_area_sqm) : null),
        sell_price: !isRental && isSell && form.sell_price ? parseFloat(form.sell_price) * 10000 : null,
        // 매수 (매매 전용)
        buy_address: isBuy && !buyUndecided ? form.buy_address : null,
        buy_building_name: isBuy && !buyUndecided ? form.buy_building_name || null : null,
        buy_dong: isBuy && !buyUndecided ? form.buy_dong || null : null,
        buy_ho: isBuy && !buyUndecided ? form.buy_ho || null : null,
        buy_area_sqm: isBuy && !buyUndecided && form.buy_area_sqm ? parseFloat(form.buy_area_sqm) : null,
        buy_supply_area_sqm: isBuy && !buyUndecided && form.buy_supply_area_sqm ? parseFloat(form.buy_supply_area_sqm) : null,
        buy_price: isBuy && form.buy_price ? parseFloat(form.buy_price) * 10000 : null,
        // 전세/월세 전용
        deposit: isRental && form.deposit ? parseFloat(form.deposit) * 10000 : null,
        monthly_rent: transactionType === 'wolse' && form.monthly_rent ? parseFloat(form.monthly_rent) * 10000 : null,
        lease_months: isRental && form.lease_months ? parseInt(form.lease_months) : null,
      }

      const { data: listingData, error: insertError } = await supabase
        .from('listings')
        .insert([payload])
        .select()
        .single()

      if (insertError) throw new Error(insertError.message)

      if (images.length > 0) {
        const imageUrls = await uploadImages(listingData.id)
        await supabase.from('listings').update({ image_urls: imageUrls }).eq('id', listingData.id)
      }

      router.push(`/listings/${listingData.id}?owner_token=${listingData.owner_token}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
      <div className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-black text-[#191F28]">매물 등록</h1>
        <p className="text-[#6B7684] mt-2 text-sm">매물 정보를 입력하면 중개사들이 입찰을 시작합니다.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 의뢰인 정보 */}
        <div className={sectionClass}>
          <h2 className="text-base font-bold text-[#191F28] mb-6 pb-3 border-b border-slate-100">
            의뢰인 정보
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>이름 *</label>
              <input
                name="user_name"
                value={form.user_name}
                onChange={handleChange}
                required
                placeholder="홍길동"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>연락처 *</label>
              <input
                name="user_phone"
                value={form.user_phone}
                onChange={handleChange}
                required
                placeholder="010-0000-0000"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>이메일 *</label>
              <input
                name="user_email"
                type="email"
                value={form.user_email}
                onChange={handleChange}
                required
                placeholder="email@example.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                비밀번호 * <span className="font-normal text-slate-400">(6자 이상)</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className={inputClass}
              />
              {emailExists && (
                <p className="text-xs text-amber-600 mt-1 font-semibold">
                  이미 가입된 이메일입니다. 기존에 설정하신 비밀번호를 입력해주세요.
                </p>
              )}
            </div>
            {!emailExists && (
              <div>
                <label className={labelClass}>비밀번호 확인 *</label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required={!emailExists}
                  placeholder="••••••••"
                  className={`${inputClass} ${passwordConfirm && password !== passwordConfirm ? 'border-red-300 focus:ring-red-400' : ''}`}
                />
                {passwordConfirm && password !== passwordConfirm && (
                  <p className="text-xs text-red-500 mt-1">비밀번호가 일치하지 않습니다.</p>
                )}
              </div>
            )}
            <div className="sm:col-span-2 bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
              이메일과 비밀번호로 <strong>내 매물 관리</strong> 페이지에 로그인할 수 있습니다.
            </div>
          </div>
        </div>

        {/* 거래 유형 */}
        <div className={sectionClass}>
          <h2 className="text-base font-bold text-[#191F28] mb-6 pb-3 border-b border-slate-100">
            거래 유형
          </h2>

          {/* 1. 거래 종류 (매매/전세/월세) */}
          <div className="mb-5">
            <label className={labelClass}>거래 종류 *</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { v: 'sale',   label: '매매',  sub: '매도 · 매수' },
                { v: 'jeonse', label: '전세',  sub: '임대 · 임차' },
                { v: 'wolse',  label: '월세',  sub: '임대 · 임차' },
              ] as const).map((opt) => (
                <button key={opt.v} type="button"
                  onClick={() => setTransactionType(opt.v)}
                  className={`py-3 px-2 rounded-xl border text-center transition-all ${
                    transactionType === opt.v
                      ? 'border-[#3182F6] bg-blue-50 text-[#3182F6]'
                      : 'border-slate-200 text-[#6B7684] hover:border-slate-300'
                  }`}
                >
                  <div className="font-semibold text-sm">{opt.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{opt.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. 부동산 유형 (공통) */}
          <div className="mb-5">
            <label className={labelClass}>부동산 유형 *</label>
            <select name="property_type" value={form.property_type} onChange={handleChange} required className={inputClass}>
              <option value="apartment">아파트</option>
              <option value="villa">빌라</option>
              <option value="officetel">오피스텔</option>
            </select>
          </div>

          {/* 3. 매매 전용: 매도/매수 선택 */}
          {!isRental && (
            <div className="mb-5">
              <label className={labelClass}>매물 유형 *</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'sell', label: '매도', sub: '팔기' },
                  { value: 'buy',  label: '매수', sub: '사기' },
                  { value: 'both', label: '갈아타기', sub: '매도+매수' },
                ] as const).map((opt) => (
                  <button key={opt.value} type="button"
                    onClick={() => setForm((p) => ({ ...p, listing_type: opt.value }))}
                    className={`py-3 px-2 rounded-xl border text-center transition-all ${
                      form.listing_type === opt.value
                        ? 'border-[#3182F6] bg-blue-50 text-[#3182F6]'
                        : 'border-slate-200 text-[#6B7684] hover:border-slate-300'
                    }`}
                  >
                    <div className="font-semibold text-sm">{opt.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. 전세/월세 전용: 임대/임차 선택 */}
          {isRental && (
            <div className="mb-5">
              <label className={labelClass}>역할 *</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { v: 'offer', label: '임대인', sub: '집을 내놓는 분' },
                  { v: 'seek',  label: '임차인', sub: '집을 구하는 분' },
                ] as const).map((opt) => (
                  <button key={opt.v} type="button"
                    onClick={() => setRentalRole(opt.v)}
                    className={`py-3 px-3 rounded-xl border text-center transition-all ${
                      rentalRole === opt.v
                        ? 'border-[#3182F6] bg-blue-50 text-[#3182F6]'
                        : 'border-slate-200 text-[#6B7684] hover:border-slate-300'
                    }`}
                  >
                    <div className="font-semibold text-sm">{opt.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 5. 전세/월세 매물 정보 */}
          {isRental && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5 mb-4">
              <h3 className="text-sm font-bold text-[#191F28] mb-4 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#3182F6] text-white text-xs flex items-center justify-center font-bold">
                  집
                </span>
                {transactionType === 'jeonse' ? '전세' : '월세'} 매물 정보
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <AddressField
                    label="주소 *"
                    name="rental_address"
                    value={form.rental_address}
                    required={isRental}
                    onChange={handleChange}
                    onSearch={() => openAddressSearch('rental_address')}
                  />
                  {rentalMeta && (
                    <RealTradePrice lawdCd={rentalMeta.lawdCd} aptName={rentalMeta.aptName ?? ''} onAreasFound={setRentalAreas} />
                  )}
                </div>
                <div>
                  <label className={labelClass}>건물명 <span className="font-normal text-slate-400">(아파트명·빌라명)</span></label>
                  <input name="rental_building_name" value={form.rental_building_name} onChange={handleChange} placeholder="예: 마포래미안푸르지오" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>동 <span className="font-normal text-slate-400">(선택)</span></label>
                  <input name="rental_dong" value={form.rental_dong} onChange={handleChange} placeholder="예: 101동" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>호수 <span className="font-normal text-slate-400">(선택)</span></label>
                  <input name="rental_ho" value={form.rental_ho} onChange={handleChange} placeholder="예: 1502호" className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>면적</label>
                  <AreaSelector
                    areas={rentalAreas}
                    exclusiveValue={form.rental_area_sqm}
                    supplyValue={form.rental_supply_area_sqm}
                    required={isRental}
                    onExclusiveSelect={(v) => setForm((p) => ({ ...p, rental_area_sqm: v }))}
                    onSupplySelect={(v) => setForm((p) => ({ ...p, rental_supply_area_sqm: v }))}
                  />
                </div>
                <div>
                  <label className={labelClass}>보증금 (만원) *</label>
                  <input
                    name="deposit"
                    type="number"
                    value={form.deposit}
                    onChange={handleChange}
                    required={isRental}
                    placeholder={transactionType === 'jeonse' ? '예: 30000 (3억)' : '예: 5000 (5천만원)'}
                    className={inputClass}
                  />
                  {form.deposit && (
                    <p className="text-xs text-[#3182F6] mt-1 font-semibold">
                      = {formatWon(parseFloat(form.deposit) * 10000)}
                    </p>
                  )}
                </div>
                {transactionType === 'wolse' && (
                  <div>
                    <label className={labelClass}>월세 (만원/월) *</label>
                    <input
                      name="monthly_rent"
                      type="number"
                      value={form.monthly_rent}
                      onChange={handleChange}
                      required
                      placeholder="예: 100 (월 100만원)"
                      className={inputClass}
                    />
                    {form.monthly_rent && (
                      <p className="text-xs text-[#3182F6] mt-1 font-semibold">
                        = 월 {formatWon(parseFloat(form.monthly_rent) * 10000)}
                      </p>
                    )}
                  </div>
                )}
                <div>
                  <label className={labelClass}>임대 기간</label>
                  <select
                    name="lease_months"
                    value={form.lease_months}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="12">12개월 (1년)</option>
                    <option value="24">24개월 (2년)</option>
                    <option value="36">36개월 (3년)</option>
                    <option value="48">48개월 (4년)</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <RentalCommissionGuide
                    transactionType={transactionType}
                    depositManwon={form.deposit}
                    monthlyRentManwon={form.monthly_rent}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 6. 매도 정보 */}
          {isSell && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5 mb-4">
              <h3 className="text-sm font-bold text-[#191F28] mb-4 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#3182F6] text-white text-xs flex items-center justify-center font-bold">
                  팔
                </span>
                매도할 집 정보
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <AddressField
                    label="매도할 집 주소 *"
                    name="sell_address"
                    value={form.sell_address}
                    required={isSell}
                    onChange={handleChange}
                    onSearch={() => openAddressSearch('sell_address')}
                  />
                  {/* 실거래가: 주소 선택 시 표시 */}
                  {sellMeta && (
                    <RealTradePrice lawdCd={sellMeta.lawdCd} aptName={sellMeta.aptName ?? ''} onAreasFound={setSellAreas} />
                  )}
                </div>
                <div>
                  <label className={labelClass}>건물명 <span className="font-normal text-slate-400">(아파트명·빌라명)</span></label>
                  <input
                    name="sell_building_name"
                    value={form.sell_building_name}
                    onChange={handleChange}
                    placeholder="예: 마포래미안푸르지오"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>동 <span className="font-normal text-slate-400">(선택)</span></label>
                  <input
                    name="sell_dong"
                    value={form.sell_dong}
                    onChange={handleChange}
                    placeholder="예: 101동"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>호수 <span className="font-normal text-slate-400">(선택)</span></label>
                  <input
                    name="sell_ho"
                    value={form.sell_ho}
                    onChange={handleChange}
                    placeholder="예: 1502호"
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>면적</label>
                  <AreaSelector
                    areas={sellAreas}
                    exclusiveValue={form.sell_area_sqm}
                    supplyValue={form.sell_supply_area_sqm}
                    required={isSell}
                    onExclusiveSelect={(v) => setForm((prev) => ({ ...prev, sell_area_sqm: v }))}
                    onSupplySelect={(v) => setForm((prev) => ({ ...prev, sell_supply_area_sqm: v }))}
                  />
                </div>
                <div>
                  <label className={labelClass}>희망 매도 가격 (만원) *</label>
                  <input
                    name="sell_price"
                    type="number"
                    value={form.sell_price}
                    onChange={handleChange}
                    required={isSell}
                    placeholder="예: 80000 (8억)"
                    className={inputClass}
                  />
                  {form.sell_price && (
                    <p className="text-xs text-[#3182F6] mt-1 font-semibold">
                      = {formatWon(parseFloat(form.sell_price) * 10000)}
                    </p>
                  )}
                  <CommissionGuide priceManwon={form.sell_price} />
                </div>
              </div>
            </div>
          )}

          {/* 매수 정보 */}
          {isBuy && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[#191F28] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold">
                    살
                  </span>
                  매수할 집 정보
                </h3>
                {form.listing_type === 'both' && (
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={buyUndecided}
                      onChange={(e) => {
                        setBuyUndecided(e.target.checked)
                        if (e.target.checked) {
                          setForm((p) => ({ ...p, buy_address: '', buy_area_sqm: '' }))
                          setBuyMeta(null)
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-300 cursor-pointer accent-green-600"
                    />
                    <span className="text-xs text-slate-500 leading-tight">
                      아직 매수할 집이 미정이에요
                      <br />
                      <span className="text-slate-400">(예산만 입력)</span>
                    </span>
                  </label>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {!buyUndecided && (
                  <>
                    <div className="sm:col-span-2">
                      <AddressField
                        label="매수할 집 주소 *"
                        name="buy_address"
                        value={form.buy_address}
                        required={isBuy && !buyUndecided}
                        onChange={handleChange}
                        onSearch={() => openAddressSearch('buy_address')}
                      />
                      {/* 실거래가: 주소 선택 시 표시 */}
                      {buyMeta && (
                        <RealTradePrice lawdCd={buyMeta.lawdCd} aptName={buyMeta.aptName ?? ''} onAreasFound={setBuyAreas} />
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>건물명 <span className="font-normal text-slate-400">(아파트명·빌라명)</span></label>
                      <input
                        name="buy_building_name"
                        value={form.buy_building_name}
                        onChange={handleChange}
                        placeholder="예: 래미안블레스티지"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>동 <span className="font-normal text-slate-400">(선택)</span></label>
                      <input
                        name="buy_dong"
                        value={form.buy_dong}
                        onChange={handleChange}
                        placeholder="예: 102동"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>호수 <span className="font-normal text-slate-400">(선택)</span></label>
                      <input
                        name="buy_ho"
                        value={form.buy_ho}
                        onChange={handleChange}
                        placeholder="예: 801호"
                        className={inputClass}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>면적</label>
                      <AreaSelector
                        areas={buyAreas}
                        exclusiveValue={form.buy_area_sqm}
                        supplyValue={form.buy_supply_area_sqm}
                        required={isBuy && !buyUndecided}
                        onExclusiveSelect={(v) => setForm((prev) => ({ ...prev, buy_area_sqm: v }))}
                        onSupplySelect={(v) => setForm((prev) => ({ ...prev, buy_supply_area_sqm: v }))}
                      />
                    </div>
                  </>
                )}
                <div className={buyUndecided ? 'sm:col-span-2' : ''}>
                  <label className={labelClass}>
                    희망 매수 {buyUndecided ? '예산' : '가격'} (만원) *
                  </label>
                  <input
                    name="buy_price"
                    type="number"
                    value={form.buy_price}
                    onChange={handleChange}
                    required={isBuy}
                    placeholder="예: 100000 (10억)"
                    className={inputClass}
                  />
                  {form.buy_price && (
                    <p className="text-xs text-emerald-600 mt-1 font-semibold">
                      = {formatWon(parseFloat(form.buy_price) * 10000)}
                    </p>
                  )}
                  <CommissionGuide priceManwon={form.buy_price} />
                </div>
              </div>
              {buyUndecided && (
                <p className="mt-3 text-xs text-slate-400 flex items-center gap-1.5">
                  <svg
                    className="w-3.5 h-3.5 text-green-500 shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  주소와 면적은 나중에 중개사와 상담하며 결정할 수 있어요.
                </p>
              )}
            </div>
          )}
        </div>

        {/* 일정 + 설명 */}
        <div className={sectionClass}>
          <h2 className="text-base font-bold text-[#191F28] mb-6 pb-3 border-b border-slate-100">
            일정 및 기타
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>희망 이사일</label>
              <input
                name="move_date"
                type="date"
                value={form.move_date}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>입찰 마감일 *</label>
              <input
                name="bid_deadline"
                type="date"
                value={form.bid_deadline}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>추가 설명</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder="매물에 대한 추가 정보, 특이사항, 희망 사항 등을 적어주세요."
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>
        </div>

        {/* 사진 업로드 */}
        <div className={sectionClass}>
          <div className="flex items-center justify-between mb-1 pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">사진 업로드</h2>
            <span className="text-xs text-slate-400">선택사항 · 최대 {MAX_IMAGES}장</span>
          </div>
          <p className="text-xs text-slate-400 mb-5">
            매물 사진을 올리면 중개사가 더 정확하게 검토할 수 있습니다.
          </p>

          {images.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-200 hover:border-[#3182F6]/40 rounded-2xl py-8 flex flex-col items-center gap-2 text-slate-400 hover:text-[#3182F6] transition-colors mb-4"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 16v-8m-4 4h8M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-medium">클릭하여 사진 추가</span>
              <span className="text-xs">JPG, PNG, WEBP · 최대 10MB</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageSelect}
          />

          {images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {images.map((img, index) => (
                <div key={index} className="relative aspect-square group">
                  <Image
                    src={img.preview}
                    alt={`업로드 이미지 ${index + 1}`}
                    fill
                    className="object-cover rounded-xl border border-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/70 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    ×
                  </button>
                  {index === 0 && (
                    <span className="absolute bottom-1 left-1 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-md font-medium">
                      대표
                    </span>
                  )}
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-slate-200 hover:border-[#3182F6]/40 flex items-center justify-center text-slate-300 hover:text-[#3182F6] transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}
          {images.length > 0 && (
            <p className="text-xs text-slate-400 mt-3">
              {images.length}/{MAX_IMAGES}장 · 첫 번째 사진이 대표 이미지로 사용됩니다
            </p>
          )}
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
            disabled={loading}
            className="flex-1 sm:flex-none px-8 py-3.5 rounded-2xl bg-[#3182F6] hover:bg-blue-600 text-white font-bold transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                {images.length > 0 ? '사진 업로드 중...' : '등록 중...'}
              </span>
            ) : (
              '매물 등록하기'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

// ㎡ ↔ 평 연동 면적 입력
function AreaPairInput({
  value,
  onChange,
  required,
  placeholder = '84.99',
}: {
  value: string
  onChange: (v: string) => void
  required?: boolean
  placeholder?: string
}) {
  const cls =
    'w-full border border-slate-200 rounded-xl px-4 py-3 text-[#191F28] text-sm focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent transition bg-white placeholder:text-slate-400 pr-10'
  const sqm = parseFloat(value)
  const pyeong = sqm > 0 ? Math.round((sqm / 3.3058) * 10) / 10 : 0
  const pyPlaceholder = String(Math.round((parseFloat(placeholder) / 3.3058) * 10) / 10)

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="relative">
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          className={cls}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none font-medium">㎡</span>
      </div>
      <div className="relative">
        <input
          type="number"
          step="0.1"
          value={sqm > 0 ? pyeong : ''}
          onChange={(e) => {
            const py = parseFloat(e.target.value)
            if (!isNaN(py) && py > 0) onChange(String(Math.round(py * 3.3058 * 100) / 100))
            else onChange('')
          }}
          placeholder={pyPlaceholder}
          className={cls}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none font-medium">평</span>
      </div>
    </div>
  )
}

// 전용/공급 면적 선택 컴포넌트
interface AreaSelectorProps {
  areas: number[]
  exclusiveValue: string
  supplyValue: string
  required?: boolean
  onExclusiveSelect: (v: string) => void
  onSupplySelect: (v: string) => void
}

function AreaSelector({ areas, exclusiveValue, supplyValue, required, onExclusiveSelect, onSupplySelect }: AreaSelectorProps) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold text-[#6B7684] mb-1.5">
          전용면적 <span className="text-red-400">*</span>
        </p>
        <AreaPairInput value={exclusiveValue} onChange={onExclusiveSelect} required={required} placeholder="84.99" />
        {areas.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-slate-400 mb-1.5">최근 2년 실거래 평형 — 클릭해서 선택</p>
            <div className="flex flex-wrap gap-1.5">
              {areas.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => onExclusiveSelect(String(a))}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors font-medium ${
                    exclusiveValue === String(a)
                      ? 'bg-[#3182F6] text-white border-[#3182F6]'
                      : 'bg-white text-[#3182F6] border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  {a}㎡ ({Math.round(a / 3.305)}평)
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold text-[#6B7684] mb-1.5">
          공급면적 <span className="font-normal text-slate-400">(선택)</span>
        </p>
        <AreaPairInput value={supplyValue} onChange={onSupplySelect} placeholder="113.41" />
      </div>
    </div>
  )
}

// 2021년 개정 법정 중개보수 상한 계산 (매매 기준, 원 단위 입력)
function getLegalCommission(priceWon: number): { rate: number; label: string; commission: number } {
  const m = priceWon / 10000 // 만원
  let rate: number
  let maxAmt: number | null = null

  if (m < 5000)        { rate = 0.006; maxAmt = 25 }       // 0.6%, 한도 25만원
  else if (m < 20000)  { rate = 0.005; maxAmt = 80 }       // 0.5%, 한도 80만원
  else if (m < 90000)  { rate = 0.004; maxAmt = null }     // 0.4%
  else if (m < 120000) { rate = 0.005; maxAmt = null }     // 0.5%
  else if (m < 150000) { rate = 0.006; maxAmt = null }     // 0.6%
  else                 { rate = 0.007; maxAmt = null }     // 0.7%

  const raw = Math.round((priceWon * rate) / 10000)  // 만원 단위
  const commission = maxAmt !== null ? Math.min(raw, maxAmt) : raw
  const label = maxAmt !== null ? `${(rate * 100).toFixed(1)}% (한도 ${maxAmt}만원)` : `${(rate * 100).toFixed(1)}%`
  return { rate, label, commission }
}

function CommissionGuide({ priceManwon }: { priceManwon: string }) {
  const price = parseFloat(priceManwon)
  if (!price || price <= 0) return null
  const { label, commission } = getLegalCommission(price * 10000)
  const commissionStr =
    commission >= 10000
      ? `${Math.floor(commission / 10000)}억 ${(commission % 10000).toLocaleString()}만원`
      : `${commission.toLocaleString()}만원`
  return (
    <div className="mt-2 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 flex items-start gap-2.5">
      <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="flex-1">
        <p className="text-xs text-amber-700 font-semibold">
          법정 중개보수 상한 ({label}) → 최대 <span className="text-amber-900">{commissionStr}</span>
        </p>
        <p className="text-xs text-amber-600 mt-0.5">
          딜하우스에서 중개사들이 경쟁 입찰하면 이보다 더 저렴하게 받을 수 있어요 💡
        </p>
      </div>
    </div>
  )
}

function formatWon(amount: number) {
  if (amount >= 100000000) {
    const eok = Math.floor(amount / 100000000)
    const man = Math.floor((amount % 100000000) / 10000)
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`
  }
  return `${(amount / 10000).toLocaleString()}만원`
}

/** 전세/월세 중개수수료 상한 계산 */
function calcRentalBrokerage(transactionType: string, depositManwon: string, monthlyRentManwon: string) {
  const deposit = (parseFloat(depositManwon) || 0) * 10000
  const monthly = (parseFloat(monthlyRentManwon) || 0) * 10000
  // 월세 환산: 보증금 + 월세 × 100
  const basis = transactionType === 'wolse' ? deposit + monthly * 100 : deposit
  const m = basis / 10000
  let rate: number, maxAmt: number | null, label: string
  if (m < 5000)        { rate = 0.005; maxAmt = 200000;  label = '0.5% (한도 20만원)' }
  else if (m < 10000)  { rate = 0.004; maxAmt = 300000;  label = '0.4% (한도 30만원)' }
  else if (m < 30000)  { rate = 0.003; maxAmt = null;    label = '0.3%' }
  else if (m < 60000)  { rate = 0.004; maxAmt = null;    label = '0.4%' }
  else                 { rate = 0.008; maxAmt = null;    label = '0.8%' }
  const raw = Math.round(basis * rate)
  const commission = maxAmt !== null ? Math.min(raw, maxAmt) : raw
  return { commission, label, basis }
}

function RentalCommissionGuide({
  transactionType,
  depositManwon,
  monthlyRentManwon,
}: {
  transactionType: string
  depositManwon: string
  monthlyRentManwon: string
}) {
  const deposit = parseFloat(depositManwon)
  if (!deposit || deposit <= 0) return null
  const { commission, label, basis } = calcRentalBrokerage(transactionType, depositManwon, monthlyRentManwon)
  const commStr = commission >= 10000
    ? `${Math.floor(commission / 10000).toLocaleString()}만원`
    : `${commission.toLocaleString()}원`
  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 flex items-start gap-2.5">
      <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <p className="text-xs text-amber-700 font-semibold">
          법정 중개보수 상한 ({label}) → 최대 <span className="text-amber-900">{commStr}</span>
        </p>
        {transactionType === 'wolse' && (
          <p className="text-xs text-amber-600 mt-0.5">
            환산가액 {formatWon(basis)} 기준 (보증금 + 월세×100)
          </p>
        )}
        <p className="text-xs text-amber-600 mt-0.5">
          딜하우스에서 중개사들이 경쟁 입찰하면 이보다 더 저렴하게 받을 수 있어요 💡
        </p>
      </div>
    </div>
  )
}
