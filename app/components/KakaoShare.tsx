'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    Kakao: {
      init: (key: string) => void
      isInitialized: () => boolean
      Share: {
        sendDefault: (options: Record<string, unknown>) => void
      }
    }
  }
}

interface KakaoShareProps {
  title: string
  description: string
  imageUrl?: string
  linkUrl: string
}

export default function KakaoShare({ title, description, imageUrl, linkUrl }: KakaoShareProps) {
  const appKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY

  useEffect(() => {
    if (!appKey) return
    const id = 'kakao-sdk'
    if (document.getElementById(id)) {
      if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init(appKey)
      }
      return
    }
    const script = document.createElement('script')
    script.id = id
    script.src = 'https://developers.kakao.com/sdk/js/kakao.js'
    script.async = true
    script.onload = () => {
      if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init(appKey)
      }
    }
    document.head.appendChild(script)
  }, [appKey])

  function handleShare() {
    if (!window.Kakao?.Share) {
      // 카카오 SDK 미설정 시 URL 복사로 대체
      navigator.clipboard.writeText(linkUrl).then(() => {
        alert('링크가 복사되었습니다!')
      })
      return
    }

    const content: Record<string, unknown> = {
      title,
      description,
      link: { mobileWebUrl: linkUrl, webUrl: linkUrl },
    }
    if (imageUrl) {
      content.imageUrl = imageUrl
    }

    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content,
      buttons: [
        {
          title: '매물 보기',
          link: { mobileWebUrl: linkUrl, webUrl: linkUrl },
        },
      ],
    })
  }

  return (
    <button
      onClick={handleShare}
      className="w-full flex items-center justify-center gap-2 border border-yellow-400 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-semibold py-3 rounded-2xl transition-colors text-sm"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3C6.477 3 2 6.477 2 11c0 2.89 1.582 5.434 4 6.972V21l3.5-2.1C10.3 19.29 11.13 19.4 12 19.4c5.523 0 10-3.477 10-8.4S17.523 3 12 3z" />
      </svg>
      카카오톡으로 공유
    </button>
  )
}
