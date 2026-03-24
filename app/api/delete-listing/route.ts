import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  const { listingId } = await req.json()
  if (!listingId) return NextResponse.json({ error: 'listingId 필요' }, { status: 400 })

  const supabase = createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user?.email) {
    return NextResponse.json({ error: '유효하지 않은 세션입니다.' }, { status: 401 })
  }

  // 본인 매물인지 확인
  const { data: listing } = await supabase
    .from('listings')
    .select('id, user_email, image_urls')
    .eq('id', listingId)
    .single()

  if (!listing) return NextResponse.json({ error: '매물을 찾을 수 없습니다.' }, { status: 404 })
  if (listing.user_email !== user.email) {
    return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 })
  }

  // 이미지 삭제
  if (listing.image_urls?.length) {
    const paths = listing.image_urls.map((url: string) => {
      const parts = url.split('/listing-images/')
      return parts[1] ? parts[1].split('?')[0] : null
    }).filter(Boolean)
    if (paths.length) {
      await supabase.storage.from('listing-images').remove(paths)
    }
  }

  const { error: deleteError } = await supabase
    .from('listings')
    .delete()
    .eq('id', listingId)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
