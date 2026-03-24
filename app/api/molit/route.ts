import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade'

function parseItems(xml: string): Record<string, string>[] {
  const items: Record<string, string>[] = []
  const itemRe = /<item>([\s\S]*?)<\/item>/g
  let m
  while ((m = itemRe.exec(xml)) !== null) {
    const obj: Record<string, string> = {}
    const fieldRe = /<([^>\s/]+)>([\s\S]*?)<\/\1>/g
    let f
    while ((f = fieldRe.exec(m[1])) !== null) {
      obj[f[1]] = f[2].trim()
    }
    items.push(obj)
  }
  return items
}

function makeMonths(n: number): string[] {
  const now = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}

function buildUrl(apiKey: string, lawdCd: string, dealYmd: string, pageNo: number) {
  const params = new URLSearchParams({
    LAWD_CD: lawdCd,
    DEAL_YMD: dealYmd,
    numOfRows: '1000',
    pageNo: String(pageNo),
  })
  return `${BASE}?serviceKey=${apiKey}&${params.toString()}`
}

async function fetchMonth(lawdCd: string, dealYmd: string, apiKey: string): Promise<Record<string, string>[]> {
  try {
    const res = await fetch(buildUrl(apiKey, lawdCd, dealYmd, 1), { cache: 'no-store' })
    if (!res.ok) { console.error('[molit] HTTP', res.status, lawdCd, dealYmd); return [] }
    const xml = await res.text()
    if (xml.includes('<errMsg>') || xml.includes('<returnAuthMsg>')) return []
    const items = parseItems(xml)
    const totalMatch = xml.match(/<totalCount>(\d+)<\/totalCount>/)
    const total = totalMatch ? parseInt(totalMatch[1], 10) : 0
    if (total > 1000) {
      const extraPages = Math.ceil((total - 1000) / 1000)
      for (let p = 2; p <= extraPages + 1; p++) {
        const r = await fetch(buildUrl(apiKey, lawdCd, dealYmd, p), { cache: 'no-store' })
        if (r.ok) parseItems(await r.text()).forEach((i) => items.push(i))
      }
    }
    return items
  } catch (e) {
    console.error('[molit] error', e); return []
  }
}

function normalize(s: string) {
  return s.replace(/\s+/g, '').toLowerCase().replace(/(아파트|빌라|오피스텔|단지)+$/, '')
}

function parsePrice(s: string): number {
  return parseInt((s ?? '').replace(/[,\s]/g, ''), 10) || 0
}

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams
  const lawdCd = sp.get('lawd_cd')
  const aptName = sp.get('apt_name') ?? ''
  if (!lawdCd) return NextResponse.json({ error: 'lawd_cd required' }, { status: 400 })

  const apiKey = process.env.NEXT_PUBLIC_MOLIT_API_KEY ?? ''
  if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 })

  const aptNorm = normalize(aptName)
  console.log('[molit] lawd_cd:', lawdCd, '| apt_name:', aptName)

  // 최근 24개월 순차 조회 (429 방지)
  const months = makeMonths(24)
  const allItems: Record<string, string>[] = []
  for (const ym of months) {
    const items = await fetchMonth(lawdCd, ym, apiKey)
    items.forEach((i) => allItems.push(i))
  }
  console.log('[molit] total items (24mo):', allItems.length)

  // apt_name like 필터
  const filtered = aptNorm
    ? allItems.filter((item) => normalize(item['aptNm'] ?? '').includes(aptNorm))
    : allItems
  console.log('[molit] after apt_name filter:', filtered.length)

  // 최신순 정렬
  const sorted = [...filtered].sort((a, b) => {
    const da = `${a['dealYear']}${String(a['dealMonth']).padStart(2, '0')}${String(a['dealDay']).padStart(2, '0')}`
    const db = `${b['dealYear']}${String(b['dealMonth']).padStart(2, '0')}${String(b['dealDay']).padStart(2, '0')}`
    return db.localeCompare(da)
  })

  // 전체 거래 데이터 반환 (클라이언트에서 면적 필터 + 기간 필터 + 페이지네이션 처리)
  const trades = sorted.map((it) => ({
    date: `${it['dealYear']}.${String(it['dealMonth']).padStart(2, '0')}.${String(it['dealDay']).padStart(2, '0')}`,
    ym: `${it['dealYear']}${String(it['dealMonth']).padStart(2, '0')}`, // YYYYMM (면적필터·기간필터 용)
    price: parsePrice(it['dealAmount']),
    area: parseFloat(it['excluUseAr'] ?? '0'),
    floor: it['floor'] ?? '-',
    aptName: it['aptNm'] ?? '',
  }))

  return NextResponse.json({ trades })
}
