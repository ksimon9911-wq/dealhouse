import { NextRequest, NextResponse } from 'next/server'

// 국토교통부 공인중개사 사무소 정보 조회 서비스
// data.go.kr → 국토교통부 부동산중개업정보조회서비스
// ※ 실제 서비스키와 엔드포인트는 data.go.kr에서 신청 후 확인
const BASE = 'https://apis.data.go.kr/1613000/BrokerInfoService/getBrkrInfo'

interface BrokerRaw {
  bsnmCndNm?: string    // 영업상태 (정상영업, 폐업, 등록취소 등)
  cgrmNm?: string       // 중개사무소명 (상호)
  rprsntNm?: string     // 대표자명
  ofcAddr?: string      // 사무소 소재지
  telNo?: string        // 전화번호
  regNO?: string        // 등록번호
}

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams
  const regNo = sp.get('reg_no')?.trim()

  if (!regNo) {
    return NextResponse.json({ error: 'reg_no required' }, { status: 400 })
  }

  const apiKey = process.env.NEXT_PUBLIC_MOLIT_API_KEY ?? ''
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const params = new URLSearchParams({
      numOfRows: '5',
      pageNo: '1',
      regNO: regNo,
    })
    const url = `${BASE}?serviceKey=${apiKey}&${params.toString()}`
    console.log('[broker-verify] url:', url)

    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      console.error('[broker-verify] HTTP', res.status)
      return NextResponse.json({ error: 'API request failed', status: res.status }, { status: 502 })
    }

    const xml = await res.text()
    console.log('[broker-verify] response:', xml.substring(0, 500))

    // 인증 오류 감지
    if (xml.includes('<errMsg>') || xml.includes('SERVICE_KEY_IS_NOT_REGISTERED_ERROR')) {
      return NextResponse.json({ error: 'API auth error' }, { status: 401 })
    }

    // 결과 없음
    const totalMatch = xml.match(/<totalCount>(\d+)<\/totalCount>/)
    const total = totalMatch ? parseInt(totalMatch[1], 10) : 0
    if (total === 0) {
      return NextResponse.json({ found: false })
    }

    // XML 파싱
    function getField(tag: string): string {
      const m = xml.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`))
      return m ? m[1].trim() : ''
    }

    const raw: BrokerRaw = {
      bsnmCndNm: getField('bsnmCndNm'),
      cgrmNm:    getField('cgrmNm'),
      rprsntNm:  getField('rprsntNm'),
      ofcAddr:   getField('ofcAddr'),
      telNo:     getField('telNo'),
      regNO:     getField('regNO'),
    }

    const isActive = raw.bsnmCndNm?.includes('정상') ?? false

    return NextResponse.json({
      found: true,
      active: isActive,
      info: {
        agencyName: raw.cgrmNm ?? '',
        ceoName:    raw.rprsntNm ?? '',
        address:    raw.ofcAddr ?? '',
        phone:      raw.telNo ?? '',
        status:     raw.bsnmCndNm ?? '',
        regNo:      raw.regNO ?? regNo,
      },
    })
  } catch (e) {
    console.error('[broker-verify] error:', e)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
