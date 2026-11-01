import { useState, type FormEvent } from 'react';
import { useAppStore } from '@/store/AppContext';
import ColorPicker from './ColorPicker';
import PlantIcon from './PlantIcon';

interface Props {
  onViewDetail: (id: number) => void;
}

export default function PlantList({ onViewDetail }: Props) {
  const store = useAppStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newVariety, setNewVariety] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState('#22c55e');

  async function handleAddPlant(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await store.createPlant(
        newName.trim(),
        newVariety.trim() || undefined,
        newDescription.trim() || undefined,
        newColor
      );
      resetForm();
    } catch {
      // Error handled by store
    }
  }

  function resetForm() {
    setShowAddForm(false);
    setNewName('');
    setNewVariety('');
    setNewDescription('');
    setNewColor('#22c55e');
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Plants</h3>
        <button
          className="text-sm text-garden-600 hover:text-garden-700 font-medium"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {showAddForm && (
        <form className="space-y-3 mb-4 pb-4 border-b border-gray-200" onSubmit={handleAddPlant}>
          <input
            type="text"
            className="input text-sm"
            placeholder="Plant name *"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <input
            type="text"
            className="input text-sm"
            placeholder="Variety (optional)"
            value={newVariety}
            onChange={(e) => setNewVariety(e.target.value)}
          />
          <textarea
            className="input text-sm"
            placeholder="Description (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={2}
          />
          <div>
            <label className="block text-xs text-gray-500 mb-1">Color</label>
            <ColorPicker value={newColor} onChange={setNewColor} />
          </div>
          <button type="submit" className="btn btn-primary w-full text-sm">
            Add Plant
          </button>
        </form>
      )}

      {store.plants.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No plants yet. Add one to get started!</p>
      ) : (
        <>
          <div className="space-y-2">
            {store.plants.map((plant) => (
              <button
                key={plant.id}
                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                  store.selectedPlantId === plant.id ? 'bg-garden-100 ring-2 ring-garden-400' : 'hover:bg-gray-50'
                }`}
                onClick={() => store.selectPlant(plant.id)}
                onDoubleClick={() => onViewDetail(plant.id)}
              >
                <PlantIcon plant={plant} size={28} className="flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{plant.name}</div>
                  {plant.variety && <div className="text-xs text-gray-500 truncate">{plant.variety}</div>}
                </div>
                <div className="text-xs text-gray-400">{plant.placements.length} placed</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">Click to select, double-click to open its journal</p>
        </>
      )}
    </div>
  );
}
