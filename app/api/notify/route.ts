import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { bid_id } = await req.json()
  if (!bid_id) return NextResponse.json({ error: 'bid_id 필요' }, { status: 400 })

  const supabase = createServerClient()

  const { data: bid } = await supabase
    .from('bids')
    .select('*, listings(user_name, user_phone, user_email), agents(name, agency_name)')
    .eq('id', bid_id)
    .single()

  if (!bid) return NextResponse.json({ error: '입찰 정보 없음' }, { status: 404 })

  const listing = bid.listings as { user_name: string; user_phone: string; user_email: string } | null
  const agent = bid.agents as { name: string; agency_name: string } | null
  if (!listing) return NextResponse.json({ error: '매물 정보 없음' }, { status: 404 })

  const results: string[] = []

  // SMS 알림 (CoolSMS REST API)
  if (listing.user_phone && process.env.COOLSMS_API_KEY && process.env.COOLSMS_API_SECRET) {
    try {
      const smsMsg = `[딜하우스] ${agent?.agency_name ?? '중개사'}에서 중개보수 ${bid.commission_rate}%로 입찰했습니다. 확인하세요.`
      const timestamp = String(Date.now())
      const msgId = Math.random().toString(36).slice(2, 10)

      // CoolSMS HMAC-SHA256 서명
      const encoder = new TextEncoder()
      const keyData = encoder.encode(process.env.COOLSMS_API_SECRET)
      const msgData = encoder.encode(`${timestamp}${msgId}`)
      const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgData)
      const signature = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')

      const smsRes = await fetch('https://api.coolsms.co.kr/messages/v4/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `HMAC-SHA256 apiKey=${process.env.COOLSMS_API_KEY}, date=${timestamp}, salt=${msgId}, signature=${signature}`,
        },
        body: JSON.stringify({
          message: {
            to: listing.user_phone.replace(/-/g, ''),
            from: process.env.COOLSMS_FROM_NUMBER,
            text: smsMsg,
          },
        }),
      })

      if (smsRes.ok) {
        await supabase.from('notifications').upsert({
          listing_id: bid.listing_id,
          bid_id: bid.id,
          channel: 'sms',
          recipient: listing.user_phone,
          status: 'sent',
          sent_at: new Date().toISOString(),
        }, { onConflict: 'listing_id,bid_id,channel' })
        results.push('sms:sent')
      } else {
        results.push('sms:failed')
      }
    } catch (err) {
      console.error('SMS 발송 실패:', err)
      results.push('sms:failed')
    }
  }

  // 이메일 알림 (Resend REST API)
  if (listing.user_email && process.env.RESEND_API_KEY) {
    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'DealHouse <noreply@dealhouse.kr>',
          to: [listing.user_email],
          subject: `[딜하우스] 새 입찰이 도착했습니다 - ${agent?.agency_name}`,
          html: `
            <h2>새 입찰이 도착했습니다!</h2>
            <p><strong>${listing.user_name}</strong>님의 매물에 <strong>${agent?.agency_name}</strong>에서 입찰했습니다.</p>
            <ul>
              <li>중개보수율: <strong>${bid.commission_rate}%</strong></li>
              <li>중개사: ${agent?.name}</li>
            </ul>
            <p>딜하우스에서 입찰 내용을 확인하세요.</p>
          `,
        }),
      })

      if (emailRes.ok) {
        await supabase.from('notifications').upsert({
          listing_id: bid.listing_id,
          bid_id: bid.id,
          channel: 'email',
          recipient: listing.user_email,
          status: 'sent',
          sent_at: new Date().toISOString(),
        }, { onConflict: 'listing_id,bid_id,channel' })
        results.push('email:sent')
      } else {
        results.push('email:failed')
      }
    } catch (err) {
      console.error('이메일 발송 실패:', err)
      results.push('email:failed')
    }
  }

  if (results.length === 0) {
    return NextResponse.json({ message: '알림 설정 없음 (환경 변수 미설정)', results })
  }

  return NextResponse.json({ success: true, results })
}
