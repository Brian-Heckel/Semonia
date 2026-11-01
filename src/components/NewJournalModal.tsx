import { useState, type FormEvent } from 'react';
import { useAppStore } from '@/store/AppContext';

interface Props {
  onClose: () => void;
}

export default function NewJournalModal({ onClose }: Props) {
  const store = useAppStore();

  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newWidth, setNewWidth] = useState(10);
  const [newHeight, setNewHeight] = useState(10);
  const [newName, setNewName] = useState('');
  const [copyFromYear, setCopyFromYear] = useState<number | null>(null);

  async function handleCreateJournal(e: FormEvent) {
    e.preventDefault();
    try {
      if (copyFromYear !== null) {
        await store.copyJournal(copyFromYear, newYear, newName || undefined);
      } else {
        await store.createJournal(newYear, newWidth, newHeight, newName || undefined);
      }
      onClose();
    } catch {
      // Error handled by store
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Create New Journal</h2>

        <form onSubmit={handleCreateJournal}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <input
                type="number"
                className="input"
                value={newYear}
                onChange={(e) => setNewYear(e.target.valueAsNumber)}
                min={1900}
                max={2100}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name (optional)</label>
              <input
                type="text"
                className="input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My Garden"
              />
            </div>

            {store.journals.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Copy from previous year?</label>
                <select
                  className="input"
                  value={copyFromYear ?? ''}
                  onChange={(e) => setCopyFromYear(e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">Start fresh</option>
                  {store.journals.map((journal) => (
                    <option key={journal.id} value={journal.year}>
                      {journal.year}
                      {journal.name ? ` - ${journal.name}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Copies plants, photos and garden layout, not journal entries</p>
              </div>
            )}

            {copyFromYear === null && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Garden Width (ft)</label>
                  <input
                    type="number"
                    className="input"
                    value={newWidth}
                    onChange={(e) => setNewWidth(e.target.valueAsNumber)}
                    min={1}
                    max={500}
                    step={0.5}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Garden Height (ft)</label>
                  <input
                    type="number"
                    className="input"
                    value={newHeight}
                    onChange={(e) => setNewHeight(e.target.valueAsNumber)}
                    min={1}
                    max={500}
                    step={0.5}
                    required
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
