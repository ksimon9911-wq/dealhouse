import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const supabase = createServerClient()

  // JWT로 사용자 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user?.email) {
    return NextResponse.json({ error: '유효하지 않은 세션입니다.' }, { status: 401 })
  }

  const { data: listings } = await supabase
    .from('listings')
    .select('id, listing_type, property_type, sell_address, buy_address, sell_price, buy_price, sell_area_sqm, buy_area_sqm, move_date, bid_deadline, description, status, image_urls, created_at, owner_token, selected_bid_id, deadline_extensions, is_hidden, user_name, user_phone, user_email')
    .eq('user_email', user.email)
    .order('created_at', { ascending: false })

  return NextResponse.json({ listings: listings ?? [] })
}
