import { invoke } from '@tauri-apps/api/core';
import type { Plant, PlantWithPlacements, Placement } from '@/types';

export async function getPlants(journalId: number): Promise<PlantWithPlacements[]> {
  return invoke('get_plants', { journalId });
}

export async function getPlant(id: number): Promise<PlantWithPlacements | null> {
  return invoke('get_plant', { id });
}

export async function createPlant(
  journalId: number,
  name: string,
  variety?: string,
  description?: string,
  color?: string
): Promise<Plant> {
  return invoke('create_plant', {
    journalId,
    name,
    variety: variety || null,
    description: description || null,
    color: color || null,
  });
}

export async function updatePlant(
  id: number,
  name: string,
  variety?: string,
  description?: string,
  color?: string
): Promise<Plant> {
  return invoke('update_plant', {
    id,
    name,
    variety: variety || null,
    description: description || null,
    color: color || '#22c55e',
  });
}

export async function deletePlant(id: number): Promise<void> {
  return invoke('delete_plant', { id });
}

export async function setPlantPhoto(plantId: number, sourcePath: string): Promise<Plant> {
  return invoke('set_plant_photo', { plantId, sourcePath });
}

export async function clearPlantPhoto(plantId: number): Promise<Plant> {
  return invoke('clear_plant_photo', { plantId });
}

export async function addPlacement(plantId: number, x: number, y: number): Promise<Placement> {
  return invoke('add_placement', { plantId, x, y });
}

export async function movePlacement(id: number, x: number, y: number): Promise<void> {
  return invoke('move_placement', { id, x, y });
}

export async function deletePlacement(id: number): Promise<void> {
  return invoke('delete_placement', { id });
}
