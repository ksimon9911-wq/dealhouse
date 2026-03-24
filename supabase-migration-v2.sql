-- ============================================================
-- DealHouse v2 마이그레이션
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- 1. listings 테이블 신규 컬럼
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS owner_token         uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS selected_bid_id     uuid,
  ADD COLUMN IF NOT EXISTS deadline_extensions int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_deadline   date,
  ADD COLUMN IF NOT EXISTS is_hidden           bool DEFAULT false;

-- 2. bids 테이블 신규 컬럼
ALTER TABLE bids
  ADD COLUMN IF NOT EXISTS selected_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_visible  bool DEFAULT true;

-- 3. agents 테이블 신규 컬럼
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS bio             text,
  ADD COLUMN IF NOT EXISTS profile_image   text,
  ADD COLUMN IF NOT EXISTS wins_count      int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dashboard_token uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS is_suspended    bool DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at      timestamptz DEFAULT now();

-- 4. 알림 테이블
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid REFERENCES listings(id) ON DELETE CASCADE,
  bid_id      uuid REFERENCES bids(id) ON DELETE SET NULL,
  channel     text NOT NULL,
  recipient   text NOT NULL,
  status      text NOT NULL DEFAULT 'pending',
  sent_at     timestamptz,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(listing_id, bid_id, channel)
);

-- 5. 메시지 테이블
CREATE TABLE IF NOT EXISTS messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid REFERENCES listings(id) ON DELETE CASCADE,
  agent_id    uuid REFERENCES agents(id) ON DELETE CASCADE,
  sender_role text NOT NULL,
  body        text NOT NULL,
  read_at     timestamptz,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_listing_agent_idx
  ON messages(listing_id, agent_id, created_at DESC);

-- 6. 후기 테이블
CREATE TABLE IF NOT EXISTS reviews (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id     uuid REFERENCES listings(id) ON DELETE CASCADE,
  agent_id       uuid REFERENCES agents(id) ON DELETE CASCADE,
  owner_token    uuid NOT NULL,
  rating         smallint CHECK (rating BETWEEN 1 AND 5),
  savings_amount bigint,
  body           text,
  is_public      bool DEFAULT true,
  created_at     timestamptz DEFAULT now(),
  UNIQUE(listing_id)
);

-- 7. Supabase Realtime 활성화 (messages 테이블)
-- Supabase 대시보드 > Database > Replication 에서 messages 테이블 활성화 필요
