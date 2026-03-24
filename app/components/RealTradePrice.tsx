'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'

interface Trade {
  date: string
  ym: string   // YYYYMM — 기간 필터용
  price: number
  area: number
  floor: string
  aptName: string
}

interface Props {
  lawdCd: string
  aptName: string
  onAreasFound?: (areas: number[]) => void
}

function fmtManwon(manwon: number): string {
  if (manwon >= 10000) {
    const eok = Math.floor(manwon / 10000)
    const man = manwon % 10000
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만` : `${eok}억`
  }
  return `${manwon.toLocaleString()}만`
}

// YYYYMM 기준 최근 N개월 Set
function makeYmSet(n: number): Set<string> {
  const now = new Date()
  const set = new Set<string>()
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    set.add(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return set
}

type Status = 'idle' | 'loading' | 'ok' | 'empty' | 'error'

const PAGE_SIZE = 5
const PAGE_MORE = 10

export default function RealTradePrice({ lawdCd, aptName, onAreasFound }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [allTrades, setAllTrades] = useState<Trade[]>([])   // 24개월 전체
  const [selectedArea, setSelectedArea] = useState<number | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const fetchTrades = useCallback(() => {
    setStatus('loading')
    setAllTrades([])
    setSelectedArea(null)
    setVisibleCount(PAGE_SIZE)

    const params = new URLSearchParams({ lawd_cd: lawdCd })
    if (aptName) params.set('apt_name', aptName)

    fetch(`/api/molit?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed')
        return r.json()
      })
      .then((data) => {
        const t: Trade[] = data.trades ?? []
        setAllTrades(t)
        setStatus(t.length > 0 ? 'ok' : 'empty')
        if (onAreasFound) {
          const areas = Array.from(new Set(t.map((tr) => Math.round(tr.area * 10) / 10)))
            .filter((a) => a > 0)
            .sort((a, b) => a - b)
          onAreasFound(areas)
        }
      })
      .catch(() => setStatus('error'))
  }, [lawdCd, aptName])

  // 주소 선택 시 자동 조회
  useEffect(() => {
    if (lawdCd) fetchTrades()
  }, [lawdCd])

  // 면적 필터 옵션 (0.1 단위 반올림, 중복 제거, 정렬)
  const areaOptions = useMemo(
    () =>
      Array.from(new Set(allTrades.map((t) => Math.round(t.area * 10) / 10)))
        .filter((a) => a > 0)
        .sort((a, b) => a - b),
    [allTrades]
  )

  // 면적 필터 적용
  const areaFiltered = useMemo(() => {
    if (selectedArea === null) return allTrades
    return allTrades.filter((t) => Math.round(t.area * 10) / 10 === selectedArea)
  }, [allTrades, selectedArea])

  // 통계: 24개월 전체 (면적 필터 적용)
  const stats = useMemo(() => {
    const prices = areaFiltered.map((t) => t.price).filter(Boolean)
    if (prices.length === 0) return null
    return {
      maxPrice: Math.max(...prices),
      minPrice: Math.min(...prices),
      totalCount: prices.length,
    }
  }, [areaFiltered])

  // 거래 목록: 최근 12개월 (면적 필터 적용)
  const ym12 = useMemo(() => makeYmSet(12), [])
  const recentTrades = useMemo(
    () => areaFiltered.filter((t) => ym12.has(t.ym)),
    [areaFiltered, ym12]
  )

  const visibleTrades = recentTrades.slice(0, visibleCount)
  const hasMore = visibleCount < recentTrades.length

  return (
    <div className="mt-2.5 rounded-xl border border-blue-100 bg-blue-50 overflow-hidden">
      {/* 헤더 */}
      <div className="px-4 py-2.5 border-b border-blue-100 flex items-center gap-2">
        <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span className="text-xs font-bold text-blue-700">이 지역 실거래가</span>
        {aptName && (
          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full truncate max-w-[120px]">
            {aptName}
          </span>
        )}
        <button
          type="button"
          onClick={fetchTrades}
          disabled={status === 'loading'}
          className="ml-auto shrink-0 flex items-center gap-1 text-xs text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {status === 'loading' ? (
            <>
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              조회 중
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {status === 'idle' ? '실거래가 조회' : '재조회'}
            </>
          )}
        </button>
      </div>

      {status === 'idle' && (
        <div className="px-4 py-5 text-center text-xs text-blue-400">
          <p className="font-medium">"실거래가 조회" 버튼을 눌러 최근 거래 내역을 확인하세요.</p>
        </div>
      )}

      {status === 'loading' && (
        <div className="px-4 py-5 flex items-center justify-center gap-2 text-xs text-blue-400">
          <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          실거래가 정보를 불러오는 중입니다...
        </div>
      )}

      {status === 'error' && (
        <div className="px-4 py-4 text-xs text-red-500 text-center">
          데이터를 불러오지 못했습니다. 재조회 버튼을 다시 눌러주세요.
        </div>
      )}

      {status === 'empty' && (
        <div className="px-4 py-5 text-center text-xs text-blue-400">
          <p className="font-medium">해당 지역의 거래 내역이 없습니다.</p>
        </div>
      )}

      {status === 'ok' && (
        <div className="p-3 space-y-2.5">
          {/* 면적 필터 */}
          {areaOptions.length > 1 && (
            <div>
              <p className="text-xs text-blue-500 font-semibold mb-1.5">면적 필터</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => { setSelectedArea(null); setVisibleCount(PAGE_SIZE) }}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors font-medium ${
                    selectedArea === null
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  전체
                </button>
                {areaOptions.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => { setSelectedArea(a); setVisibleCount(PAGE_SIZE) }}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors font-medium ${
                      selectedArea === a
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    {a}㎡
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 통계: 24개월 기준 */}
          {stats && (
            <div>
              <p className="text-xs text-slate-400 mb-1.5">최근 2년 기준{selectedArea ? ` · ${selectedArea}㎡` : ''}</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white rounded-lg p-2 text-center border border-blue-100">
                  <p className="text-xs text-slate-400 mb-0.5">최고가 (2년)</p>
                  <p className="text-xs font-bold text-rose-500">{fmtManwon(stats.maxPrice)}</p>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border border-blue-100">
                  <p className="text-xs text-slate-400 mb-0.5">최저가 (2년)</p>
                  <p className="text-xs font-bold text-blue-600">{fmtManwon(stats.minPrice)}</p>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border border-blue-100">
                  <p className="text-xs text-slate-400 mb-0.5">거래량 (2년)</p>
                  <p className="text-xs font-bold text-slate-700">{stats.totalCount.toLocaleString()}건</p>
                </div>
              </div>
            </div>
          )}

          {/* 거래 내역: 최근 12개월 */}
          <div>
            <p className="text-xs font-semibold text-blue-600 mb-1.5">
              최근 1년 거래 내역
              {selectedArea && <span className="ml-1 text-blue-400 font-normal">· {selectedArea}㎡</span>}
            </p>
            {recentTrades.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">
                선택한 조건의 최근 1년 거래 내역이 없습니다.
              </p>
            ) : (
              <>
                <div className="bg-white rounded-lg border border-blue-100 overflow-x-auto">
                  <table className="w-full text-xs" style={{ minWidth: '320px' }}>
                    <thead>
                      <tr className="bg-slate-50 border-b border-blue-50">
                        <th className="text-left px-2.5 py-2 text-slate-400 font-medium whitespace-nowrap">거래일</th>
                        <th className="text-left px-2.5 py-2 text-slate-400 font-medium whitespace-nowrap">단지명</th>
                        <th className="text-right px-2.5 py-2 text-slate-400 font-medium whitespace-nowrap">면적</th>
                        <th className="text-right px-2.5 py-2 text-slate-400 font-medium whitespace-nowrap">금액</th>
                        <th className="text-right px-2.5 py-2 text-slate-400 font-medium whitespace-nowrap">층</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleTrades.map((trade, i) => (
                        <tr key={i} className={`border-b border-slate-50 last:border-0 ${i % 2 === 0 ? '' : 'bg-blue-50/30'}`}>
                          <td className="px-2.5 py-2 text-slate-500 whitespace-nowrap">{trade.date}</td>
                          <td className="px-2.5 py-2 text-slate-500 whitespace-nowrap max-w-[80px] truncate">{trade.aptName || '-'}</td>
                          <td className="px-2.5 py-2 text-right text-slate-500 whitespace-nowrap">{trade.area}㎡</td>
                          <td className="px-2.5 py-2 text-right font-semibold text-slate-800 whitespace-nowrap">{fmtManwon(trade.price)}</td>
                          <td className="px-2.5 py-2 text-right text-slate-400 whitespace-nowrap">{trade.floor}층</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 더보기 / 모두 표시됨 */}
                <div className="mt-1.5 text-center">
                  {hasMore ? (
                    <button
                      type="button"
                      onClick={() => setVisibleCount((n) => n + PAGE_MORE)}
                      className="text-xs text-blue-500 hover:text-blue-700 font-semibold underline"
                    >
                      더보기 ({recentTrades.length - visibleCount}건 남음)
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">모두 표시됨 ({recentTrades.length}건)</span>
                  )}
                </div>
              </>
            )}
            <p className="text-xs text-blue-300 mt-1 text-right">출처: 국토교통부 실거래가 공개시스템</p>
          </div>
        </div>
      )}
    </div>
  )
}
