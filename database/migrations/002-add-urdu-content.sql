-- Add Urdu language support and sample content
INSERT INTO languages (code, name, is_rtl, is_active) VALUES
('ur', 'Urdu', true, true),
('ar', 'Arabic', true, true),
('en', 'English', false, true);

-- Add Urdu categories
INSERT INTO categories (id, name, description, language) VALUES
(uuid_generate_v4(), 'افسانہ', 'تخیلاتی اور افسانوی کہانیاں', 'ur'),
(uuid_generate_v4(), 'سوانح عمری', 'حقیقی زندگی کی کہانیاں', 'ur'),
(uuid_generate_v4(), 'تاریخ', 'تاریخی واقعات اور تجزیے', 'ur'),
(uuid_generate_v4(), 'شاعری', 'شعری مجموعے اور تخلیقات', 'ur');

-- Sample Urdu books
INSERT INTO books (id, title, description, content, price, language, is_rtl, author_id, category_id, is_published) 
SELECT 
  uuid_generate_v4(),
  'محبت کی کہانی',
  'ایک خوبصورت محبت کی کہانی جو دو نوجوانوں کے درمیان میں پروان چڑھتی ہے',
  'پہلا باب: ملاقات...',
  5.99,
  'ur',
  true,
  (SELECT id FROM users WHERE email = 'author1@example.com'),
  (SELECT id FROM categories WHERE name = 'افسانہ' AND language = 'ur'),
  true;

INSERT INTO books (id, title, description, content, price, language, is_rtl, author_id, category_id, is_published) 
SELECT 
  uuid_generate_v4(),
  'پاکستان کی تاریخ',
  'پاکستان کے قیام اور اس کے اہم تاریخی واقعات کا احاطہ',
  'باب اول: تحریک پاکستان...',
  7.99,
  'ur',
  true,
  (SELECT id FROM users WHERE email = 'author1@example.com'),
  (SELECT id FROM categories WHERE name = 'تاریخ' AND language = 'ur'),
  true;

-- Sample live sessions in Urdu
INSERT INTO live_sessions (id, title, description, language, is_rtl, host_id, scheduled_time, duration_minutes, price, max_attendees) 
SELECT 
  uuid_generate_v4(),
  'اردو شاعری کا اجلاس',
  'اردو کی مشہور نظموں اور غزلوں پر مبنی ایک دلچسپ اجلاس',
  'ur',
  true,
  (SELECT id FROM users WHERE email = 'author1@example.com'),
  NOW() + INTERVAL '7 days',
  60,
  2.99,
  100;