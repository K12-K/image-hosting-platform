/*
# Create images and rate_limits tables for temporary image hosting

1. New Tables
- `images`: stores metadata for each uploaded image
  - id (uuid, primary key)
  - storage_key (text, unique) - the key/path used by the storage provider
  - original_filename (text) - the user's original filename for display
  - mime_type (text) - validated MIME type
  - size (bigint) - file size in bytes
  - uploaded_at (timestamptz) - server-side upload timestamp
  - expires_at (timestamptz) - when the image becomes eligible for deletion
  - public_url (text) - the publicly accessible HTTPS URL
  - storage_provider (text) - which storage backend was used
- `rate_limits`: tracks per-IP upload requests for rate limiting
  - id (uuid, primary key)
  - ip (text) - client IP address
  - request_type (text) - e.g. 'upload'
  - created_at (timestamptz) - when the request was logged

2. Indexes
- index on images.expires_at for efficient cleanup queries
- index on rate_limits(ip, request_type, created_at) for rate limit checks

3. Security
- Enable RLS on both tables.
- images: allow anon + authenticated full CRUD (no-auth public upload service).
- rate_limits: allow anon + authenticated INSERT and SELECT (needed for rate limiting from server routes).
- DELETE on rate_limits allowed for cleanup of old entries.

4. Important Notes
- This is a no-auth anonymous upload service, so policies use TO anon, authenticated.
- The images table is intentionally public/shared — anyone can see uploaded images.
- Rate limit entries are written by server-side code using the service role key.
*/

CREATE TABLE IF NOT EXISTS images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_key text UNIQUE NOT NULL,
  original_filename text NOT NULL,
  mime_type text NOT NULL,
  size bigint NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  public_url text NOT NULL,
  storage_provider text NOT NULL DEFAULT 'local'
);

CREATE INDEX IF NOT EXISTS idx_images_expires_at ON images (expires_at);
CREATE INDEX IF NOT EXISTS idx_images_uploaded_at ON images (uploaded_at);

ALTER TABLE images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_images" ON images;
CREATE POLICY "anon_select_images" ON images
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_images" ON images;
CREATE POLICY "anon_insert_images" ON images
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_images" ON images;
CREATE POLICY "anon_delete_images" ON images
  FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  request_type text NOT NULL DEFAULT 'upload',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON rate_limits (ip, request_type, created_at);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_rate_limits" ON rate_limits;
CREATE POLICY "anon_select_rate_limits" ON rate_limits
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_rate_limits" ON rate_limits;
CREATE POLICY "anon_insert_rate_limits" ON rate_limits
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_rate_limits" ON rate_limits;
CREATE POLICY "anon_delete_rate_limits" ON rate_limits
  FOR DELETE TO anon, authenticated USING (true);