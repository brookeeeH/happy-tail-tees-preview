CREATE TABLE IF NOT EXISTS store_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  fundraiser_enabled INTEGER NOT NULL DEFAULT 0 CHECK (fundraiser_enabled IN (0, 1)),
  fundraiser_name TEXT NOT NULL DEFAULT '',
  fundraiser_message TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT NOT NULL DEFAULT 'system'
);

INSERT OR IGNORE INTO store_settings (id) VALUES (1);

CREATE TABLE IF NOT EXISTS product_drafts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  fulfillment TEXT NOT NULL CHECK (fulfillment IN ('premade', 'made_to_order', 'both')),
  image_key TEXT,
  image_type TEXT,
  square_item_id TEXT,
  variations_json TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 1000,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready_for_square', 'published', 'sync_error', 'archived')),
  square_version TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  detail_json TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_drafts_status ON product_drafts(status, display_order);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id, occurred_at);
