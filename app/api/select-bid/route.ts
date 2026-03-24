import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { listing_id, bid_id, owner_token } = await req.json()

  if (!listing_id || !bid_id || !owner_token) {
    return NextResponse.json({ error: '필수 파라미터가 없습니다.' }, { status: 400 })
  }

  const supabase = createServerClient()

  // owner_token 검증
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id, owner_token, status, sell_price, buy_price')
    .eq('id', listing_id)
    .single()

  if (listingError || !listing) {
    return NextResponse.json({ error: '매물을 찾을 수 없습니다.' }, { status: 404 })
  }

  if (listing.owner_token !== owner_token) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  if (listing.status !== 'active') {
    return NextResponse.json({ error: '이미 마감된 매물입니다.' }, { status: 400 })
  }

  // 기존 선정 해제
  await supabase
    .from('bids')
    .update({ is_selected: false, selected_at: null })
    .eq('listing_id', listing_id)

  // 선정 bid 업데이트
  const { data: bid, error: bidError } = await supabase
    .from('bids')
    .update({ is_selected: true, selected_at: new Date().toISOString() })
    .eq('id', bid_id)
    .select('*, agents(*)')
    .single()

  if (bidError || !bid) {
    return NextResponse.json({ error: '입찰 선정 실패' }, { status: 500 })
  }

  // 매물 상태 업데이트 + selected_bid_id 저장
  await supabase
    .from('listings')
    .update({ selected_bid_id: bid_id, status: 'closed' })
    .eq('id', listing_id)

  // 중개사 wins_count 증가
  if (bid.agent_id) {
    await supabase.rpc('increment_wins', { agent_id_input: bid.agent_id }).maybeSingle()
    // rpc 없는 경우 직접 업데이트
    const { data: agent } = await supabase
      .from('agents')
      .select('wins_count')
      .eq('id', bid.agent_id)
      .single()
    if (agent) {
      await supabase
        .from('agents')
        .update({ wins_count: (agent.wins_count ?? 0) + 1 })
        .eq('id', bid.agent_id)
    }
  }

  return NextResponse.json({
    success: true,
    agent: {
      name: bid.agents?.name,
      agency_name: bid.agents?.agency_name,
      phone: bid.agents?.phone,
      email: bid.agents?.email,
    },
  })
}
