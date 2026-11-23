import { Trash2, X } from 'lucide-react';
import type { SelectedElementInfo } from '../types/editor';

interface StyleInspectorBarProps {
  selected: SelectedElementInfo | null;
  isDesignMode: boolean;
  onStyleUpdate: (updates: Record<string, string>) => void;
  onTextUpdate: (newText: string) => void;
  onDelete: () => void;
  onClearSelection: () => void;
}

export default function StyleInspectorBar({
  selected,
  isDesignMode,
  onStyleUpdate,
  onTextUpdate,
  onDelete,
  onClearSelection,
}: StyleInspectorBarProps) {
  if (!isDesignMode) {
    return (
      <div
        aria-label="Preview mode notice"
        className="flex min-h-10 shrink-0 items-center border-b border-slate-200 bg-slate-50/95 px-3 text-xs text-slate-500"
      >
        Preview mode active — interactive buttons, inputs, and scripts run without design overlays.
      </div>
    );
  }

  if (!selected) {
    return (
      <div
        aria-label="Style inspector idle prompt"
        className="flex min-h-10 shrink-0 items-center border-b border-slate-200 bg-slate-50/95 px-3 text-xs text-slate-500"
      >
        Select any element below to drag, resize from its edges, or edit its colors, typography, and dimensions.
      </div>
    );
  }

  return (
    <div
      aria-label="Selected element style inspector"
      data-testid="style-inspector"
      className="flex min-h-10 shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-slate-200 bg-slate-50/95 px-3 py-1.5 text-xs text-slate-700"
    >
      <div className="flex items-center gap-1.5">
        <span className="font-mono font-semibold text-blue-700">#{selected.id}</span>
        <span aria-hidden="true" className="text-slate-300">/</span>
        <span className="font-mono text-slate-500">{selected.tagName}</span>
      </div>

      <label className="flex items-center gap-1 whitespace-nowrap">
        <span className="text-slate-500">Fill</span>
        <input
          type="color"
          aria-label="Background color"
          value={selected.backgroundColor}
          onChange={(e) => onStyleUpdate({ 'background-color': e.target.value })}
          className="h-6 w-6 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
        />
      </label>

      <label className="flex items-center gap-1 whitespace-nowrap">
        <span className="text-slate-500">Text</span>
        <input
          type="color"
          aria-label="Text color"
          value={selected.color}
          onChange={(e) => onStyleUpdate({ color: e.target.value })}
          className="h-6 w-6 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
        />
      </label>

      <label className="flex items-center gap-1 whitespace-nowrap">
        <span className="text-slate-500">Font</span>
        <input
          type="number"
          aria-label="Font size in pixels"
          min={8}
          max={96}
          value={selected.fontSize}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!Number.isNaN(val) && val >= 8 && val <= 96) {
              onStyleUpdate({ 'font-size': `${val}px` });
            }
          }}
          className="w-12 rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-xs text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none"
        />
      </label>

      <label className="flex items-center gap-1 whitespace-nowrap">
        <span className="text-slate-500">Radius</span>
        <input
          type="number"
          aria-label="Border radius in pixels"
          min={0}
          max={120}
          value={selected.borderRadius}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!Number.isNaN(val) && val >= 0 && val <= 120) {
              onStyleUpdate({ 'border-radius': `${val}px` });
            }
          }}
          className="w-12 rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-xs text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none"
        />
      </label>

      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <label className="flex items-center gap-1">
          <span className="text-slate-500">W</span>
          <input
            type="number"
            aria-label="Element width in pixels"
            min={32}
            max={1200}
            value={selected.width}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!Number.isNaN(val) && val >= 32) {
                onStyleUpdate({ width: `${val}px` });
              }
            }}
            className="w-13 rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-xs text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none"
          />
        </label>
        <label className="flex items-center gap-1">
          <span className="text-slate-500">H</span>
          <input
            type="number"
            aria-label="Element height in pixels"
            min={24}
            max={1200}
            value={selected.height}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!Number.isNaN(val) && val >= 24) {
                onStyleUpdate({ height: `${val}px` });
              }
            }}
            className="w-13 rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-xs text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none"
          />
        </label>
      </div>

      {selected.isLeafText && selected.textContent !== null && (
        <label className="flex items-center gap-1 whitespace-nowrap">
          <span className="text-slate-500">Label</span>
          <input
            type="text"
            aria-label="Element text content"
            value={selected.textContent}
            onChange={(e) => onTextUpdate(e.target.value)}
            className="w-36 rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
          />
        </label>
      )}

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${selected.id}`}
          title="Delete selected element"
          className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Delete</span>
        </button>
        <button
          type="button"
          onClick={onClearSelection}
          aria-label="Deselect element"
          title="Clear selection"
          className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
