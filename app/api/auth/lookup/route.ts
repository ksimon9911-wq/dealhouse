// 전화번호로 이메일 조회 (로그인 시 전화번호 입력한 경우)
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { phone } = await req.json()
  if (!phone) return NextResponse.json({ error: '전화번호를 입력해주세요.' }, { status: 400 })

  const supabase = createServerClient()

  const normalized = phone.replace(/-/g, '').trim()

  const { data } = await supabase
    .from('listings')
    .select('user_email')
    .or(`user_phone.eq.${phone},user_phone.eq.${normalized}`)
    .not('user_email', 'is', null)
    .limit(1)
    .single()

  if (!data?.user_email) {
    return NextResponse.json({ error: '해당 전화번호로 등록된 계정이 없습니다.' }, { status: 404 })
  }

  return NextResponse.json({ email: data.user_email })
}
