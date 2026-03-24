'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface AgentRow {
  id: string
  name: string
  agency_name: string
  license_number: string
  district: string
  phone: string
  email: string
  is_verified: boolean
  is_suspended: boolean
  wins_count: number
  created_at: string
  license_doc_url: string | null
}

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<AgentRow[]>([])
  const [loading, setLoading] = useState(true)

  const secret = typeof window !== 'undefined' ? sessionStorage.getItem('admin_secret') ?? '' : ''

  useEffect(() => {
    fetch('/api/admin/agents', { headers: { Authorization: `Bearer ${secret}` } })
      .then((r) => r.json())
      .then((d) => { setAgents(d.agents ?? []); setLoading(false) })
  }, [secret])

  async function patch(id: string, updates: Record<string, boolean>) {
    await fetch('/api/admin/agents', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
    setAgents((prev) => prev.map((a) => a.id === id ? { ...a, ...updates } : a))
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin" className="text-slate-400 hover:text-slate-600 text-sm">← 대시보드</Link>
        <h1 className="text-xl font-black text-[#191F28]">중개사 관리</h1>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-200 rounded-xl"></div>)}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">중개사무소</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">대표자</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">지역</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">서류</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">인증</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">정지</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id} className={`border-b border-slate-50 hover:bg-slate-50 ${agent.is_suspended ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <Link href={`/agents/${agent.id}`} className="text-blue-600 hover:underline font-medium">
                      {agent.agency_name}
                    </Link>
                    <p className="text-xs text-slate-400">{agent.license_number}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{agent.name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{agent.district}</td>
                  <td className="px-4 py-3">
                    {agent.license_doc_url ? (
                      <a
                        href={agent.license_doc_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline font-semibold"
                      >
                        서류 보기
                      </a>
                    ) : (
                      <span className="text-xs text-slate-300">미제출</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => patch(agent.id, { is_verified: !agent.is_verified })}
                      className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${
                        agent.is_verified
                          ? 'bg-blue-100 text-blue-700 hover:bg-slate-100 hover:text-slate-600'
                          : 'bg-amber-50 text-amber-700 hover:bg-blue-100 hover:text-blue-700'
                      }`}
                    >
                      {agent.is_verified ? '인증됨' : '승인하기'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => patch(agent.id, { is_suspended: !agent.is_suspended })}
                      className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${
                        agent.is_suspended
                          ? 'bg-slate-100 text-slate-500 hover:bg-green-100 hover:text-green-700'
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                    >
                      {agent.is_suspended ? '정지 해제' : '정지'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
