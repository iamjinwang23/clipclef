CREATE TABLE IF NOT EXISTS curated_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS curated_collection_items (
  collection_id UUID NOT NULL REFERENCES curated_collections(id) ON DELETE CASCADE,
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, playlist_id)
);

ALTER TABLE curated_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE curated_collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "curated_collections_read" ON curated_collections FOR SELECT USING (true);
CREATE POLICY "curated_collection_items_read" ON curated_collection_items FOR SELECT USING (true);
