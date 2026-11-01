mod db;
mod models;

use models::*;
use sqlx::{sqlite::SqlitePoolOptions, Pool, Sqlite};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::{AppHandle, Manager, State};
use tokio::sync::Mutex;
use uuid::Uuid;

pub struct AppState {
    pub db: Arc<Mutex<Pool<Sqlite>>>,
}

// Helper to get photos directory
fn get_photos_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let photos_dir = app_data.join("photos");
    if !photos_dir.exists() {
        fs::create_dir_all(&photos_dir).map_err(|e| e.to_string())?;
    }
    Ok(photos_dir)
}

// Copy a file into the photos directory under a new UUID name.
// Returns (stored filename, original filename).
fn copy_into_photos(app: &AppHandle, source_path: &Path) -> Result<(String, Option<String>), String> {
    let photos_dir = get_photos_dir(app)?;
    let original_name = source_path.file_name().and_then(|n| n.to_str()).map(String::from);
    let extension = source_path.extension().and_then(|e| e.to_str()).unwrap_or("jpg");
    let filename = format!("{}.{}", Uuid::new_v4(), extension);

    fs::copy(source_path, photos_dir.join(&filename)).map_err(|e| e.to_string())?;
    Ok((filename, original_name))
}

fn remove_photo_file(app: &AppHandle, filename: &str) {
    if let Ok(photos_dir) = get_photos_dir(app) {
        let _ = fs::remove_file(photos_dir.join(filename));
    }
}

async fn fetch_journal(pool: &Pool<Sqlite>, id: i64) -> Result<Journal, String> {
    sqlx::query_as::<_, Journal>("SELECT * FROM journals WHERE id = ?")
        .bind(id)
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())
}

async fn fetch_plant(pool: &Pool<Sqlite>, id: i64) -> Result<Plant, String> {
    sqlx::query_as::<_, Plant>("SELECT * FROM plants WHERE id = ?")
        .bind(id)
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())
}

// ============ Journal Commands ============

