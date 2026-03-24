import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { listing_id, agent_id, body, sender_role, owner_token, agent_token } = await req.json()

  if (!listing_id || !agent_id || !body || !sender_role) {
    return NextResponse.json({ error: '필수 파라미터가 없습니다.' }, { status: 400 })
  }

  const supabase = createServerClient()

  // 발신자 검증
  if (sender_role === 'owner') {
    const { data: listing } = await supabase
      .from('listings')
      .select('owner_token')
      .eq('id', listing_id)
      .single()
    if (!listing || listing.owner_token !== owner_token) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }
  } else if (sender_role === 'agent') {
    const { data: agent } = await supabase
      .from('agents')
      .select('id, dashboard_token')
      .eq('id', agent_id)
      .single()
    if (!agent || agent.dashboard_token !== agent_token) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }
  } else {
    return NextResponse.json({ error: '유효하지 않은 sender_role' }, { status: 400 })
  }

  const { data: message, error } = await supabase
    .from('messages')
    .insert({ listing_id, agent_id, sender_role, body })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, message })
}

export async function GET(req: NextRequest) {
  const listingId = req.nextUrl.searchParams.get('listing_id')
  const agentId = req.nextUrl.searchParams.get('agent_id')
  const ownerToken = req.nextUrl.searchParams.get('owner_token')
  const agentToken = req.nextUrl.searchParams.get('agent_token')

  if (!listingId || !agentId) {
    return NextResponse.json({ error: '필수 파라미터가 없습니다.' }, { status: 400 })
  }

  const supabase = createServerClient()

  // 접근 권한 검증
  if (ownerToken) {
    const { data: listing } = await supabase
      .from('listings')
      .select('owner_token')
      .eq('id', listingId)
      .single()
    if (!listing || listing.owner_token !== ownerToken) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }
  } else if (agentToken) {
    const { data: agent } = await supabase
      .from('agents')
      .select('id, dashboard_token')
      .eq('id', agentId)
      .single()
    if (!agent || agent.dashboard_token !== agentToken) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }
  } else {
    return NextResponse.json({ error: '인증 토큰이 없습니다.' }, { status: 401 })
  }

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('listing_id', listingId)
    .eq('agent_id', agentId)
    .order('created_at', { ascending: true })

  return NextResponse.json({ messages: messages ?? [] })
}
