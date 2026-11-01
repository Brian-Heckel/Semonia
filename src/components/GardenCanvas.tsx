import { useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent } from 'react';
import { useAppStore } from '@/store/AppContext';
import type { Placement, PlantWithPlacements } from '@/types';
import PlantIcon from './PlantIcon';

interface Props {
  onViewDetail: (plantId: number) => void;
}

interface DragState {
  placementId: number;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  x: number;
  y: number;
  moved: boolean;
}

const ICON_SIZE = 40;
const DRAG_THRESHOLD_PX = 3;
const SNAP_FT = 0.5;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatFeet(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default function GardenCanvas({ onViewDetail }: Props) {
  const store = useAppStore();
  const journal = store.currentJournal;
  const canvasRef = useRef<HTMLDivElement>(null);

  const [drag, setDrag] = useState<DragState | null>(null);
  const [selectedPlacementId, setSelectedPlacementId] = useState<number | null>(null);
  const [snap, setSnap] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [resizeWidth, setResizeWidth] = useState(0);
  const [resizeHeight, setResizeHeight] = useState(0);

  if (!journal) return null;
  const W = journal.width;
  const H = journal.height;

  const selectedPlant = store.plants.find((p) => p.id === store.selectedPlantId);
  const items: { plant: PlantWithPlacements; placement: Placement }[] = store.plants.flatMap((plant) =>
    plant.placements.map((placement) => ({ plant, placement }))
  );

  // Convert a pointer position to garden feet, clamped to the garden and optionally snapped.
  function toFeet(clientX: number, clientY: number) {
    const rect = canvasRef.current!.getBoundingClientRect();
    let x = ((clientX - rect.left) / rect.width) * W;
    let y = ((clientY - rect.top) / rect.height) * H;
    if (snap) {
      x = Math.round(x / SNAP_FT) * SNAP_FT;
      y = Math.round(y / SNAP_FT) * SNAP_FT;
    }
    return { x: clamp(x, 0, W), y: clamp(y, 0, H) };
  }

  function handleCanvasClick(e: React.MouseEvent) {
    canvasRef.current?.focus();
    setSelectedPlacementId(null);
    if (!selectedPlant) return;
    const { x, y } = toFeet(e.clientX, e.clientY);
    store.addPlacement(selectedPlant.id, x, y);
  }

  function handleIconPointerDown(e: PointerEvent, placement: Placement) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    canvasRef.current?.focus();
    setSelectedPlacementId(placement.id);
    setDrag({
      placementId: placement.id,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      x: placement.x,
      y: placement.y,
      moved: false,
    });
  }

  function handleIconPointerMove(e: PointerEvent) {
    if (!drag || drag.pointerId !== e.pointerId) return;
    const moved =
      drag.moved ||
      Math.hypot(e.clientX - drag.startClientX, e.clientY - drag.startClientY) > DRAG_THRESHOLD_PX;
    if (!moved) return;
    setDrag({ ...drag, ...toFeet(e.clientX, e.clientY), moved: true });
  }

  function handleIconPointerUp(e: PointerEvent) {
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (drag.moved) {
      store.movePlacement(drag.placementId, drag.x, drag.y);
    }
    setDrag(null);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (selectedPlacementId !== null && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault();
      store.deletePlacement(selectedPlacementId);
      setSelectedPlacementId(null);
    } else if (e.key === 'Escape') {
      setSelectedPlacementId(null);
      if (store.selectedPlantId !== null) store.selectPlant(null);
    }
  }

  function startResize() {
    setResizeWidth(W);
    setResizeHeight(H);
    setResizing(true);
  }

  async function handleResize(e: FormEvent) {
    e.preventDefault();
    if (!(resizeWidth > 0 && resizeHeight > 0)) return;
    try {
      await store.updateJournal(resizeWidth, resizeHeight, journal!.name ?? undefined);
      setResizing(false);
    } catch {
      // Error handled by store
    }
  }

  // Faint line every foot, stronger every 5 ft
  const gridLine = (key: string, x1: number, y1: number, x2: number, y2: number, major: boolean) => (
    <line
      key={key}
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      strokeWidth={1}
      vectorEffect="non-scaling-stroke"
      className={major ? 'stroke-amber-900/25' : 'stroke-amber-900/10'}
    />
  );
  const gridLines = [];
  for (let x = 1; x < W; x++) gridLines.push(gridLine(`v${x}`, x, 0, x, H, x % 5 === 0));
  for (let y = 1; y < H; y++) gridLines.push(gridLine(`h${y}`, 0, y, W, y, y % 5 === 0));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="text-sm text-gray-500">
          {selectedPlant ? (
            <>
              <span className="text-garden-600 font-medium">Click the garden to place {selectedPlant.name}.</span>{' '}
              Esc to stop.
            </>
          ) : (
            'Select a plant from the list, then click to place it. Drag icons to move them.'
          )}
        </div>

        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-1.5 text-gray-600 cursor-pointer">
            <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} className="accent-garden-600" />
            Snap to ½ ft
          </label>
          {!resizing && (
            <button className="text-gray-500 hover:text-gray-700" onClick={startResize}>
              Resize
            </button>
          )}
        </div>
      </div>

      {resizing && (
        <form className="flex flex-wrap items-end gap-3 mb-3 p-3 bg-gray-50 rounded-lg" onSubmit={handleResize}>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Width (ft)</label>
            <input
              type="number"
              className="input text-sm w-24"
              value={resizeWidth}
              onChange={(e) => setResizeWidth(e.target.valueAsNumber)}
              min={1}
              max={500}
              step={0.5}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Height (ft)</label>
            <input
              type="number"
              className="input text-sm w-24"
              value={resizeHeight}
              onChange={(e) => setResizeHeight(e.target.valueAsNumber)}
              min={1}
              max={500}
              step={0.5}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary text-sm">
            Save
          </button>
          <button type="button" className="btn btn-secondary text-sm" onClick={() => setResizing(false)}>
            Cancel
          </button>
          <p className="w-full text-xs text-gray-500">Plants outside the new size are shown at the nearest edge.</p>
        </form>
      )}

      <div
        ref={canvasRef}
        tabIndex={0}
        className={`relative mx-auto bg-amber-50 border-2 border-amber-200 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-garden-400 touch-none ${
          selectedPlant ? 'cursor-crosshair' : 'cursor-default'
        }`}
        style={{ aspectRatio: `${W} / ${H}`, width: `min(100%, calc(70vh * ${W / H}))` }}
        onClick={handleCanvasClick}
        onKeyDown={handleKeyDown}
      >
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
        >
          {gridLines}
        </svg>

        {items.map(({ plant, placement }) => {
          const dragging = drag?.placementId === placement.id && drag.moved;
          const x = clamp(dragging ? drag.x : placement.x, 0, W);
          const y = clamp(dragging ? drag.y : placement.y, 0, H);
          const selected = selectedPlacementId === placement.id;
          return (
            <div
              key={placement.id}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full touch-none ${
                dragging ? 'z-20 cursor-grabbing scale-110' : 'z-10 cursor-grab'
              } ${selected ? 'ring-2 ring-offset-2 ring-garden-500' : ''}`}
              style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` }}
              title={`${plant.name}${plant.variety ? ` (${plant.variety})` : ''} — ${formatFeet(x)} ft, ${formatFeet(y)} ft`}
              onPointerDown={(e) => handleIconPointerDown(e, placement)}
              onPointerMove={handleIconPointerMove}
              onPointerUp={handleIconPointerUp}
              onPointerCancel={() => setDrag(null)}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onViewDetail(plant.id);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                store.deletePlacement(placement.id);
                if (selected) setSelectedPlacementId(null);
              }}
            >
              <PlantIcon plant={plant} size={ICON_SIZE} />
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-2 text-center">
        Drag to move · Right-click or select + Delete to remove · Double-click to open journal
      </p>
    </>
  );
}