#[tauri::command]
async fn get_journals(state: State<'_, AppState>) -> Result<Vec<Journal>, String> {
    let pool = state.db.lock().await;
    sqlx::query_as::<_, Journal>("SELECT * FROM journals ORDER BY year DESC")
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_journal(state: State<'_, AppState>, year: i32) -> Result<Option<Journal>, String> {
    let pool = state.db.lock().await;
    sqlx::query_as::<_, Journal>("SELECT * FROM journals WHERE year = ?")
        .bind(year)
        .fetch_optional(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_journal(
    state: State<'_, AppState>,
    year: i32,
    width: f64,
    height: f64,
    name: Option<String>,
) -> Result<Journal, String> {
    let pool = state.db.lock().await;
    let id = sqlx::query("INSERT INTO journals (year, width, height, name) VALUES (?, ?, ?, ?)")
        .bind(year)
        .bind(width)
        .bind(height)
        .bind(&name)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?
        .last_insert_rowid();

    fetch_journal(&pool, id).await
}

#[tauri::command]
async fn update_journal(
    state: State<'_, AppState>,
    id: i64,
    width: f64,
    height: f64,
    name: Option<String>,
) -> Result<Journal, String> {
    let pool = state.db.lock().await;
    sqlx::query("UPDATE journals SET width = ?, height = ?, name = ? WHERE id = ?")
        .bind(width)
        .bind(height)
        .bind(&name)
        .bind(id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    fetch_journal(&pool, id).await
}

#[tauri::command]
async fn delete_journal(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let pool = state.db.lock().await;
    sqlx::query("DELETE FROM journals WHERE id = ?")
        .bind(id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn copy_journal(
    app: AppHandle,
    state: State<'_, AppState>,
    source_year: i32,
    target_year: i32,
    target_name: Option<String>,
) -> Result<Journal, String> {
    let pool = state.db.lock().await;

    // Get source journal
    let source = sqlx::query_as::<_, Journal>("SELECT * FROM journals WHERE year = ?")
        .bind(source_year)
        .fetch_optional(&*pool)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Source journal not found")?;

    let source_plants = sqlx::query_as::<_, Plant>("SELECT * FROM plants WHERE journal_id = ?")
        .bind(source.id)
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    let photos_dir = get_photos_dir(&app)?;
    let mut copied_photos = Vec::new();
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // Create target journal
    let new_journal_id = sqlx::query("INSERT INTO journals (year, width, height, name) VALUES (?, ?, ?, ?)")
        .bind(target_year)
        .bind(source.width)
        .bind(source.height)
        .bind(&target_name)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?
        .last_insert_rowid();

    // Copy each plant, its photo (as its own file) and its placements
    for plant in source_plants {
        let photo_filename = match &plant.photo_filename {
            Some(filename) => match copy_into_photos(&app, &photos_dir.join(filename)) {
                Ok((new_filename, _)) => {
                    copied_photos.push(new_filename.clone());
                    Some(new_filename)
                }
                Err(_) => None,
            },
            None => None,
        };

        let new_plant_id = sqlx::query(
            "INSERT INTO plants (journal_id, name, variety, description, color, photo_filename) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(new_journal_id)
        .bind(&plant.name)
        .bind(&plant.variety)
        .bind(&plant.description)
        .bind(&plant.color)
        .bind(&photo_filename)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?
        .last_insert_rowid();

        sqlx::query("INSERT INTO placements (plant_id, x, y) SELECT ?, x, y FROM placements WHERE plant_id = ?")
            .bind(new_plant_id)
            .bind(plant.id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }

    if let Err(e) = tx.commit().await {
        for filename in &copied_photos {
            remove_photo_file(&app, filename);
        }
        return Err(e.to_string());
    }

    fetch_journal(&pool, new_journal_id).await
}

// ============ Plant Commands ============

#[tauri::command]
async fn get_plants(state: State<'_, AppState>, journal_id: i64) -> Result<Vec<PlantWithPlacements>, String> {
    let pool = state.db.lock().await;

    let plants = sqlx::query_as::<_, Plant>("SELECT * FROM plants WHERE journal_id = ? ORDER BY name")
        .bind(journal_id)
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    let placements = sqlx::query_as::<_, Placement>(
        "SELECT pl.* FROM placements pl JOIN plants p ON pl.plant_id = p.id WHERE p.journal_id = ? ORDER BY pl.id",
    )
    .bind(journal_id)
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut by_plant: HashMap<i64, Vec<Placement>> = HashMap::new();
    for placement in placements {
        by_plant.entry(placement.plant_id).or_default().push(placement);
    }

    Ok(plants
        .into_iter()
        .map(|plant| {
            let placements = by_plant.remove(&plant.id).unwrap_or_default();
            PlantWithPlacements { plant, placements }
        })
        .collect())
}

#[tauri::command]
async fn get_plant(state: State<'_, AppState>, id: i64) -> Result<Option<PlantWithPlacements>, String> {
    let pool = state.db.lock().await;

    let plant = sqlx::query_as::<_, Plant>("SELECT * FROM plants WHERE id = ?")
        .bind(id)
        .fetch_optional(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    match plant {
        Some(plant) => {
            let placements = sqlx::query_as::<_, Placement>("SELECT * FROM placements WHERE plant_id = ? ORDER BY id")
                .bind(id)
                .fetch_all(&*pool)
                .await
                .map_err(|e| e.to_string())?;

            Ok(Some(PlantWithPlacements { plant, placements }))
        }
        None => Ok(None),
    }
}

#[tauri::command]
async fn create_plant(
    state: State<'_, AppState>,
    journal_id: i64,
    name: String,
    variety: Option<String>,
    description: Option<String>,
    color: Option<String>,
) -> Result<Plant, String> {
    let pool = state.db.lock().await;
    let color_val = color.unwrap_or_else(|| "#22c55e".to_string());

    let id = sqlx::query("INSERT INTO plants (journal_id, name, variety, description, color) VALUES (?, ?, ?, ?, ?)")
        .bind(journal_id)
        .bind(&name)
        .bind(&variety)
        .bind(&description)
        .bind(&color_val)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?
        .last_insert_rowid();

    fetch_plant(&pool, id).await
}

#[tauri::command]
async fn update_plant(
    state: State<'_, AppState>,
    id: i64,
    name: String,
    variety: Option<String>,
    description: Option<String>,
    color: String,
) -> Result<Plant, String> {
    let pool = state.db.lock().await;

    sqlx::query("UPDATE plants SET name = ?, variety = ?, description = ?, color = ? WHERE id = ?")
        .bind(&name)
        .bind(&variety)
        .bind(&description)
        .bind(&color)
        .bind(id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    fetch_plant(&pool, id).await
}

#[tauri::command]
async fn delete_plant(app: AppHandle, state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let pool = state.db.lock().await;
    let plant = fetch_plant(&pool, id).await?;

    sqlx::query("DELETE FROM plants WHERE id = ?")
        .bind(id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(filename) = plant.photo_filename {
        remove_photo_file(&app, &filename);
    }
    Ok(())
}

#[tauri::command]
async fn set_plant_photo(
    app: AppHandle,
    state: State<'_, AppState>,
    plant_id: i64,
    source_path: String,
) -> Result<Plant, String> {
    let pool = state.db.lock().await;
    let old = fetch_plant(&pool, plant_id).await?;
    let (filename, _) = copy_into_photos(&app, Path::new(&source_path))?;

    if let Err(e) = sqlx::query("UPDATE plants SET photo_filename = ? WHERE id = ?")
        .bind(&filename)
        .bind(plant_id)
        .execute(&*pool)
        .await
    {
        remove_photo_file(&app, &filename);
        return Err(e.to_string());
    }

    if let Some(old_filename) = old.photo_filename {
        remove_photo_file(&app, &old_filename);
    }
    fetch_plant(&pool, plant_id).await
}

#[tauri::command]
async fn clear_plant_photo(app: AppHandle, state: State<'_, AppState>, plant_id: i64) -> Result<Plant, String> {
    let pool = state.db.lock().await;
    let old = fetch_plant(&pool, plant_id).await?;

    sqlx::query("UPDATE plants SET photo_filename = NULL WHERE id = ?")
        .bind(plant_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(old_filename) = old.photo_filename {
        remove_photo_file(&app, &old_filename);
    }
    fetch_plant(&pool, plant_id).await
}

// ============ Placement Commands ============

#[tauri::command]
async fn add_placement(state: State<'_, AppState>, plant_id: i64, x: f64, y: f64) -> Result<Placement, String> {
    let pool = state.db.lock().await;
    let id = sqlx::query("INSERT INTO placements (plant_id, x, y) VALUES (?, ?, ?)")
        .bind(plant_id)
        .bind(x)
        .bind(y)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?
        .last_insert_rowid();

    sqlx::query_as::<_, Placement>("SELECT * FROM placements WHERE id = ?")
        .bind(id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn move_placement(state: State<'_, AppState>, id: i64, x: f64, y: f64) -> Result<(), String> {
    let pool = state.db.lock().await;
    sqlx::query("UPDATE placements SET x = ?, y = ? WHERE id = ?")
        .bind(x)
        .bind(y)
        .bind(id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn delete_placement(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let pool = state.db.lock().await;
    sqlx::query("DELETE FROM placements WHERE id = ?")
        .bind(id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ============ Layout Commands ============

const LAYOUT_SELECT: &str = "SELECT l.id, l.journal_id, l.name, l.created_at,
    (SELECT COUNT(*) FROM layout_placements lp WHERE lp.layout_id = l.id) AS placement_count
    FROM layouts l";

#[tauri::command]
async fn get_layouts(state: State<'_, AppState>, journal_id: i64) -> Result<Vec<Layout>, String> {
    let pool = state.db.lock().await;
    sqlx::query_as::<_, Layout>(&format!("{LAYOUT_SELECT} WHERE l.journal_id = ? ORDER BY l.created_at DESC, l.id DESC"))
        .bind(journal_id)
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_layout(state: State<'_, AppState>, journal_id: i64, name: String) -> Result<Layout, String> {
    let pool = state.db.lock().await;
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    let layout_id = sqlx::query("INSERT INTO layouts (journal_id, name) VALUES (?, ?)")
        .bind(journal_id)
        .bind(&name)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?
        .last_insert_rowid();

    sqlx::query(
        "INSERT INTO layout_placements (layout_id, plant_id, x, y)
         SELECT ?, pl.plant_id, pl.x, pl.y FROM placements pl
         JOIN plants p ON pl.plant_id = p.id WHERE p.journal_id = ?",
    )
    .bind(layout_id)
    .bind(journal_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Layout>(&format!("{LAYOUT_SELECT} WHERE l.id = ?"))
        .bind(layout_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

// Replace the journal's current placements with the layout's snapshot.
// Plants deleted since the snapshot was taken were already removed from it by CASCADE.
#[tauri::command]
async fn restore_layout(state: State<'_, AppState>, layout_id: i64) -> Result<(), String> {
    let pool = state.db.lock().await;
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    let journal_id: i64 = sqlx::query_scalar("SELECT journal_id FROM layouts WHERE id = ?")
        .bind(layout_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Layout not found")?;

    sqlx::query("DELETE FROM placements WHERE plant_id IN (SELECT id FROM plants WHERE journal_id = ?)")
        .bind(journal_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("INSERT INTO placements (plant_id, x, y) SELECT plant_id, x, y FROM layout_placements WHERE layout_id = ?")
        .bind(layout_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_layout(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let pool = state.db.lock().await;
    sqlx::query("DELETE FROM layouts WHERE id = ?")
        .bind(id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ============ Entry Commands ============

#[tauri::command]
async fn get_entries(state: State<'_, AppState>, plant_id: i64) -> Result<Vec<EntryWithPhotos>, String> {
    let pool = state.db.lock().await;

    let entries = sqlx::query_as::<_, Entry>(
        "SELECT * FROM entries WHERE plant_id = ? ORDER BY entry_date DESC, created_at DESC",
    )
    .bind(plant_id)
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for entry in entries {
        let photos = sqlx::query_as::<_, Photo>("SELECT * FROM photos WHERE entry_id = ?")
            .bind(entry.id)
            .fetch_all(&*pool)
            .await
            .map_err(|e| e.to_string())?;

        result.push(EntryWithPhotos {
            id: entry.id,
            plant_id: entry.plant_id,
            title: entry.title,
            content: entry.content,
            entry_date: entry.entry_date,
            created_at: entry.created_at,
            photos,
        });
    }

    Ok(result)
}

#[tauri::command]
async fn get_entry(state: State<'_, AppState>, id: i64) -> Result<Option<EntryWithPhotos>, String> {
    let pool = state.db.lock().await;

    let entry = sqlx::query_as::<_, Entry>("SELECT * FROM entries WHERE id = ?")
        .bind(id)
        .fetch_optional(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    match entry {
        Some(entry) => {
            let photos = sqlx::query_as::<_, Photo>("SELECT * FROM photos WHERE entry_id = ?")
                .bind(id)
                .fetch_all(&*pool)
                .await
                .map_err(|e| e.to_string())?;

            Ok(Some(EntryWithPhotos {
                id: entry.id,
                plant_id: entry.plant_id,
                title: entry.title,
                content: entry.content,
                entry_date: entry.entry_date,
                created_at: entry.created_at,
                photos,
            }))
        }
        None => Ok(None),
    }
}

#[tauri::command]
async fn create_entry(
    state: State<'_, AppState>,
    plant_id: i64,
    title: Option<String>,
    content: String,
    entry_date: Option<String>,
) -> Result<Entry, String> {
    let pool = state.db.lock().await;
    let date = entry_date.unwrap_or_else(|| chrono::Local::now().format("%Y-%m-%d").to_string());

    let id = sqlx::query("INSERT INTO entries (plant_id, title, content, entry_date) VALUES (?, ?, ?, ?)")
        .bind(plant_id)
        .bind(&title)
        .bind(&content)
        .bind(&date)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?
        .last_insert_rowid();

    sqlx::query_as::<_, Entry>("SELECT * FROM entries WHERE id = ?")
        .bind(id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_entry(
    state: State<'_, AppState>,
    id: i64,
    title: Option<String>,
    content: String,
    entry_date: Option<String>,
) -> Result<Entry, String> {
    let pool = state.db.lock().await;

    if let Some(date) = entry_date {
        sqlx::query("UPDATE entries SET title = ?, content = ?, entry_date = ? WHERE id = ?")
            .bind(&title)
            .bind(&content)
            .bind(&date)
            .bind(id)
            .execute(&*pool)
            .await
            .map_err(|e| e.to_string())?;
    } else {
        sqlx::query("UPDATE entries SET title = ?, content = ? WHERE id = ?")
            .bind(&title)
            .bind(&content)
            .bind(id)
            .execute(&*pool)
            .await
            .map_err(|e| e.to_string())?;
    }

    sqlx::query_as::<_, Entry>("SELECT * FROM entries WHERE id = ?")
        .bind(id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_entry(app: AppHandle, state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let pool = state.db.lock().await;

    // Get photos to delete
    let photos = sqlx::query_as::<_, Photo>("SELECT * FROM photos WHERE entry_id = ?")
        .bind(id)
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    // Delete photo files
    for photo in photos {
        remove_photo_file(&app, &photo.filename);
    }

    sqlx::query("DELETE FROM entries WHERE id = ?")
        .bind(id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ============ Photo Commands ============

#[tauri::command]
async fn add_photo(
    app: AppHandle,
    state: State<'_, AppState>,
    entry_id: i64,
    source_path: String,
    caption: Option<String>,
) -> Result<Photo, String> {
    let pool = state.db.lock().await;
    let (filename, original_name) = copy_into_photos(&app, Path::new(&source_path))?;

    let id = sqlx::query("INSERT INTO photos (entry_id, filename, original_name, caption) VALUES (?, ?, ?, ?)")
        .bind(entry_id)
        .bind(&filename)
        .bind(&original_name)
        .bind(&caption)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?
        .last_insert_rowid();

    sqlx::query_as::<_, Photo>("SELECT * FROM photos WHERE id = ?")
        .bind(id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_photo(app: AppHandle, state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let pool = state.db.lock().await;

    // Get filename
    let photo = sqlx::query_as::<_, Photo>("SELECT * FROM photos WHERE id = ?")
        .bind(id)
        .fetch_optional(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(photo) = photo {
        remove_photo_file(&app, &photo.filename);
    }

    sqlx::query("DELETE FROM photos WHERE id = ?")
        .bind(id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn get_photo_path(app: AppHandle, filename: String) -> Result<String, String> {
    let photos_dir = get_photos_dir(&app)?;
    let photo_path = photos_dir.join(&filename);

    if photo_path.exists() {
        Ok(photo_path.to_string_lossy().to_string())
    } else {
        Err("Photo not found".to_string())
    }
}

// ============ App Entry Point ============


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_data = app.path().app_data_dir().expect("Failed to get app data dir");
            fs::create_dir_all(&app_data).expect("Failed to create app data dir");

            let db_path = app_data.join("garden.db");
            let db_url = format!("sqlite:{}?mode=rwc", db_path.display());

            // Initialize database synchronously during setup, on Tauri's own runtime
            // so the pool isn't tied to a runtime that gets dropped.
            let pool = tauri::async_runtime::block_on(async {
                let pool = SqlitePoolOptions::new()
                    .max_connections(5)
                    .connect(&db_url)
                    .await
                    .expect("Failed to create pool");

                sqlx::raw_sql(db::INIT_SQL)
                    .execute(&pool)
                    .await
                    .expect("Failed to initialize database");

                pool
            });

            app.manage(AppState {
                db: Arc::new(Mutex::new(pool)),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Journal commands
            get_journals,
            get_journal,
            create_journal,
            update_journal,
            delete_journal,
            copy_journal,
            // Plant commands
            get_plants,
            get_plant,
            create_plant,
            update_plant,
            delete_plant,
            set_plant_photo,
            clear_plant_photo,
            // Placement commands
            add_placement,
            move_placement,
            delete_placement,
            // Layout commands
            get_layouts,
            save_layout,
            restore_layout,
            delete_layout,
            // Entry commands
            get_entries,
            get_entry,
            create_entry,
            update_entry,
            delete_entry,
            // Photo commands
            add_photo,
            delete_photo,
            get_photo_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
