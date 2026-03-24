import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

function checkAdmin(req: NextRequest) {
  const auth = req.headers.get('Authorization') ?? ''
  return auth === `Bearer ${process.env.ADMIN_SECRET}`
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  const supabase = createServerClient()
  const { data } = await supabase
    .from('listings')
    .select('id, sell_address, buy_address, status, listing_type, property_type, is_hidden, created_at, user_name, user_phone, bid_deadline')
    .order('created_at', { ascending: false })
  return NextResponse.json({ listings: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  const { id, is_hidden } = await req.json()
  const supabase = createServerClient()
  await supabase.from('listings').update({ is_hidden }).eq('id', id)
  return NextResponse.json({ success: true })
}
