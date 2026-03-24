'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabase, type Message } from '@/lib/supabase'

function ChatContent({ listingId, agentId }: { listingId: string; agentId: string }) {
  const searchParams = useSearchParams()
  const ownerToken = searchParams.get('owner_token')
  const agentToken = searchParams.get('agent_token')

  const senderRole = ownerToken ? 'owner' : agentToken ? 'agent' : null
  const authToken = ownerToken ?? agentToken

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [agencyName, setAgencyName] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!authToken) return

    // 초기 메시지 로드
    const params = new URLSearchParams({
      listing_id: listingId,
      agent_id: agentId,
      ...(ownerToken ? { owner_token: ownerToken } : { agent_token: agentToken ?? '' }),
    })
    fetch(`/api/send-message?${params}`)
      .then((r) => r.json())
      .then((d) => { if (d.messages) setMessages(d.messages) })

    // 중개사 이름 조회
    supabase.from('agents').select('agency_name').eq('id', agentId).single()
      .then(({ data }) => { if (data) setAgencyName(data.agency_name) })

    // Realtime 구독
    const channel = supabase
      .channel(`messages:${listingId}:${agentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `listing_id=eq.${listingId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          if (newMsg.agent_id === agentId) {
            setMessages((prev) => [...prev, newMsg])
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [listingId, agentId, ownerToken, agentToken, authToken])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || !senderRole) return
    setSending(true)
    try {
      const res = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          agent_id: agentId,
          body: input.trim(),
          sender_role: senderRole,
          owner_token: ownerToken,
          agent_token: agentToken,
        }),
      })
      const data = await res.json()
      if (data.message) {
        setMessages((prev) => [...prev, data.message])
        setInput('')
      }
    } catch {
      // ignore
    }
    setSending(false)
  }

  if (!senderRole) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-xl font-bold text-slate-700 mb-2">접근 권한이 없습니다</p>
        <p className="text-slate-500 text-sm">owner_token 또는 agent_token이 필요합니다.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-80px)]">
      {/* 헤더 */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4 shadow-sm flex items-center gap-3">
        <Link href={ownerToken ? `/listings/${listingId}?owner_token=${ownerToken}` : '#'} className="text-slate-400 hover:text-slate-600">
          ←
        </Link>
        <div>
          <p className="font-bold text-slate-900 text-sm">{agencyName || '중개사'}</p>
          <p className="text-xs text-slate-400">{senderRole === 'owner' ? '집주인으로 대화 중' : '중개사로 대화 중'}</p>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 px-1">
        {messages.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            <p className="text-2xl mb-2">💬</p>
            <p className="text-sm">첫 메시지를 보내보세요.</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_role === senderRole
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                isMe
                  ? 'bg-[#3182F6] text-white rounded-br-sm'
                  : 'bg-white border border-slate-100 text-slate-800 rounded-bl-sm shadow-sm'
              }`}>
                <p className="leading-relaxed">{msg.body}</p>
                <p className={`text-xs mt-1 ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                  {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="메시지를 입력하세요..."
          className="flex-1 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="bg-[#3182F6] text-white px-5 py-3 rounded-2xl font-semibold text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          전송
        </button>
      </form>
    </div>
  )
}

export default function ChatPage({
  params,
}: {
  params: Promise<{ listingId: string; agentId: string }>
}) {
  const { listingId, agentId } = use(params)
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto px-4 py-12 animate-pulse">
        <div className="h-16 bg-slate-200 rounded-2xl mb-4"></div>
        <div className="flex-1 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`h-12 bg-slate-200 rounded-2xl w-2/3 ${i % 2 === 0 ? '' : 'ml-auto'}`}></div>
          ))}
        </div>
      </div>
    }>
      <ChatContent listingId={listingId} agentId={agentId} />
    </Suspense>
  )
}
