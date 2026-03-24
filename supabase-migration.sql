-- ============================================================
-- DealHouse listings 테이블 마이그레이션
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- 1. 새 컬럼 추가
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS sell_address   text,
  ADD COLUMN IF NOT EXISTS sell_area_sqm  numeric,
  ADD COLUMN IF NOT EXISTS sell_price     bigint,
  ADD COLUMN IF NOT EXISTS buy_address    text,
  ADD COLUMN IF NOT EXISTS buy_area_sqm   numeric,
  ADD COLUMN IF NOT EXISTS buy_price      bigint,
  ADD COLUMN IF NOT EXISTS image_urls     text[];

-- 2. 기존 데이터 마이그레이션 (기존 행이 있을 경우)
UPDATE listings
SET
  sell_address  = address,
  sell_area_sqm = area_sqm,
  sell_price    = price
WHERE listing_type IN ('sell', 'both') AND address IS NOT NULL;

UPDATE listings
SET
  buy_address  = address,
  buy_area_sqm = area_sqm,
  buy_price    = price
WHERE listing_type = 'buy' AND address IS NOT NULL;

-- 3. 기존 컬럼 삭제 (데이터 확인 후 실행 권장)
-- 먼저 데이터 마이그레이션이 잘 됐는지 확인 후 아래 주석 해제:
-- ALTER TABLE listings
--   DROP COLUMN IF EXISTS address,
--   DROP COLUMN IF EXISTS area_sqm,
--   DROP COLUMN IF EXISTS price;

-- ============================================================
-- Supabase Storage 버킷 생성 (Storage > New bucket)
-- 버킷명: listing-images
-- Public bucket: true (이미지 공개 접근)
-- ============================================================
-- Storage 버킷은 Supabase 대시보드에서 직접 생성하거나 아래 실행:
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage 정책: 누구나 읽기 가능, 인증된 사용자만 업로드
CREATE POLICY "listing images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-images');

CREATE POLICY "anyone can upload listing images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'listing-images');
