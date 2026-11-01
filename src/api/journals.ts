import { invoke } from '@tauri-apps/api/core';
import type { Journal } from '@/types';

export async function getJournals(): Promise<Journal[]> {
  return invoke('get_journals');
}

export async function getJournal(year: number): Promise<Journal | null> {
  return invoke('get_journal', { year });
}

export async function createJournal(
  year: number,
  width: number,
  height: number,
  name?: string
): Promise<Journal> {
  return invoke('create_journal', {
    year,
    width,
    height,
    name: name || null,
  });
}

export async function updateJournal(
  id: number,
  width: number,
  height: number,
  name?: string
): Promise<Journal> {
  return invoke('update_journal', {
    id,
    width,
    height,
    name: name || null,
  });
}

export async function deleteJournal(id: number): Promise<void> {
  return invoke('delete_journal', { id });
}

export async function copyJournal(
  sourceYear: number,
  targetYear: number,
  targetName?: string
): Promise<Journal> {
  return invoke('copy_journal', {
    sourceYear,
    targetYear,
    targetName: targetName || null,
  });
}
