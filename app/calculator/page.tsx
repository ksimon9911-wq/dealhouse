'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

// ─── 전세/월세 중개수수료 ────────────────────────────────────────
function calcRentalBrokerage(txType: string, deposit: number, monthly: number) {
  const basis = txType === 'wolse' ? deposit + monthly * 100 : deposit
  const m = basis / 10_000
  let rate: number, maxAmt: number | null, label: string
  if (m < 5_000)       { rate = 0.005; maxAmt = 200_000;  label = '0.5% (한도 20만원)' }
  else if (m < 10_000) { rate = 0.004; maxAmt = 300_000;  label = '0.4% (한도 30만원)' }
  else if (m < 30_000) { rate = 0.003; maxAmt = null;     label = '0.3%' }
  else if (m < 60_000) { rate = 0.004; maxAmt = null;     label = '0.4%' }
  else                 { rate = 0.008; maxAmt = null;     label = '0.8%' }
  const raw = Math.round(basis * rate)
  return { commission: maxAmt !== null ? Math.min(raw, maxAmt) : raw, label, basis }
}

// ─── 계산 로직 ────────────────────────────────────────────────

/** 취득세율 (1주택 기준) */
function getAcquisitionTaxRate(price: number, homeCount: number): number {
  if (homeCount >= 3) return 0.12
  if (homeCount === 2) return 0.08
  if (price <= 600_000_000) return 0.01
  if (price <= 900_000_000) return 0.01 + ((price - 600_000_000) / 300_000_000) * 0.02
  return 0.03
}

/** 취득세 + 지방교육세 + 농특세 */
function calcAcquisitionTax(price: number, homeCount: number, areaSqm: number) {
  const rate = getAcquisitionTaxRate(price, homeCount)
  const base = price * rate
  const educationTax = base * 0.1
  const ruralTax = areaSqm > 85 ? base * 0.2 : 0
  return {
    base: Math.round(base),
    educationTax: Math.round(educationTax),
    ruralTax: Math.round(ruralTax),
    total: Math.round(base + educationTax + ruralTax),
    rate,
  }
}

/** 중개수수료 상한 */
function calcBrokerage(price: number): { rate: number; label: string; max: number } {
  const m = price / 10_000
  let rate: number, maxAmt: number | null, label: string
  if (m < 5_000)         { rate = 0.006; maxAmt = 250_000;   label = '0.6% (한도 25만원)' }
  else if (m < 20_000)   { rate = 0.005; maxAmt = 800_000;   label = '0.5% (한도 80만원)' }
  else if (m < 90_000)   { rate = 0.004; maxAmt = null;      label = '0.4%' }
  else if (m < 120_000)  { rate = 0.005; maxAmt = null;      label = '0.5%' }
  else if (m < 150_000)  { rate = 0.006; maxAmt = null;      label = '0.6%' }
  else                   { rate = 0.007; maxAmt = null;      label = '0.7%' }
  const raw = Math.round(price * rate)
  const max = maxAmt !== null ? Math.min(raw, maxAmt) : raw
  return { rate, label, max }
}

/** 인지세 (매수인 부담분 = 50%) */
function calcStampDuty(price: number): number {
  if (price <= 100_000_000)  return 0
  if (price <= 1_000_000_000) return 75_000   // 15만원 × 50%
  return 175_000  // 35만원 × 50%
}

/** 법무사 비용 (등기 대행 예상액) */
function calcLegalFee(price: number): { fee: number; note: string } {
  if (price < 300_000_000)        return { fee: 350_000, note: '약 35만원 (예상)' }
  if (price < 600_000_000)        return { fee: 450_000, note: '약 45만원 (예상)' }
  if (price < 1_000_000_000)      return { fee: 550_000, note: '약 55만원 (예상)' }
  return { fee: 700_000, note: '약 70만원 (예상)' }
}

