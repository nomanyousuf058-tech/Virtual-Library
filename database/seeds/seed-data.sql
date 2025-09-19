-- Insert sample categories
INSERT INTO categories (id, name, description) VALUES
(uuid_generate_v4(), 'Fiction', 'Fictional works and novels'),
(uuid_generate_v4(), 'Science Fiction', 'Science fiction and fantasy'),
(uuid_generate_v4(), 'Mystery', 'Mystery and thriller novels'),
(uuid_generate_v4(), 'Romance', 'Romance novels and stories'),
(uuid_generate_v4(), 'Biography', 'Biographies and autobiographies'),
(uuid_generate_v4(), 'History', 'Historical works and analysis'),
(uuid_generate_v4(), 'Science', 'Scientific books and journals'),
(uuid_generate_v4(), 'Self-Help', 'Self improvement and motivation'),
(uuid_generate_v4(), 'Technology', 'Technology and programming books'),
(uuid_generate_v4(), 'Poetry', 'Poetry collections and works');

-- Insert sample users (passwords are hashed 'password123')
INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_verified) VALUES
(uuid_generate_v4(), 'admin@virtuallibrary.com', '$2b$10$examplehash', 'Admin', 'User', 'admin', true),
(uuid_generate_v4(), 'author1@example.com', '$2b$10$examplehash', 'John', 'Writer', 'writer', true),
(uuid_generate_v4(), 'translator1@example.com', '$2b$10$examplehash', 'Sarah', 'Translator', 'translator', true),
(uuid_generate_v4(), 'reader1@example.com', '$2b$10$examplehash', 'Mike', 'Reader', 'reader', true);

-- Insert sample books in English
INSERT INTO books (id, title, description, price, language, author_id, is_published, requires_review) 
SELECT 
  uuid_generate_v4(),
  'The Great Adventure',
  'An exciting adventure novel about exploration and discovery',
  9.99,
  'en',
  (SELECT id FROM users WHERE email = 'author1@example.com'),
  true,
  false;

-- Insert sample books in Urdu
INSERT INTO books (id, title, description, price, language, is_rtl, author_id, is_published, requires_review) 
SELECT 
  uuid_generate_v4(),
  'عظیم مہم جوئی',
  'ایک دلچسپ مہم جوئی کی کہانی جو دریافت اور کھوج کے بارے میں ہے',
  7.99,
  'ur',
  true,
  (SELECT id FROM users WHERE email = 'author1@example.com'),
  true,
  false;