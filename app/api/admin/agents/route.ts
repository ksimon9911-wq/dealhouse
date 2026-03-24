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
    .from('agents')
    .select('id, name, agency_name, license_number, district, is_verified, is_suspended, wins_count, created_at, phone, email, license_doc_url')
    .order('created_at', { ascending: false })
  return NextResponse.json({ agents: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  const { id, is_verified, is_suspended } = await req.json()
  const supabase = createServerClient()
  const updates: Record<string, unknown> = {}
  if (is_verified !== undefined) updates.is_verified = is_verified
  if (is_suspended !== undefined) updates.is_suspended = is_suspended
  await supabase.from('agents').update(updates).eq('id', id)
  return NextResponse.json({ success: true })
}
