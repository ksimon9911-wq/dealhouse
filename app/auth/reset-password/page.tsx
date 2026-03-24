'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }
    setLoading(true)
    setError(null)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError('비밀번호 변경에 실패했습니다. 링크가 만료되었을 수 있습니다.')
      setLoading(false)
      return
    }
    setDone(true)
    setTimeout(() => router.push('/my'), 2000)
  }

  if (!sessionReady) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center text-slate-400 text-sm">
        인증 확인 중...
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-black text-[#191F28]">비밀번호 재설정</h1>
        <p className="text-sm text-slate-400 mt-2">새 비밀번호를 입력해주세요.</p>
      </div>

      {done ? (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-4 rounded-2xl text-center">
          비밀번호가 변경되었습니다. 내 매물 페이지로 이동합니다...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#191F28] mb-1.5">
              새 비밀번호 <span className="font-normal text-slate-400">(6자 이상)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#191F28] mb-1.5">비밀번호 확인</label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="••••••••"
              required
              className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent ${
                passwordConfirm && password !== passwordConfirm ? 'border-red-300' : 'border-slate-200'
              }`}
            />
            {passwordConfirm && password !== passwordConfirm && (
              <p className="text-xs text-red-500 mt-1">비밀번호가 일치하지 않습니다.</p>
            )}
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#3182F6] text-white font-bold py-3 rounded-xl text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {loading ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>
      )}
    </div>
  )
}
