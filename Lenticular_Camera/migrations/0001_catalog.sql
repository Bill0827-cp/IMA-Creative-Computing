CREATE TABLE IF NOT EXISTS exhibition (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  revision INTEGER NOT NULL DEFAULT 0,
  config TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO exhibition (id, revision, config) VALUES (1, 0, '{"schemaVersion":1,"title":"低一点，看见另一面","cameraFov":60,"items":[]}');
