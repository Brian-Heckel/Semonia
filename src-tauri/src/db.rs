pub const INIT_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS journals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL UNIQUE,
    width REAL NOT NULL DEFAULT 10,
    height REAL NOT NULL DEFAULT 10,
    name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS plants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    journal_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    variety TEXT,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#22c55e',
    photo_filename TEXT,
    FOREIGN KEY (journal_id) REFERENCES journals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS placements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plant_id INTEGER NOT NULL,
    x REAL NOT NULL,
    y REAL NOT NULL,
    FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS layouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    journal_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (journal_id) REFERENCES journals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS layout_placements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    layout_id INTEGER NOT NULL,
    plant_id INTEGER NOT NULL,
    x REAL NOT NULL,
    y REAL NOT NULL,
    FOREIGN KEY (layout_id) REFERENCES layouts(id) ON DELETE CASCADE,
    FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plant_id INTEGER NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    entry_date TEXT NOT NULL DEFAULT (date('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT,
    caption TEXT,
    FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_plants_journal ON plants(journal_id);
CREATE INDEX IF NOT EXISTS idx_placements_plant ON placements(plant_id);
CREATE INDEX IF NOT EXISTS idx_layouts_journal ON layouts(journal_id);
CREATE INDEX IF NOT EXISTS idx_layout_placements_layout ON layout_placements(layout_id);
CREATE INDEX IF NOT EXISTS idx_entries_plant ON entries(plant_id);
CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_photos_entry ON photos(entry_id);

PRAGMA foreign_keys = ON;
"#;
