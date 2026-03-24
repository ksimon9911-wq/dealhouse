import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function PATCH(req: NextRequest) {
  const { listing_id, owner_token, updates } = await req.json()

  if (!listing_id || !owner_token) {
    return NextResponse.json({ error: '필수 파라미터가 없습니다.' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: listing } = await supabase
    .from('listings')
    .select('owner_token, status')
    .eq('id', listing_id)
    .single()

  if (!listing) return NextResponse.json({ error: '매물을 찾을 수 없습니다.' }, { status: 404 })
  if (listing.owner_token !== owner_token) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })

  // 허용된 필드만 업데이트
  const allowed = ['sell_price', 'buy_price', 'move_date', 'bid_deadline', 'description', 'sell_area_sqm', 'buy_area_sqm']
  const safe: Record<string, unknown> = {}
  for (const key of allowed) {
    if (updates[key] !== undefined) safe[key] = updates[key]
  }

  if (Object.keys(safe).length === 0) {
    return NextResponse.json({ error: '수정할 내용이 없습니다.' }, { status: 400 })
  }

  const { error } = await supabase.from('listings').update(safe).eq('id', listing_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
