import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Plus, RotateCcw } from 'lucide-react';
import CodeEditorPane from './components/CodeEditorPane';
import PreviewPane from './components/PreviewPane';
import type { EditorTab, ElementTemplateType, PreviewMode } from './types/editor';
import {
  buildStandaloneHtml,
  insertElementIntoHtml,
  removeCssRule,
  removeElementFromHtml,
  updateElementTextInHtml,
  upsertCssProperty,
} from './utils/codeSync';
import {
  createElementSnippet,
  STARTER_CSS,
  STARTER_HTML,
  STARTER_JS,
} from './utils/starterTemplate';

const ADD_MENU_ITEMS: Array<{ type: ElementTemplateType; label: string }> = [
  { type: 'box', label: 'Draggable Box' },
  { type: 'heading', label: 'Heading' },
  { type: 'button', label: 'Button' },
  { type: 'input', label: 'Text Input' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<EditorTab>('html');
  const [html, setHtml] = useState(STARTER_HTML);
  const [css, setCss] = useState(STARTER_CSS);
  const [js, setJs] = useState(STARTER_JS);

  const [previewMode, setPreviewMode] = useState<PreviewMode>('design');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renderRevision, setRenderRevision] = useState(0);
  const [splitPercent, setSplitPercent] = useState(46);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const addMenuRef = useRef<HTMLDivElement | null>(null);

  const schedulePreviewReload = useCallback((delayMs = 220) => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      setRenderRevision((rev) => rev + 1);
    }, delayMs);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Close Add Element dropdown on outside click or Escape
  useEffect(() => {
    if (!addMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAddMenuOpen(false);
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [addMenuOpen]);

  // Resizable split-pane mouse drag handling
  useEffect(() => {
    if (!isDraggingSplitter) return;

    const handlePointerMove = (e: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const rawPercent = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.max(25, Math.min(75, Math.round(rawPercent * 10) / 10)));
    };

    const handlePointerUp = () => {
      setIsDraggingSplitter(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDraggingSplitter]);

  const handleCodeChange = useCallback(
    (tab: EditorTab, value: string) => {
      if (tab === 'html') setHtml(value);
      else if (tab === 'css') setCss(value);
      else setJs(value);
      schedulePreviewReload(220);
    },
    [schedulePreviewReload]
  );

  // Visual drag/resize/style changes update CSS state immediately WITHOUT triggering an iframe reload
  const handleVisualCssChange = useCallback(
    (selector: string, updates: Record<string, string>) => {
      setCss((prevCss) => upsertCssProperty(prevCss, selector, updates));
    },
    []
  );

  const handleVisualTextChange = useCallback((elementId: string, newText: string) => {
    setHtml((prevHtml) => updateElementTextInHtml(prevHtml, elementId, newText));
  }, []);

  const handleAddElement = (type: ElementTemplateType) => {
    const snippet = createElementSnippet(type, html);
    setHtml((prev) => insertElementIntoHtml(prev, snippet.html));
    setCss((prev) => upsertCssProperty(prev, snippet.cssSelector, snippet.cssProps));
    setSelectedId(snippet.id);
    setAddMenuOpen(false);
    setRenderRevision((rev) => rev + 1);
  };

  const handleDeleteElement = useCallback((elementId: string) => {
    setHtml((prev) => removeElementFromHtml(prev, elementId));
    setCss((prev) => removeCssRule(prev, `#${elementId}`));
    setSelectedId(null);
    setRenderRevision((rev) => rev + 1);
  }, []);

  const handleReset = () => {
    setHtml(STARTER_HTML);
    setCss(STARTER_CSS);
    setJs(STARTER_JS);
    setSelectedId(null);
    setPreviewMode('design');
    setRenderRevision((rev) => rev + 1);
  };

  const handleExportHtml = () => {
    const content = buildStandaloneHtml(html, css, js);
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'canvascode-export.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50 text-slate-900">
      <header className="flex h-13 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 sm:gap-8 sm:px-5">
        <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
          CanvasCode
        </span>

        <nav aria-label="Workspace actions" className="flex items-center gap-3 sm:gap-5">
          <div ref={addMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setAddMenuOpen((open) => !open)}
              aria-expanded={addMenuOpen}
              aria-haspopup="menu"
              className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 text-xs font-medium text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded sm:text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Element</span>
            </button>

            {addMenuOpen && (
              <div
                role="menu"
                className="absolute left-0 top-full z-40 mt-2 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
              >
                {ADD_MENU_ITEMS.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    role="menuitem"
                    onClick={() => handleAddElement(item.type)}
                    className="flex w-full items-center px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 text-xs font-medium text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded sm:text-sm"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handleExportHtml}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:px-3.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export HTML</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </header>

      <main
        ref={containerRef}
        className="flex min-h-0 flex-1 flex-col md:flex-row"
      >
        <div
          className="h-1/2 min-h-0 w-full border-b border-slate-200 md:h-full md:border-b-0"
          style={{ flexBasis: `${splitPercent}%` }}
        >
          <CodeEditorPane
            activeTab={activeTab}
            onTabChange={setActiveTab}
            html={html}
            css={css}
            js={js}
            onChange={handleCodeChange}
          />
        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize code and preview panes"
          aria-valuenow={Math.round(splitPercent)}
          aria-valuemin={25}
          aria-valuemax={75}
          tabIndex={0}
          onPointerDown={(e) => {
            e.preventDefault();
            setIsDraggingSplitter(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') setSplitPercent((p) => Math.max(25, p - 2));
            if (e.key === 'ArrowRight') setSplitPercent((p) => Math.min(75, p + 2));
          }}
          className={`hidden w-1.5 shrink-0 cursor-col-resize items-center justify-center bg-slate-200 transition-colors hover:bg-blue-500 focus-visible:bg-blue-600 focus-visible:outline-none md:flex ${
            isDraggingSplitter ? 'bg-blue-600' : ''
          }`}
        />

        <div
          className="relative h-1/2 min-h-0 flex-1 md:h-full"
        >
          {isDraggingSplitter && <div className="absolute inset-0 z-50 cursor-col-resize" />}
          <PreviewPane
            html={html}
            css={css}
            js={js}
            renderRevision={renderRevision}
            previewMode={previewMode}
            onPreviewModeChange={setPreviewMode}
            selectedId={selectedId}
            onSelectId={setSelectedId}
            onVisualCssChange={handleVisualCssChange}
            onVisualTextChange={handleVisualTextChange}
            onDeleteElement={handleDeleteElement}
            onForceRefresh={() => setRenderRevision((rev) => rev + 1)}
          />
        </div>
      </main>
    </div>
  );
}
