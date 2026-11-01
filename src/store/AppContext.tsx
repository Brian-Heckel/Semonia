import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Journal, PlantWithPlacements, Layout } from '@/types';
import * as api from '@/api';

interface AppStore {
  journals: Journal[];
  currentJournal: Journal | null;
  plants: PlantWithPlacements[];
  layouts: Layout[];
  selectedPlantId: number | null;
  loading: boolean;
  error: string | null;
  loadJournals: () => Promise<void>;
  selectJournal: (year: number) => Promise<void>;
  loadPlants: () => Promise<void>;
  createJournal: (year: number, width: number, height: number, name?: string) => Promise<void>;
  updateJournal: (width: number, height: number, name?: string) => Promise<void>;
  copyJournal: (sourceYear: number, targetYear: number, name?: string) => Promise<void>;
  createPlant: (name: string, variety?: string, description?: string, color?: string) => Promise<void>;
  updatePlant: (id: number, name: string, variety?: string, description?: string, color?: string) => Promise<void>;
  deletePlant: (id: number) => Promise<void>;
  setPlantPhoto: (plantId: number, sourcePath: string) => Promise<void>;
  clearPlantPhoto: (plantId: number) => Promise<void>;
  selectPlant: (id: number | null) => void;
  addPlacement: (plantId: number, x: number, y: number) => Promise<void>;
  movePlacement: (id: number, x: number, y: number) => Promise<void>;
  deletePlacement: (id: number) => Promise<void>;
  saveLayout: (name: string) => Promise<void>;
  restoreLayout: (id: number) => Promise<void>;
  deleteLayout: (id: number) => Promise<void>;
}

