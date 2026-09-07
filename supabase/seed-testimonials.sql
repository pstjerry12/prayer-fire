ALTER TABLE testimonials ALTER COLUMN name DROP NOT NULL;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;

INSERT INTO testimonials (id, name, location, testimony, is_anonymous, approved, created_at) VALUES
  ('seed-testimony-1', 'Grace O.', 'Lagos, Nigeria', 'I used to struggle to pray for more than five minutes. The daily schedule gave me a rhythm, and now the midnight hour is the highlight of my day.', false, true, now()),
  ('seed-testimony-2', NULL, 'Houston, USA', 'My marriage was falling apart. Praying with the community group at noon every day for three months changed how I see my husband. We''re stronger now.', true, true, now()),
  ('seed-testimony-3', 'Emeka N.', 'Enugu, Nigeria', 'I lost my job in January and almost gave up hope. The morning watch prayers kept me anchored, and by March I had a better offer than the one I lost.', false, true, now()),
  ('seed-testimony-4', 'Ruth A.', 'London, UK', 'Reading the KJV Bible plan alongside the prayer prompts helped me understand scripture in a way ten years of church attendance hadn''t.', false, true, now()),
  ('seed-testimony-5', NULL, NULL, 'I joined a prayer group through this app not knowing anyone. Six months later, three of those strangers are now my closest accountability partners.', true, true, now())
ON CONFLICT (id) DO NOTHING;
