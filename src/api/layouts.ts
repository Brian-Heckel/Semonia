import { invoke } from '@tauri-apps/api/core';
import type { Layout } from '@/types';

export async function getLayouts(journalId: number): Promise<Layout[]> {
  return invoke('get_layouts', { journalId });
}

export async function saveLayout(journalId: number, name: string): Promise<Layout> {
  return invoke('save_layout', { journalId, name });
}

export async function restoreLayout(layoutId: number): Promise<void> {
  return invoke('restore_layout', { layoutId });
}

export async function deleteLayout(id: number): Promise<void> {
  return invoke('delete_layout', { id });
}
