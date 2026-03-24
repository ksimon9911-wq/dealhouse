// 기존 매물(비밀번호 없는) 소유자 본인확인 후 계정 생성
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { phone, email, password } = await req.json()

  if (!phone || !email || !password) {
    return NextResponse.json({ error: '전화번호, 이메일, 비밀번호를 모두 입력해주세요.' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: '비밀번호는 6자 이상이어야 합니다.' }, { status: 400 })
  }

  const supabase = createServerClient()

  // 전화번호 + 이메일 둘 다 일치하는 매물 확인
  const normalizedPhone = phone.replace(/-/g, '').trim()
  const { data: listing } = await supabase
    .from('listings')
    .select('id, user_email, user_phone')
    .or(`user_phone.eq.${phone},user_phone.eq.${normalizedPhone}`)
    .ilike('user_email', email.trim())
    .limit(1)
    .single()

  if (!listing) {
    return NextResponse.json({
      error: '입력하신 전화번호와 이메일이 일치하는 매물을 찾을 수 없습니다.',
    }, { status: 404 })
  }

  // Supabase Auth 계정 생성
  const { error: signUpError } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  })

  if (signUpError) {
    // 이미 계정이 있으면 비밀번호 틀린 것 → 안내
    if (signUpError.message.toLowerCase().includes('already')) {
      return NextResponse.json({
        error: '이미 등록된 계정입니다. 로그인 탭에서 로그인해주세요.',
      }, { status: 400 })
    }
    return NextResponse.json({ error: signUpError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, email: email.trim() })
}
