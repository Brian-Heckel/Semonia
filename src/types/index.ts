export interface Journal {
  id: number;
  year: number;
  /** Garden size in feet */
  width: number;
  height: number;
  name: string | null;
  created_at: string;
}

export interface Plant {
  id: number;
  journal_id: number;
  name: string;
  variety: string | null;
  description: string | null;
  color: string;
  photo_filename: string | null;
}

export interface PlantWithPlacements extends Plant {
  placements: Placement[];
}

/** One spot where a plant sits on the garden canvas; x/y are feet from the top-left. */
export interface Placement {
  id: number;
  plant_id: number;
  x: number;
  y: number;
}

export interface Layout {
  id: number;
  journal_id: number;
  name: string;
  created_at: string;
  placement_count: number;
}

export interface Entry {
  id: number;
  plant_id: number;
  title: string | null;
  content: string;
  entry_date: string;
  created_at: string;
}

export interface EntryWithPhotos extends Entry {
  photos: Photo[];
}

export interface Photo {
  id: number;
  entry_id: number;
  filename: string;
  original_name: string | null;
  caption: string | null;
}
