import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/AppContext';
import NewJournalModal from '@/components/NewJournalModal';
import GardenCanvas from '@/components/GardenCanvas';
import LayoutsPanel from '@/components/LayoutsPanel';
import PlantList from '@/components/PlantList';
import PlantDetail from '@/components/PlantDetail';

export default function App() {
  const store = useAppStore();
  const { loadJournals } = store;
  const [showNewJournalModal, setShowNewJournalModal] = useState(false);

  useEffect(() => {
    loadJournals();
  }, [loadJournals]);

  return (
    <>
      <div className="min-h-screen flex flex-col">
        <header className="bg-garden-700 text-white px-4 py-3 shadow-md">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <h1 className="text-xl font-bold">Semonia</h1>

            <div className="flex items-center gap-4">
              {store.journals.length > 0 && (
                <select
                  className="bg-white text-garden-800 font-medium px-3 py-1.5 rounded-lg border border-white/80 shadow-sm [color-scheme:light] focus:outline-none focus:ring-2 focus:ring-white/60"
                  value={store.currentJournal?.year ?? ''}
                  onChange={(e) => {
                    const year = parseInt(e.target.value);
                    if (year) store.selectJournal(year);
                  }}
                >
                  <option value="" disabled className="text-gray-500">
                    Select Year
                  </option>
                  {store.journals.map((journal) => (
                    <option key={journal.id} value={journal.year} className="text-gray-900">
                      {journal.year}
                      {journal.name ? ` - ${journal.name}` : ''}
                    </option>
                  ))}
                </select>
              )}

              <button
                className="btn bg-white text-garden-700 hover:bg-garden-50"
                onClick={() => setShowNewJournalModal(true)}
              >
                New Journal
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 max-w-7xl mx-auto w-full">
          {store.loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : (
            <>
              {store.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                  {store.error}
                </div>
              )}
              <MainView />
            </>
          )}
        </main>
      </div>

      {showNewJournalModal && <NewJournalModal onClose={() => setShowNewJournalModal(false)} />}
    </>
  );
}

function MainView() {
  const store = useAppStore();
  const [selectedPlantForDetail, setSelectedPlantForDetail] = useState<number | null>(null);

  if (store.currentJournal && selectedPlantForDetail !== null) {
    return <PlantDetail plantId={selectedPlantForDetail} onBack={() => setSelectedPlantForDetail(null)} />;
  }

  if (!store.currentJournal) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="text-6xl mb-4">🌱</div>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Welcome to Semonia</h2>
        <p className="text-gray-500 mb-6">
          {store.journals.length > 0
            ? 'Select a year from the dropdown above, or create a new journal to get started.'
            : 'Create your first journal to start tracking your garden.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="card p-4">
            <h2 className="text-lg font-semibold mb-4">
              Garden{' '}
              <span className="text-sm font-normal text-gray-500">
                ({store.currentJournal.width} × {store.currentJournal.height} ft)
              </span>
            </h2>
            <GardenCanvas onViewDetail={setSelectedPlantForDetail} />
          </div>
        </div>

        <div className="space-y-4">
          <PlantList onViewDetail={setSelectedPlantForDetail} />
          <LayoutsPanel />
        </div>
      </div>
    </>
  );
}
