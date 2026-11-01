import { invoke } from '@tauri-apps/api/core';
import type { Photo } from '@/types';

export async function addPhoto(
  entryId: number,
  sourcePath: string,
  caption?: string
): Promise<Photo> {
  return invoke('add_photo', {
    entryId,
    sourcePath,
    caption: caption || null,
  });
}

export async function deletePhoto(id: number): Promise<void> {
  return invoke('delete_photo', { id });
}

export async function getPhotoPath(filename: string): Promise<string> {
  return invoke('get_photo_path', { filename });
}
