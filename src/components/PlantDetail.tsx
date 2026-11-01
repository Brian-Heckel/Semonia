import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useAppStore } from '@/store/AppContext';
import { getEntries, createEntry, updateEntry, deleteEntry } from '@/api/entries';
import { addPhoto, deletePhoto } from '@/api/photos';
import type { EntryWithPhotos } from '@/types';
import ColorPicker from './ColorPicker';
import PhotoThumb from './PhotoThumb';
import PlantIcon from './PlantIcon';
import { confirmAction } from '@/utils/confirm';

interface Props {
  plantId: number;
  onBack: () => void;
}

function pickImage() {
  return open({
    multiple: false,
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
  });
}

function today() {
  return new Date().toISOString().split('T')[0];
}

export default function PlantDetail({ plantId, onBack }: Props) {
  const store = useAppStore();

  const [entries, setEntries] = useState<EntryWithPhotos[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlant, setEditingPlant] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);

  // Plant edit form
  const [editName, setEditName] = useState('');
  const [editVariety, setEditVariety] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('#22c55e');

  // Entry form
  const [entryTitle, setEntryTitle] = useState('');
  const [entryContent, setEntryContent] = useState('');
  const [entryDate, setEntryDate] = useState(today());

  const plant = store.plants.find((p) => p.id === plantId);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await getEntries(plantId));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [plantId]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [plantId]);

  function startEditPlant() {
    if (!plant) return;
    setEditName(plant.name);
    setEditVariety(plant.variety || '');
    setEditDescription(plant.description || '');
    setEditColor(plant.color);
    setEditingPlant(true);
  }

  async function handleUpdatePlant() {
    if (!plant || !editName.trim()) return;
    try {
      await store.updatePlant(
        plant.id,
        editName.trim(),
        editVariety.trim() || undefined,
        editDescription.trim() || undefined,
        editColor
      );
      setEditingPlant(false);
    } catch {
      // Error handled by store
    }
  }

  async function handleDeletePlant() {
    if (!plant) return;
    if (!(await confirmAction(`Delete "${plant.name}"? This will also delete all journal entries.`))) return;
    try {
      await store.deletePlant(plant.id);
      onBack();
    } catch {
      // Error handled by store
    }
  }

  function startNewEntry() {
    setEditingEntryId(null);
    setEntryTitle('');
    setEntryContent('');
    setEntryDate(today());
    setShowEntryForm(true);
  }

  function startEditEntry(entry: EntryWithPhotos) {
    setEditingEntryId(entry.id);
    setEntryTitle(entry.title || '');
    setEntryContent(entry.content);
    setEntryDate(entry.entry_date);
    setShowEntryForm(true);
  }

  async function handleSaveEntry(e: FormEvent) {
    e.preventDefault();
    if (!entryContent.trim()) return;
    try {
      if (editingEntryId) {
        await updateEntry(editingEntryId, entryContent.trim(), entryTitle.trim() || undefined, entryDate);
      } else {
        await createEntry(plantId, entryContent.trim(), entryTitle.trim() || undefined, entryDate);
      }
      setShowEntryForm(false);
      await loadEntries();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDeleteEntry(id: number) {
    if (!(await confirmAction('Delete this entry?'))) return;
    try {
      await deleteEntry(id);
      await loadEntries();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSetPlantPhoto() {
    if (!plant) return;
    try {
      const selected = await pickImage();
      if (selected) await store.setPlantPhoto(plant.id, selected);
    } catch {
      // Error handled by store
    }
  }

  async function handleClearPlantPhoto() {
    if (!plant) return;
    try {
      await store.clearPlantPhoto(plant.id);
    } catch {
      // Error handled by store
    }
  }

  async function handleAddPhoto(entryId: number) {
    try {
      const selected = await pickImage();
      if (selected) {
        await addPhoto(entryId, selected);
        await loadEntries();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDeletePhoto(id: number) {
    if (!(await confirmAction('Delete this photo?'))) return;
    try {
      await deletePhoto(id);
      await loadEntries();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <button className="text-sm text-garden-700 hover:text-garden-800 font-medium" onClick={onBack}>
        &larr; Back to garden
      </button>

      {!plant ? (
        <div className="card p-6 text-center text-gray-500">This plant no longer exists.</div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="p-4 flex items-start justify-between">
              {editingPlant ? (
                <div className="flex-1 space-y-3">
                  <input
                    type="text"
                    className="input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Plant name"
                  />
                  <input
                    type="text"
                    className="input"
                    value={editVariety}
                    onChange={(e) => setEditVariety(e.target.value)}
                    placeholder="Variety"
                  />
                  <textarea
                    className="input"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Description"
                    rows={2}
                  />
                  <ColorPicker value={editColor} onChange={setEditColor} />
                  <div className="flex gap-2">
                    <button className="btn btn-primary text-sm" onClick={handleUpdatePlant}>
                      Save
                    </button>
                    <button className="btn btn-secondary text-sm" onClick={() => setEditingPlant(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <PlantIcon plant={plant} size={56} />
                    <div>
                      <h2 className="text-xl font-bold">{plant.name}</h2>
                      {plant.variety && <div className="text-sm text-gray-500">{plant.variety}</div>}
                      <div className="flex gap-3 mt-1 text-xs">
                        <button className="text-garden-600 hover:text-garden-700" onClick={handleSetPlantPhoto}>
                          {plant.photo_filename ? 'Change photo' : 'Set photo'}
                        </button>
                        {plant.photo_filename && (
                          <button className="text-gray-400 hover:text-gray-600" onClick={handleClearPlantPhoto}>
                            Remove photo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-sm text-gray-500 hover:text-gray-700" onClick={startEditPlant}>
                      Edit
                    </button>
                    <button className="text-sm text-red-500 hover:text-red-700" onClick={handleDeletePlant}>
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>

            {plant.description && !editingPlant && (
              <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600 border-t border-gray-200 whitespace-pre-wrap">
                {plant.description}
              </div>
            )}
          </div>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Journal Entries</h3>
              <button className="text-sm text-garden-600 hover:text-garden-700 font-medium" onClick={startNewEntry}>
                + New Entry
              </button>
            </div>

            {showEntryForm && (
              <form className="card p-4 mb-4 space-y-3" onSubmit={handleSaveEntry}>
                <input
                  type="text"
                  className="input"
                  value={entryTitle}
                  onChange={(e) => setEntryTitle(e.target.value)}
                  placeholder="Title (optional)"
                />
                <textarea
                  className="input"
                  value={entryContent}
                  onChange={(e) => setEntryContent(e.target.value)}
                  placeholder="What's happening with this plant?"
                  rows={4}
                  required
                />
                <input
                  type="date"
                  className="input"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                />
                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary text-sm">
                    {editingEntryId ? 'Update' : 'Add'} Entry
                  </button>
                  <button type="button" className="btn btn-secondary text-sm" onClick={() => setShowEntryForm(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="text-center text-gray-500 py-8">Loading entries...</div>
            ) : entries.length === 0 ? (
              <div className="card text-center text-gray-500 py-8">
                No journal entries yet. Add one to track this plant's progress!
              </div>
            ) : (
              <div className="space-y-4">
                {entries.map((entry) => (
                  <div key={entry.id} className="card p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        {entry.title && <h4 className="font-medium">{entry.title}</h4>}
                        <div className="text-sm text-gray-500">{entry.entry_date}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="text-xs text-gray-400 hover:text-gray-600" onClick={() => startEditEntry(entry)}>
                          Edit
                        </button>
                        <button className="text-xs text-red-400 hover:text-red-600" onClick={() => handleDeleteEntry(entry.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{entry.content}</p>

                    {entry.photos.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {entry.photos.map((photo) => (
                          <div key={photo.id} className="relative group">
                            <PhotoThumb photo={photo} />
                            <button
                              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeletePhoto(photo.id)}
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      className="text-xs text-garden-600 hover:text-garden-700 mt-3"
                      onClick={() => handleAddPhoto(entry.id)}
                    >
                      + Add Photo
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
