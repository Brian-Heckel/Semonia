use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Journal {
    pub id: i64,
    pub year: i32,
    /// Garden size in feet
    pub width: f64,
    pub height: f64,
    pub name: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Plant {
    pub id: i64,
    pub journal_id: i64,
    pub name: String,
    pub variety: Option<String>,
    pub description: Option<String>,
    pub color: String,
    pub photo_filename: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlantWithPlacements {
    #[serde(flatten)]
    pub plant: Plant,
    pub placements: Vec<Placement>,
}

/// One spot where a plant sits on the garden canvas; x/y are in feet from the top-left.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Placement {
    pub id: i64,
    pub plant_id: i64,
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Layout {
    pub id: i64,
    pub journal_id: i64,
    pub name: String,
    pub created_at: String,
    pub placement_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Entry {
    pub id: i64,
    pub plant_id: i64,
    pub title: Option<String>,
    pub content: String,
    pub entry_date: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntryWithPhotos {
    pub id: i64,
    pub plant_id: i64,
    pub title: Option<String>,
    pub content: String,
    pub entry_date: String,
    pub created_at: String,
    pub photos: Vec<Photo>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Photo {
    pub id: i64,
    pub entry_id: i64,
    pub filename: String,
    pub original_name: Option<String>,
    pub caption: Option<String>,
}
