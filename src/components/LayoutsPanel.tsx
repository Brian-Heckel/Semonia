import { useState, type FormEvent } from 'react';
import { useAppStore } from '@/store/AppContext';
import { confirmAction } from '@/utils/confirm';

function defaultLayoutName() {
  return new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatSavedAt(createdAt: string) {
  // SQLite datetime('now') is UTC without a zone marker
  const date = new Date(createdAt.replace(' ', 'T') + 'Z');
  return isNaN(date.getTime()) ? createdAt : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function LayoutsPanel() {
  const store = useAppStore();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');

  function startSave() {
    setName(defaultLayoutName());
    setSaving(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await store.saveLayout(name.trim());
      setSaving(false);
    } catch {
      // Error handled by store
    }
  }

  async function handleRestore(id: number, layoutName: string) {
    if (!(await confirmAction(`Restore "${layoutName}"? This replaces the current arrangement. Save it first if you want to keep it.`))) return;
    store.restoreLayout(id);
  }

  async function handleDelete(id: number, layoutName: string) {
    if (!(await confirmAction(`Delete saved layout "${layoutName}"?`))) return;
    store.deleteLayout(id);
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Saved Layouts</h3>
        {!saving && (
          <button className="text-sm text-garden-600 hover:text-garden-700 font-medium" onClick={startSave}>
            + Save current
          </button>
        )}
      </div>

      {saving && (
        <form className="space-y-2 mb-4 pb-4 border-b border-gray-200" onSubmit={handleSave}>
          <input
            type="text"
            className="input text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Layout name"
            autoFocus
            required
          />
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary text-sm flex-1">
              Save
            </button>
            <button type="button" className="btn btn-secondary text-sm" onClick={() => setSaving(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {store.layouts.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-2">
          Save the current arrangement to try changes and come back to it later.
        </p>
      ) : (
        <div className="space-y-2">
          {store.layouts.map((layout) => (
            <div key={layout.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{layout.name}</div>
                <div className="text-xs text-gray-500">
                  {formatSavedAt(layout.created_at)} · {layout.placement_count} placed
                </div>
              </div>
              <button
                className="text-xs text-garden-600 hover:text-garden-700 font-medium"
                onClick={() => handleRestore(layout.id, layout.name)}
              >
                Restore
              </button>
              <button
                className="text-xs text-red-400 hover:text-red-600"
                onClick={() => handleDelete(layout.id, layout.name)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