/** 국민주택채권 할인손실 (즉시 매각 기준 약 4% 손실) */
function calcHousingBond(price: number, areaSqm: number, propertyType: string): { purchase: number; loss: number } {
  if (propertyType === 'officetel') {
    const purchase = price * 0.005
    return { purchase: Math.round(purchase), loss: Math.round(purchase * 0.04) }
  }
  const rate = areaSqm <= 85 ? 0.01 : 0.013
  const purchase = price * rate
  return { purchase: Math.round(purchase), loss: Math.round(purchase * 0.04) }
}

// ─── 포맷 유틸 ────────────────────────────────────────────────

function formatWon(n: number): string {
  if (n === 0) return '0원'
  if (n >= 100_000_000) {
    const eok = Math.floor(n / 100_000_000)
    const man = Math.floor((n % 100_000_000) / 10_000)
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`
  }
  if (n >= 10_000) return `${Math.floor(n / 10_000).toLocaleString()}만원`
  return `${n.toLocaleString()}원`
}

function formatRate(r: number): string {
  return `${(r * 100).toFixed(1)}%`
}

// ─── 컴포넌트 ────────────────────────────────────────────────

const inputCls =
  'w-full border border-slate-200 rounded-xl px-4 py-3 text-[#191F28] text-sm focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent transition bg-white placeholder:text-slate-400'

export default function CalculatorPage() {
  const [mode, setMode] = useState<'sale' | 'jeonse' | 'wolse'>('sale')

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:py-14">
      <div className="mb-8">
        <p className="text-[#3182F6] font-bold text-sm mb-1">부동산 거래 비용 계산기</p>
        <h1 className="text-2xl sm:text-3xl font-black text-[#191F28]">
          거래 전 총 비용을 미리 확인하세요
        </h1>
        <p className="text-[#6B7684] mt-2 text-sm">
          매매·전세·월세 거래 시 발생하는 모든 비용을 한눈에 계산합니다.
        </p>
      </div>

      {/* 거래 종류 탭 */}
      <div className="flex gap-1 mb-8 bg-slate-100 rounded-2xl p-1 w-fit">
        {([
          { v: 'sale',   label: '매매' },
          { v: 'jeonse', label: '전세' },
          { v: 'wolse',  label: '월세' },
        ] as const).map((opt) => (
          <button
            key={opt.v}
            onClick={() => setMode(opt.v)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              mode === opt.v
                ? 'bg-white text-[#191F28] shadow-sm'
                : 'text-[#6B7684] hover:text-[#191F28]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {mode === 'sale'   && <SaleCalculator />}
      {mode === 'jeonse' && <RentalCalculator txType="jeonse" />}
      {mode === 'wolse'  && <RentalCalculator txType="wolse" />}
    </div>
  )
}

// ─── 매매 계산기 (기존) ────────────────────────────────────────
function SaleCalculator() {
  const [priceManwon, setPriceManwon] = useState('')
  const [areaSqm, setAreaSqm] = useState('')
  const [propertyType, setPropertyType] = useState<'apartment' | 'villa' | 'officetel'>('apartment')
  const [homeCount, setHomeCount] = useState<1 | 2 | 3>(1)
  const [txType, setTxType] = useState<'buy' | 'sell' | 'both'>('buy')

  const price = (parseFloat(priceManwon) || 0) * 10_000
  const area = parseFloat(areaSqm) || 60
  const hasPrice = price > 0

  const acq = useMemo(() => calcAcquisitionTax(price, homeCount, area), [price, homeCount, area])
  const brokerage = useMemo(() => calcBrokerage(price), [price])
  const stamp = useMemo(() => calcStampDuty(price), [price])
  const legal = useMemo(() => calcLegalFee(price), [price])
  const bond = useMemo(() => calcHousingBond(price, area, propertyType), [price, area, propertyType])

  const isBuy = txType === 'buy' || txType === 'both'
  const isSell = txType === 'sell' || txType === 'both'

  // 총 비용
  const buyerTotal = isBuy
    ? acq.total + brokerage.max + stamp + legal.fee + bond.loss
    : 0
  const sellerTotal = isSell ? brokerage.max + stamp : 0
  const grandTotal = buyerTotal + sellerTotal

  // DealHouse 절감 (중개수수료 30~50% 절감 가정)
  const brokerageCount = isBuy && isSell ? 2 : 1
  const savingsLow = Math.round(brokerage.max * brokerageCount * 0.3)
  const savingsHigh = Math.round(brokerage.max * brokerageCount * 0.5)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6">
        {/* ── 입력 패널 ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5 h-fit">
          <h2 className="text-base font-bold text-[#191F28] pb-3 border-b border-slate-100">
            거래 정보 입력
          </h2>

          {/* 거래 유형 */}
          <div>
            <label className="block text-sm font-semibold text-[#191F28] mb-2">거래 유형</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { v: 'buy', label: '매수', sub: '살 때' },
                { v: 'sell', label: '매도', sub: '팔 때' },
                { v: 'both', label: '갈아타기', sub: '매도+매수' },
              ] as const).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setTxType(opt.v)}
                  className={`py-2.5 px-2 rounded-xl border text-center transition-all ${
                    txType === opt.v
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

          {/* 매매가격 */}
          <div>
            <label className="block text-sm font-semibold text-[#191F28] mb-2">
              매매가격 <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={priceManwon}
                onChange={(e) => setPriceManwon(e.target.value)}
                placeholder="예: 80000 (8억)"
                className={`${inputCls} pr-14`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium pointer-events-none">만원</span>
            </div>
            {price > 0 && (
              <p className="text-xs text-[#3182F6] mt-1 font-semibold">{formatWon(price)}</p>
            )}
          </div>

          {/* 부동산 유형 */}
          <div>
            <label className="block text-sm font-semibold text-[#191F28] mb-2">부동산 유형</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { v: 'apartment', label: '아파트' },
                { v: 'villa', label: '빌라' },
                { v: 'officetel', label: '오피스텔' },
              ] as const).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setPropertyType(opt.v)}
                  className={`py-2 rounded-xl border text-sm font-semibold transition-all ${
                    propertyType === opt.v
                      ? 'border-[#3182F6] bg-blue-50 text-[#3182F6]'
                      : 'border-slate-200 text-[#6B7684] hover:border-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 전용면적 */}
          <div>
            <label className="block text-sm font-semibold text-[#191F28] mb-2">
              전용면적
              <span className="font-normal text-slate-400 ml-1">(농특세·채권 계산에 사용)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={areaSqm}
                onChange={(e) => setAreaSqm(e.target.value)}
                placeholder="84.99"
                className={`${inputCls} pr-12`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none font-medium">㎡</span>
            </div>
            {area > 0 && (
              <p className="text-xs text-slate-400 mt-1">
                약 {Math.round((area / 3.3058) * 10) / 10}평
                {area > 85 && <span className="ml-2 text-amber-600 font-semibold">· 85㎡ 초과 → 농특세 부과</span>}
              </p>
            )}
          </div>

          {/* 주택 보유 수 (취득세 산정) */}
          {isBuy && (
            <div>
              <label className="block text-sm font-semibold text-[#191F28] mb-2">
                현재 보유 주택 수
                <span className="font-normal text-slate-400 ml-1">(취득 후 기준)</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { v: 1, label: '1주택', sub: '무주택 → 1채' },
                  { v: 2, label: '2주택', sub: '1채 → 2채' },
                  { v: 3, label: '3주택+', sub: '2채+ → 3채+' },
                ] as const).map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setHomeCount(opt.v)}
                    className={`py-2.5 px-2 rounded-xl border text-center transition-all ${
                      homeCount === opt.v
                        ? 'border-[#3182F6] bg-blue-50 text-[#3182F6]'
                        : 'border-slate-200 text-[#6B7684] hover:border-slate-300'
                    }`}
                  >
                    <div className="font-semibold text-xs">{opt.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── 결과 패널 ── */}
        <div className="space-y-4">
          {!hasPrice ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-slate-500 font-semibold">매매가격을 입력하면</p>
              <p className="text-xs text-slate-400 mt-1">거래 비용 내역이 자동으로 계산됩니다.</p>
            </div>
          ) : (
            <>
              {/* 매수인 비용 */}
              {isBuy && (
                <CostSection
                  title="매수인 비용"
                  color="blue"
                  items={[
                    {
                      label: '취득세',
                      sub: `취득세 ${formatRate(acq.rate)}`,
                      amount: acq.base,
                    },
                    {
                      label: '지방교육세',
                      sub: '취득세의 10%',
                      amount: acq.educationTax,
                    },
                    ...(acq.ruralTax > 0 ? [{
                      label: '농어촌특별세',
                      sub: '전용 85㎡ 초과 · 취득세의 20%',
                      amount: acq.ruralTax,
                    }] : []),
                    {
                      label: '중개수수료',
                      sub: `법정 상한 ${brokerage.label}`,
                      amount: brokerage.max,
                      highlight: true,
                    },
                    {
                      label: '인지세',
                      sub: '매수인 부담분 50%',
                      amount: stamp,
                    },
                    {
                      label: '법무사 비용',
                      sub: legal.note,
                      amount: legal.fee,
                    },
                    {
                      label: '국민주택채권 할인손실',
                      sub: `매입 후 즉시 매각 기준 (약 4% 손실)`,
                      amount: bond.loss,
                    },
                  ]}
                  total={buyerTotal}
                />
              )}

              {/* 매도인 비용 */}
              {isSell && (
                <CostSection
                  title="매도인 비용"
                  color="green"
                  items={[
                    {
                      label: '중개수수료',
                      sub: `법정 상한 ${brokerage.label}`,
                      amount: brokerage.max,
                      highlight: true,
                    },
                    {
                      label: '인지세',
                      sub: '매도인 부담분 50%',
                      amount: stamp,
                    },
                    {
                      label: '양도소득세',
                      sub: '보유기간·거주기간에 따라 다름 → 별도 세무 상담 필요',
                      amount: null,
                    },
                  ]}
                  total={sellerTotal}
                />
              )}

              {/* 총합 */}
              <div className="bg-[#0C1B33] rounded-2xl p-5 text-white">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-300">총 예상 비용 합계</span>
                  <span className="text-2xl font-black">{formatWon(grandTotal)}</span>
                </div>
                <p className="text-xs text-slate-500">
                  ※ 양도소득세 제외 / 실제 법무사 비용·채권 할인율은 시기에 따라 변동될 수 있습니다.
                </p>
              </div>

              {/* DealHouse 절감 강조 */}
              <div className="bg-gradient-to-br from-blue-50 to-sky-50 border border-[#3182F6]/20 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-[#3182F6] rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-[#191F28] text-sm mb-1">
                      중개수수료, DealHouse로 낮출 수 있어요
                    </p>
                    <p className="text-xs text-[#6B7684] leading-relaxed mb-3">
                      위 계산은 <strong>법정 최고 요율</strong> 기준입니다.
                      DealHouse에서 중개사들이 직접 경쟁 입찰하면
                      실제 수수료를 <strong className="text-[#3182F6]">30~50% 낮출 수 있습니다.</strong>
                    </p>
                    <div className="bg-white rounded-xl p-3.5 mb-3 border border-[#3182F6]/15">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-slate-500">법정 최고 중개수수료{isBuy && isSell ? ' (매도+매수)' : ''}</span>
                        <span className="text-sm font-bold text-slate-700 line-through">
                          {formatWon(brokerage.max * brokerageCount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#3182F6]">DealHouse 이용 시 예상 절감액</span>
                        <span className="text-base font-black text-emerald-600">
                          -{formatWon(savingsLow)} ~ -{formatWon(savingsHigh)}
                        </span>
                      </div>
                    </div>
                    <Link
                      href="/register"
                      className="flex items-center justify-center gap-2 bg-[#3182F6] hover:bg-blue-600 text-white font-bold px-4 py-3 rounded-xl text-sm transition-colors"
                    >
                      무료로 매물 등록하고 절약하기 →
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        {/* 주의사항 */}
        <div className="lg:col-span-2 mt-2 bg-slate-50 rounded-2xl p-5 text-xs text-slate-400 space-y-1 leading-relaxed">
          <p className="font-semibold text-slate-500">계산 기준 및 주의사항</p>
          <p>• 취득세: 1주택자 기준, 조정대상지역 여부 미반영 (2주택 8%, 3주택+ 12% 적용)</p>
          <p>• 중개수수료: 2021년 개정 법정 최고 요율 기준 (실제 협의에 따라 낮아질 수 있음)</p>
          <p>• 법무사 비용: 등기 대행 수수료 예상액으로 실비는 다를 수 있음</p>
          <p>• 국민주택채권 할인손실: 즉시 매각 기준 약 4% 손실로 추산 (금리에 따라 변동)</p>
          <p>• 양도소득세는 보유기간·거주기간·다주택 여부 등 복잡한 변수가 있어 세무사 상담을 권장합니다</p>
        </div>
      </div>
  )
}

// ─── 전세/월세 계산기 ──────────────────────────────────────────
function RentalCalculator({ txType }: { txType: 'jeonse' | 'wolse' }) {
  const [depositManwon, setDeposit] = useState('')
  const [monthlyManwon, setMonthly] = useState('')

  const deposit = (parseFloat(depositManwon) || 0) * 10_000
  const monthly = (parseFloat(monthlyManwon) || 0) * 10_000
  const hasDeposit = deposit > 0

  const brokerage = useMemo(() => calcRentalBrokerage(txType, deposit, monthly), [txType, deposit, monthly])

  // 확정일자: 인터넷등기소 600원, 주민센터 무료
  const confirmDate = 600
  // 전세보증보험 (HUG): 보증금의 약 0.128% (연), 2년 기준
  const insuranceFee = txType === 'jeonse' ? Math.round(deposit * 0.00128 * 2) : 0

  const total = brokerage.commission + confirmDate + insuranceFee

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6">
      {/* 입력 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5 h-fit">
        <h2 className="text-base font-bold text-[#191F28] pb-3 border-b border-slate-100">
          {txType === 'jeonse' ? '전세' : '월세'} 정보 입력
        </h2>
        <div>
          <label className="block text-sm font-semibold text-[#191F28] mb-2">
            보증금 <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input type="number" value={depositManwon} onChange={(e) => setDeposit(e.target.value)}
              placeholder={txType === 'jeonse' ? '예: 30000 (3억)' : '예: 5000 (5천만원)'}
              className={`${inputCls} pr-14`} />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium pointer-events-none">만원</span>
          </div>
          {deposit > 0 && <p className="text-xs text-[#3182F6] mt-1 font-semibold">{formatWon(deposit)}</p>}
        </div>
        {txType === 'wolse' && (
          <div>
            <label className="block text-sm font-semibold text-[#191F28] mb-2">월세</label>
            <div className="relative">
              <input type="number" value={monthlyManwon} onChange={(e) => setMonthly(e.target.value)}
                placeholder="예: 80 (월 80만원)"
                className={`${inputCls} pr-14`} />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium pointer-events-none">만원/월</span>
            </div>
            {monthly > 0 && <p className="text-xs text-[#3182F6] mt-1 font-semibold">월 {formatWon(monthly)}</p>}
          </div>
        )}
      </div>

      {/* 결과 */}
      <div className="space-y-4">
        {!hasDeposit ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
            <p className="text-sm text-slate-500 font-semibold">보증금을 입력하면</p>
            <p className="text-xs text-slate-400 mt-1">거래 비용 내역이 자동으로 계산됩니다.</p>
          </div>
        ) : (
          <>
            <CostSection
              title={`${txType === 'jeonse' ? '전세' : '월세'} 임차인 비용`}
              color="blue"
              items={[
                {
                  label: '중개수수료',
                  sub: `법정 상한 ${brokerage.label}${txType === 'wolse' ? ` · 환산가액 ${formatWon(brokerage.basis)} 기준` : ''}`,
                  amount: brokerage.commission,
                  highlight: true,
                },
                ...(txType === 'jeonse' ? [{
                  label: '전세보증보험',
                  sub: 'HUG 기준 · 보증금의 약 0.128%/년 × 2년 (선택사항)',
                  amount: insuranceFee,
                }] : []),
                {
                  label: '확정일자',
                  sub: '인터넷등기소 기준 (주민센터는 무료)',
                  amount: confirmDate,
                },
              ]}
              total={total}
            />
            <div className="bg-[#0C1B33] rounded-2xl p-5 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-300">총 예상 비용</span>
                <span className="text-2xl font-black">{formatWon(total)}</span>
              </div>
              <p className="text-xs text-slate-500">※ 전세보증보험 가입 시 보험료 포함</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-sky-50 border border-[#3182F6]/20 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-[#3182F6] rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-[#191F28] text-sm mb-1">중개수수료, DealHouse로 낮출 수 있어요</p>
                  <div className="bg-white rounded-xl p-3 mb-3 border border-[#3182F6]/15">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-500">법정 최고 중개수수료</span>
                      <span className="text-sm font-bold text-slate-700 line-through">{formatWon(brokerage.commission)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#3182F6]">DealHouse 이용 시 예상 절감</span>
                      <span className="text-base font-black text-emerald-600">
                        -{formatWon(Math.round(brokerage.commission * 0.3))} ~ -{formatWon(Math.round(brokerage.commission * 0.5))}
                      </span>
                    </div>
                  </div>
                  <Link href="/register"
                    className="flex items-center justify-center gap-2 bg-[#3182F6] hover:bg-blue-600 text-white font-bold px-4 py-3 rounded-xl text-sm transition-colors">
                    무료로 매물 등록하고 절약하기 →
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 주의사항 */}
      <div className="lg:col-span-2 mt-2 bg-slate-50 rounded-2xl p-5 text-xs text-slate-400 space-y-1 leading-relaxed">
        <p className="font-semibold text-slate-500">계산 기준 및 주의사항</p>
        <p>• 중개수수료: 2021년 개정 법정 최고 요율 기준</p>
        {txType === 'wolse' && <p>• 월세 환산가액 = 보증금 + 월세 × 100으로 계산합니다</p>}
        {txType === 'jeonse' && <p>• 전세보증보험(HUG): 가입 여부와 보증 범위에 따라 보험료가 달라질 수 있습니다</p>}
        <p>• 임대인의 중개수수료도 동일 요율이 적용됩니다 (양측 각각 부담)</p>
      </div>
    </div>
  )
}

// ─── 비용 섹션 컴포넌트 ───────────────────────────────────────

interface CostItem {
  label: string
  sub: string
  amount: number | null
  highlight?: boolean
}

function CostSection({
  title,
  color,
  items,
  total,
}: {
  title: string
  color: 'blue' | 'green'
  items: CostItem[]
  total: number
}) {
  const accent = color === 'blue' ? '#3182F6' : '#059669'
  const bgLight = color === 'blue' ? 'bg-blue-50' : 'bg-emerald-50'
  const textAccent = color === 'blue' ? 'text-[#3182F6]' : 'text-emerald-700'
  const borderAccent = color === 'blue' ? 'border-blue-100' : 'border-emerald-100'

  return (
    <div className={`bg-white rounded-2xl border ${borderAccent} shadow-sm overflow-hidden`}>
      <div className={`${bgLight} px-5 py-3 flex items-center justify-between`}>
        <span className={`text-sm font-bold ${textAccent}`}>{title}</span>
        <span className={`text-sm font-black ${textAccent}`}>{formatWon(total)}</span>
      </div>
      <div className="divide-y divide-slate-50">
        {items.map((item, i) => (
          <div key={i} className={`px-5 py-3 flex items-center justify-between gap-4 ${item.highlight ? 'bg-amber-50/50' : ''}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#191F28] whitespace-nowrap">{item.label}</span>
                {item.highlight && (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">절감 가능</span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">{item.sub}</p>
            </div>
            <div className="text-right shrink-0">
              {item.amount === null ? (
                <span className="text-xs text-slate-400 italic">별도 계산</span>
              ) : item.amount === 0 ? (
                <span className="text-sm font-semibold text-slate-400">해당없음</span>
              ) : (
                <span className={`text-sm font-bold ${item.highlight ? 'text-amber-700' : 'text-[#191F28]'}`}>
                  {formatWon(item.amount)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
