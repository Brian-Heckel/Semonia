import { invoke } from '@tauri-apps/api/core';
import type { Entry, EntryWithPhotos } from '@/types';

export async function getEntries(plantId: number): Promise<EntryWithPhotos[]> {
  return invoke('get_entries', { plantId });
}

export async function getEntry(id: number): Promise<EntryWithPhotos | null> {
  return invoke('get_entry', { id });
}

export async function createEntry(
  plantId: number,
  content: string,
  title?: string,
  entryDate?: string
): Promise<Entry> {
  return invoke('create_entry', {
    plantId,
    content,
    title: title || null,
    entryDate: entryDate || null,
  });
}

export async function updateEntry(
  id: number,
  content: string,
  title?: string,
  entryDate?: string
): Promise<Entry> {
  return invoke('update_entry', {
    id,
    content,
    title: title || null,
    entryDate: entryDate || null,
  });
}

export async function deleteEntry(id: number): Promise<void> {
  return invoke('delete_entry', { id });
}
