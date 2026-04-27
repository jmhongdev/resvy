-- Demo building
INSERT INTO buildings (id, name, address, invite_code) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', '래미안 아파트', '서울특별시 강남구 테헤란로 123', 'DEMO-BUILD1');

-- Admin user (password: Admin1234! — bcrypt hash added later via app)
-- Resident user
INSERT INTO users (id, building_id, name, email, password_hash, role) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', '관리자', 'admin@resvy.com', 'PLACEHOLDER_HASH', 'admin'),
  ('a1b2c3d4-0000-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001', '김지수', 'jisu@resvy.com', 'PLACEHOLDER_HASH', 'resident');

-- Amenities
INSERT INTO amenities (id, building_id, name, description, capacity, location, slot_duration_mins) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000010', 'a1b2c3d4-0000-0000-0000-000000000001', '헬스장', '최신 운동 기구 완비', 10, 'B1층', 60),
  ('a1b2c3d4-0000-0000-0000-000000000011', 'a1b2c3d4-0000-0000-0000-000000000001', 'BBQ 공간', '옥상 바베큐 시설', 20, '옥상', 120),
  ('a1b2c3d4-0000-0000-0000-000000000012', 'a1b2c3d4-0000-0000-0000-000000000001', '커뮤니티룸', '세미나 및 모임 공간', 15, '1층', 60),
  ('a1b2c3d4-0000-0000-0000-000000000013', 'a1b2c3d4-0000-0000-0000-000000000001', '독서실', '조용한 독서 및 공부 공간', 8, '2층', 60);