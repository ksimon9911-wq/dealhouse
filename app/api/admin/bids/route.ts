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
    .from('bids')
    .select('*, agents(name, agency_name), listings(sell_address, buy_address)')
    .order('created_at', { ascending: false })
    .limit(200)
  return NextResponse.json({ bids: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  const { id, is_visible } = await req.json()
  const supabase = createServerClient()
  await supabase.from('bids').update({ is_visible }).eq('id', id)
  return NextResponse.json({ success: true })
}
