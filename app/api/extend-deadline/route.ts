import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { listing_id, owner_token } = await req.json()

  if (!listing_id || !owner_token) {
    return NextResponse.json({ error: '필수 파라미터가 없습니다.' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: listing } = await supabase
    .from('listings')
    .select('id, owner_token, status, bid_deadline, deadline_extensions, original_deadline')
    .eq('id', listing_id)
    .single()

  if (!listing) return NextResponse.json({ error: '매물을 찾을 수 없습니다.' }, { status: 404 })
  if (listing.owner_token !== owner_token) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  if (listing.status !== 'active') return NextResponse.json({ error: '진행 중인 매물이 아닙니다.' }, { status: 400 })

  const extensions = listing.deadline_extensions ?? 0
  if (extensions >= 3) {
    return NextResponse.json({ error: '마감일 연장은 최대 3회까지 가능합니다.' }, { status: 400 })
  }

  const currentDeadline = new Date(listing.bid_deadline)
  currentDeadline.setDate(currentDeadline.getDate() + 7)
  const newDeadline = currentDeadline.toISOString().split('T')[0]

  await supabase
    .from('listings')
    .update({
      bid_deadline: newDeadline,
      deadline_extensions: extensions + 1,
      original_deadline: listing.original_deadline ?? listing.bid_deadline,
    })
    .eq('id', listing_id)

  return NextResponse.json({
    success: true,
    new_deadline: newDeadline,
    extensions: extensions + 1,
  })
}
