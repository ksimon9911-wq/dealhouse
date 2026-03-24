import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { listing_id, owner_token, rating, savings_amount, body } = await req.json()

  if (!listing_id || !owner_token || !rating) {
    return NextResponse.json({ error: '필수 파라미터가 없습니다.' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: listing } = await supabase
    .from('listings')
    .select('id, owner_token, selected_bid_id, status')
    .eq('id', listing_id)
    .single()

  if (!listing) return NextResponse.json({ error: '매물을 찾을 수 없습니다.' }, { status: 404 })
  if (listing.owner_token !== owner_token) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  if (!listing.selected_bid_id) return NextResponse.json({ error: '선정된 중개사가 없습니다.' }, { status: 400 })

  // 선정된 bid의 agent_id 조회
  const { data: bid } = await supabase
    .from('bids')
    .select('agent_id')
    .eq('id', listing.selected_bid_id)
    .single()

  if (!bid) return NextResponse.json({ error: '입찰 정보 없음' }, { status: 404 })

  // 중복 후기 방지 (UNIQUE constraint on listing_id)
  const { error: reviewError } = await supabase.from('reviews').insert({
    listing_id,
    agent_id: bid.agent_id,
    owner_token,
    rating,
    savings_amount: savings_amount ?? null,
    body: body ?? null,
    is_public: true,
  })

  if (reviewError) {
    if (reviewError.code === '23505') {
      return NextResponse.json({ error: '이미 후기를 작성하셨습니다.' }, { status: 400 })
    }
    return NextResponse.json({ error: reviewError.message }, { status: 500 })
  }

  // 매물 상태 completed 로 변경
  await supabase.from('listings').update({ status: 'completed' }).eq('id', listing_id)

  return NextResponse.json({ success: true })
}
