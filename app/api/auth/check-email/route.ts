import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ exists: false })

  const supabase = createServerClient()
  const { data } = await supabase
    .from('listings')
    .select('id')
    .ilike('user_email', email.trim())
    .limit(1)

  return NextResponse.json({ exists: (data?.length ?? 0) > 0 })
}
