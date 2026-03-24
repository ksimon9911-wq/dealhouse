import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 서버 전용 클라이언트 (API routes에서만 사용)
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export type ListingType = 'sell' | 'buy' | 'both' | 'offer' | 'seek'
export type PropertyType = 'apartment' | 'villa' | 'officetel'
export type TransactionType = 'sale' | 'jeonse' | 'wolse'

export interface Listing {
  id: string
  user_name: string
  user_phone: string
  user_email: string
  listing_type: ListingType
  property_type: PropertyType
  sell_address: string | null
  sell_building_name: string | null
  sell_dong: string | null
  sell_ho: string | null
  sell_area_sqm: number | null
  sell_supply_area_sqm: number | null
  sell_price: number | null
  buy_address: string | null
  buy_building_name: string | null
  buy_dong: string | null
  buy_ho: string | null
  buy_area_sqm: number | null
  buy_supply_area_sqm: number | null
  buy_price: number | null
  // 전세/월세
  transaction_type: TransactionType
  deposit: number | null
  monthly_rent: number | null
  lease_months: number | null
  move_date: string
  description: string
  status: string
  bid_deadline: string
  image_urls: string[] | null
  created_at: string
  // v2
  owner_token?: string
  selected_bid_id?: string | null
  deadline_extensions?: number
  original_deadline?: string | null
  is_hidden?: boolean
}

export interface Agent {
  id: string
  name: string
  agency_name: string
  license_number: string
  phone: string
  email: string
  district: string
  is_verified: boolean
  // v2
  bio?: string | null
  profile_image?: string | null
  wins_count?: number
  dashboard_token?: string
  is_suspended?: boolean
  created_at?: string
}

export interface Bid {
  id: string
  listing_id: string
  agent_id: string
  commission_rate: number
  commission_amount: number
  service_description: string
  is_selected: boolean
  is_visible: boolean
  selected_at?: string | null
  agents?: Agent
}

export interface Message {
  id: string
  listing_id: string
  agent_id: string
  sender_role: 'owner' | 'agent'
  body: string
  read_at: string | null
  created_at: string
}

export interface Review {
  id: string
  listing_id: string
  agent_id: string
  owner_token: string
  rating: number
  savings_amount: number | null
  body: string | null
  is_public: boolean
  created_at: string
  agents?: Agent
  listings?: Listing
}

export interface Notification {
  id: string
  listing_id: string
  bid_id: string | null
  channel: string
  recipient: string
  status: string
  sent_at: string | null
  created_at: string
}