const AppContext = createContext<AppStore | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [currentJournal, setCurrentJournal] = useState<Journal | null>(null);
  const [plants, setPlants] = useState<PlantWithPlacements[]>([]);
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [selectedPlantId, setSelectedPlantId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentJournalId = currentJournal?.id ?? null;

  // These take the journal id explicitly so callers that just switched journals
  // don't read a stale value from this render's closure.
  const fetchPlants = useCallback(async (journalId: number) => {
    try {
      setPlants(await api.getPlants(journalId));
    } catch (e) {
      setError(String(e));
    }
  }, []);

  const fetchLayouts = useCallback(async (journalId: number) => {
    try {
      setLayouts(await api.getLayouts(journalId));
    } catch (e) {
      setError(String(e));
    }
  }, []);

  const loadJournals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setJournals(await api.getJournals());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const selectJournal = useCallback(
    async (year: number) => {
      setLoading(true);
      setError(null);
      setSelectedPlantId(null);
      try {
        const journal = await api.getJournal(year);
        setCurrentJournal(journal);
        if (journal) {
          await Promise.all([fetchPlants(journal.id), fetchLayouts(journal.id)]);
        }
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    },
    [fetchPlants, fetchLayouts]
  );

  const loadPlants = useCallback(async () => {
    if (currentJournalId === null) return;
    await fetchPlants(currentJournalId);
  }, [currentJournalId, fetchPlants]);

  const createJournal = useCallback(async (year: number, width: number, height: number, name?: string) => {
    setLoading(true);
    setError(null);
    try {
      const journal = await api.createJournal(year, width, height, name);
      setJournals((prev) => [journal, ...prev].sort((a, b) => b.year - a.year));
      setCurrentJournal(journal);
      setPlants([]);
      setLayouts([]);
      setSelectedPlantId(null);
    } catch (e) {
      setError(String(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateJournal = useCallback(
    async (width: number, height: number, name?: string) => {
      if (currentJournalId === null) return;
      setError(null);
      try {
        const journal = await api.updateJournal(currentJournalId, width, height, name);
        setCurrentJournal(journal);
        setJournals((prev) => prev.map((j) => (j.id === journal.id ? journal : j)));
      } catch (e) {
        setError(String(e));
        throw e;
      }
    },
    [currentJournalId]
  );

  const copyJournal = useCallback(
    async (sourceYear: number, targetYear: number, name?: string) => {
      setLoading(true);
      setError(null);
      try {
        const journal = await api.copyJournal(sourceYear, targetYear, name);
        setJournals(await api.getJournals());
        setCurrentJournal(journal);
        setSelectedPlantId(null);
        await Promise.all([fetchPlants(journal.id), fetchLayouts(journal.id)]);
      } catch (e) {
        setError(String(e));
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchPlants, fetchLayouts]
  );

  const createPlant = useCallback(
    async (name: string, variety?: string, description?: string, color?: string) => {
      if (currentJournalId === null) return;
      setError(null);
      try {
        await api.createPlant(currentJournalId, name, variety, description, color);
        await fetchPlants(currentJournalId);
      } catch (e) {
        setError(String(e));
        throw e;
      }
    },
    [currentJournalId, fetchPlants]
  );

  const updatePlant = useCallback(
    async (id: number, name: string, variety?: string, description?: string, color?: string) => {
      setError(null);
      try {
        await api.updatePlant(id, name, variety, description, color);
        await loadPlants();
      } catch (e) {
        setError(String(e));
        throw e;
      }
    },
    [loadPlants]
  );

  const deletePlant = useCallback(
    async (id: number) => {
      setError(null);
      try {
        await api.deletePlant(id);
        setSelectedPlantId((prev) => (prev === id ? null : prev));
        await loadPlants();
        // Saved layouts lose this plant's spots via CASCADE, so their counts change
        if (currentJournalId !== null) await fetchLayouts(currentJournalId);
      } catch (e) {
        setError(String(e));
        throw e;
      }
    },
    [loadPlants, currentJournalId, fetchLayouts]
  );

  const setPlantPhoto = useCallback(
    async (plantId: number, sourcePath: string) => {
      setError(null);
      try {
        await api.setPlantPhoto(plantId, sourcePath);
        await loadPlants();
      } catch (e) {
        setError(String(e));
        throw e;
      }
    },
    [loadPlants]
  );

  const clearPlantPhoto = useCallback(
    async (plantId: number) => {
      setError(null);
      try {
        await api.clearPlantPhoto(plantId);
        await loadPlants();
      } catch (e) {
        setError(String(e));
        throw e;
      }
    },
    [loadPlants]
  );

  const selectPlant = useCallback((id: number | null) => {
    setSelectedPlantId((prev) => (prev === id ? null : id));
  }, []);

  const addPlacement = useCallback(async (plantId: number, x: number, y: number) => {
    setError(null);
    try {
      const placement = await api.addPlacement(plantId, x, y);
      setPlants((prev) =>
        prev.map((p) => (p.id === plantId ? { ...p, placements: [...p.placements, placement] } : p))
      );
    } catch (e) {
      setError(String(e));
    }
  }, []);

  // Updates local state first so the icon stays where it was dropped, then persists.
  const movePlacement = useCallback(
    async (id: number, x: number, y: number) => {
      setError(null);
      setPlants((prev) =>
        prev.map((p) =>
          p.placements.some((pl) => pl.id === id)
            ? { ...p, placements: p.placements.map((pl) => (pl.id === id ? { ...pl, x, y } : pl)) }
            : p
        )
      );
      try {
        await api.movePlacement(id, x, y);
      } catch (e) {
        setError(String(e));
        await loadPlants();
      }
    },
    [loadPlants]
  );

  const deletePlacement = useCallback(async (id: number) => {
    setError(null);
    try {
      await api.deletePlacement(id);
      setPlants((prev) => prev.map((p) => ({ ...p, placements: p.placements.filter((pl) => pl.id !== id) })));
    } catch (e) {
      setError(String(e));
    }
  }, []);

  const saveLayout = useCallback(
    async (name: string) => {
      if (currentJournalId === null) return;
      setError(null);
      try {
        const layout = await api.saveLayout(currentJournalId, name);
        setLayouts((prev) => [layout, ...prev]);
      } catch (e) {
        setError(String(e));
        throw e;
      }
    },
    [currentJournalId]
  );

  const restoreLayout = useCallback(
    async (id: number) => {
      setError(null);
      try {
        await api.restoreLayout(id);
        await loadPlants();
      } catch (e) {
        setError(String(e));
      }
    },
    [loadPlants]
  );

  const deleteLayout = useCallback(async (id: number) => {
    setError(null);
    try {
      await api.deleteLayout(id);
      setLayouts((prev) => prev.filter((l) => l.id !== id));
    } catch (e) {
      setError(String(e));
    }
  }, []);

  const value = useMemo<AppStore>(
    () => ({
      journals,
      currentJournal,
      plants,
      layouts,
      selectedPlantId,
      loading,
      error,
      loadJournals,
      selectJournal,
      loadPlants,
      createJournal,
      updateJournal,
      copyJournal,
      createPlant,
      updatePlant,
      deletePlant,
      setPlantPhoto,
      clearPlantPhoto,
      selectPlant,
      addPlacement,
      movePlacement,
      deletePlacement,
      saveLayout,
      restoreLayout,
      deleteLayout,
    }),
    [
      journals,
      currentJournal,
      plants,
      layouts,
      selectedPlantId,
      loading,
      error,
      loadJournals,
      selectJournal,
      loadPlants,
      createJournal,
      updateJournal,
      copyJournal,
      createPlant,
      updatePlant,
      deletePlant,
      setPlantPhoto,
      clearPlantPhoto,
      selectPlant,
      addPlacement,
      movePlacement,
      deletePlacement,
      saveLayout,
      restoreLayout,
      deleteLayout,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppStore(): AppStore {
  const store = useContext(AppContext);
  if (!store) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return store;
}
