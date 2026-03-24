export function formatPrice(price: number): string {
  if (price >= 100000000) {
    const eok = Math.floor(price / 100000000)
    const man = Math.floor((price % 100000000) / 10000)
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`
  }
  return `${(price / 10000).toLocaleString()}만원`
}

export function daysLeft(deadline: string): number {
  const diff = new Date(deadline).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function getLegalMaxCommission(price: number): number {
  if (price < 50_000_000) return Math.min(price * 0.006, 250_000)
  if (price < 200_000_000) return Math.min(price * 0.005, 800_000)
  if (price < 900_000_000) return price * 0.004
  if (price < 1_200_000_000) return price * 0.005
  if (price < 1_500_000_000) return price * 0.006
  return price * 0.007
}

export const inputClass =
  'w-full border border-slate-200 rounded-xl px-4 py-3 text-[#191F28] text-sm focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent transition bg-white placeholder:text-slate-400'

export const labelClass = 'block text-sm font-semibold text-[#191F28] mb-1.5'

export const sectionClass = 'bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-sm'

export const LISTING_TYPE_LABEL: Record<string, string> = {
  sell: '매도',
  buy: '매수',
  both: '매도/매수',
}

export const PROPERTY_TYPE_LABEL: Record<string, string> = {
  apartment: '아파트',
  villa: '빌라',
  officetel: '오피스텔',
}
