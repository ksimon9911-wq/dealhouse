import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const agentToken = req.nextUrl.searchParams.get('agent_token')
  if (!agentToken) return NextResponse.json({ error: 'agent_token 필요' }, { status: 400 })

  const supabase = createServerClient()

  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('dashboard_token', agentToken)
    .single()

  if (!agent) return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 403 })

  const { data: bids } = await supabase
    .from('bids')
    .select('*, listings(sell_address, buy_address, sell_price, buy_price, status, bid_deadline)')
    .eq('agent_id', agent.id)
    .eq('is_visible', true)
    .order('created_at', { ascending: false })

  const allBids = bids ?? []
  const wonBids = allBids.filter((b) => b.is_selected)
  const winRate = allBids.length > 0 ? Math.round((wonBids.length / allBids.length) * 100) : 0
  const avgRate = allBids.length > 0
    ? allBids.reduce((s, b) => s + b.commission_rate, 0) / allBids.length
    : 0
  const totalEarned = wonBids.reduce((s, b) => s + (b.commission_amount ?? 0), 0)

  return NextResponse.json({
    agent: {
      id: agent.id,
      name: agent.name,
      agency_name: agent.agency_name,
      district: agent.district,
      is_verified: agent.is_verified,
      wins_count: agent.wins_count,
    },
    stats: {
      total_bids: allBids.length,
      won_bids: wonBids.length,
      win_rate: winRate,
      avg_commission_rate: Math.round(avgRate * 100) / 100,
      total_earned: totalEarned,
    },
    bids: allBids,
  })
}
