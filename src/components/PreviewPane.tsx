import { useCallback, useEffect, useRef, useState } from 'react';
import interact from 'interactjs';
import { AlertCircle, MousePointer2, Play, RotateCw } from 'lucide-react';
import type { PreviewMode, SelectedElementInfo } from '../types/editor';
import { buildPreviewSrcDoc, normalizeColorToHex } from '../utils/codeSync';
import StyleInspectorBar from './StyleInspectorBar';

interface PreviewPaneProps {
  html: string;
  css: string;
  js: string;
  renderRevision: number;
  previewMode: PreviewMode;
  onPreviewModeChange: (mode: PreviewMode) => void;
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  onVisualCssChange: (selector: string, updates: Record<string, string>) => void;
  onVisualTextChange: (elementId: string, newText: string) => void;
  onDeleteElement: (elementId: string) => void;
  onForceRefresh: () => void;
}

const OVERLAY_ATTR = 'data-cc-overlay';

function isSelectableElement(el: Element | null): el is HTMLElement {
  if (!el || !(el instanceof el.ownerDocument.defaultView!.HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'html' || tag === 'body' || tag === 'script' || tag === 'style') return false;
  if (el.id === 'canvas') return false;
  if (el.hasAttribute(OVERLAY_ATTR) || el.closest(`[${OVERLAY_ATTR}]`)) return false;
  return Boolean(el.id);
}

function readElementInfo(el: HTMLElement): SelectedElementInfo {
  const win = el.ownerDocument.defaultView!;
  const computed = win.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const isLeafText =
    el.children.length === 0 &&
    !['input', 'textarea', 'select', 'img', 'hr', 'br'].includes(el.tagName.toLowerCase());

  return {
    id: el.id,
    tagName: el.tagName.toLowerCase(),
    x: Math.round(parseFloat(computed.left) || rect.left),
    y: Math.round(parseFloat(computed.top) || rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    backgroundColor: normalizeColorToHex(computed.backgroundColor, '#ffffff'),
    color: normalizeColorToHex(computed.color, '#0f172a'),
    fontSize: Math.round(parseFloat(computed.fontSize) || 14),
    borderRadius: Math.round(parseFloat(computed.borderRadius) || 0),
    textContent: isLeafText ? (el.textContent ?? '') : null,
    isLeafText,
  };
}

function ensureOverlay(doc: Document): HTMLDivElement {
  let overlay = doc.querySelector<HTMLDivElement>(`[${OVERLAY_ATTR}="true"]`);
  if (overlay) return overlay;

  overlay = doc.createElement('div');
  overlay.setAttribute(OVERLAY_ATTR, 'true');
  overlay.style.position = 'fixed';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '99999';
  overlay.style.border = '2px solid #2563eb';
  overlay.style.boxSizing = 'border-box';
  overlay.style.display = 'none';

  const badge = doc.createElement('div');
  badge.setAttribute('data-cc-badge', 'true');
  badge.style.position = 'absolute';
  badge.style.top = '-24px';
  badge.style.left = '-2px';
  badge.style.background = '#2563eb';
  badge.style.color = '#ffffff';
  badge.style.fontFamily = '"JetBrains Mono", ui-monospace, monospace';
  badge.style.fontSize = '11px';
  badge.style.lineHeight = '1';
  badge.style.padding = '4px 7px';
  badge.style.borderRadius = '4px';
  badge.style.whiteSpace = 'nowrap';
  badge.style.boxShadow = '0 2px 6px rgba(37, 99, 235, 0.25)';
  overlay.appendChild(badge);

  const handlePositions: Array<[string, string]> = [
    ['-5px', '-5px'],
    ['calc(50% - 4px)', '-5px'],
    ['calc(100% - 4px)', '-5px'],
    ['-5px', 'calc(50% - 4px)'],
    ['calc(100% - 4px)', 'calc(50% - 4px)'],
    ['-5px', 'calc(100% - 4px)'],
    ['calc(50% - 4px)', 'calc(100% - 4px)'],
    ['calc(100% - 4px)', 'calc(100% - 4px)'],
  ];

  for (const [left, top] of handlePositions) {
    const dot = doc.createElement('span');
    dot.style.position = 'absolute';
    dot.style.left = left;
    dot.style.top = top;
    dot.style.width = '8px';
    dot.style.height = '8px';
    dot.style.background = '#ffffff';
    dot.style.border = '2px solid #2563eb';
    dot.style.borderRadius = '2px';
    dot.style.boxSizing = 'border-box';
    overlay.appendChild(dot);
  }

  doc.body.appendChild(overlay);
  return overlay;
}

function positionOverlay(doc: Document, el: HTMLElement | null) {
  const overlay = ensureOverlay(doc);
  if (!el || !doc.body.contains(el)) {
    overlay.style.display = 'none';
    return;
  }
  const rect = el.getBoundingClientRect();
  overlay.style.display = 'block';
  overlay.style.left = `${rect.left}px`;
  overlay.style.top = `${rect.top}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;

  const badge = overlay.querySelector<HTMLDivElement>('[data-cc-badge="true"]');
  if (badge) {
    badge.textContent = `#${el.id} · ${Math.round(rect.width)} × ${Math.round(rect.height)}`;
    badge.style.top = rect.top < 28 ? `${rect.height + 6}px` : '-24px';
  }
}

export default function PreviewPane({
  html,
  css,
  js,
  renderRevision,
  previewMode,
  onPreviewModeChange,
  selectedId,
  onSelectId,
  onVisualCssChange,
  onVisualTextChange,
  onDeleteElement,
  onForceRefresh,
}: PreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [srcDoc, setSrcDoc] = useState(() =>
    buildPreviewSrcDoc(html, css, js, previewMode === 'design')
  );
  const [selectedInfo, setSelectedInfo] = useState<SelectedElementInfo | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  const previewModeRef = useRef(previewMode);
  const selectedIdRef = useRef(selectedId);
  const cssRef = useRef(css);
  const onSelectIdRef = useRef(onSelectId);
  const onVisualCssChangeRef = useRef(onVisualCssChange);
  const interactablesRef = useRef<Array<ReturnType<typeof interact>>>([]);

  previewModeRef.current = previewMode;
  selectedIdRef.current = selectedId;
  cssRef.current = css;
  onSelectIdRef.current = onSelectId;
  onVisualCssChangeRef.current = onVisualCssChange;

  // Rebuild iframe srcDoc only when code edits increment renderRevision or mode switches
  useEffect(() => {
    setRuntimeError(null);
    setSrcDoc(buildPreviewSrcDoc(html, css, js, previewMode === 'design'));
    // Intentionally triggered by renderRevision & previewMode so visual drags do not reload iframe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderRevision, previewMode]);

  // Listen for runtime error messages from iframe script runner
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const iframeWin = iframeRef.current?.contentWindow;
      if (!iframeWin || event.source !== iframeWin) return;
      const data = event.data as { type?: string; message?: string } | null;
      if (!data) return;
      if (data.type === 'cc-preview-error') {
        setRuntimeError(data.message || 'Runtime error in preview script');
      } else if (data.type === 'cc-preview-ready') {
        setRuntimeError(null);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Keep iframe's live <style id="user-styles"> in sync whenever CSS changes visually without reload
  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const styleEl = doc.getElementById('user-styles');
    if (styleEl && styleEl.textContent !== css) {
      styleEl.textContent = css;
      if (selectedIdRef.current) {
        const target = doc.getElementById(selectedIdRef.current);
        if (target) {
          positionOverlay(doc, target);
          setSelectedInfo(readElementInfo(target));
        }
      }
    }
  }, [css]);

  const cleanupInteractables = useCallback(() => {
    for (const instance of interactablesRef.current) {
      try {
        instance.unset();
      } catch {
        // Ignore stale iframe document teardown
      }
    }
    interactablesRef.current = [];
  }, []);

  const syncSelectionFromDoc = useCallback((doc: Document, nextId: string | null) => {
    doc.querySelectorAll('[data-cc-selected="true"]').forEach((node) => {
      node.removeAttribute('data-cc-selected');
    });

    if (!nextId || previewModeRef.current !== 'design') {
      positionOverlay(doc, null);
      setSelectedInfo(null);
      return;
    }

    const target = doc.getElementById(nextId);
    if (!target) {
      positionOverlay(doc, null);
      setSelectedInfo(null);
      return;
    }

    target.setAttribute('data-cc-selected', 'true');
    positionOverlay(doc, target);
    setSelectedInfo(readElementInfo(target));
  }, []);

  const bindDesignInteractions = useCallback(() => {
    cleanupInteractables();
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    const win = iframe?.contentWindow;
    if (!doc || !win) return;

    if (previewModeRef.current !== 'design') {
      syncSelectionFromDoc(doc, null);
      return;
    }

    // Track hover outline
    let hoveredEl: HTMLElement | null = null;
    const handlePointerMove = (e: PointerEvent) => {
      const target = e.target as Element | null;
      const selectable = target ? target.closest('[id]') : null;
      const nextHover = isSelectableElement(selectable) ? selectable : null;
      if (hoveredEl && hoveredEl !== nextHover) {
        hoveredEl.removeAttribute('data-cc-hover');
      }
      hoveredEl = nextHover;
      if (hoveredEl && hoveredEl.id !== selectedIdRef.current) {
        hoveredEl.setAttribute('data-cc-hover', 'true');
      }
    };

    const handlePointerLeave = () => {
      if (hoveredEl) {
        hoveredEl.removeAttribute('data-cc-hover');
        hoveredEl = null;
      }
    };

    const handleClickSelect = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const selectable = target ? target.closest('[id]') : null;
      if (isSelectableElement(selectable)) {
        onSelectIdRef.current(selectable.id);
        syncSelectionFromDoc(doc, selectable.id);
      } else {
        onSelectIdRef.current(null);
        syncSelectionFromDoc(doc, null);
      }
      // Refresh inspector after user JS click handlers mutate styles or text
      window.setTimeout(() => {
        if (selectedIdRef.current) {
          const el = doc.getElementById(selectedIdRef.current);
          if (el) {
            positionOverlay(doc, el);
            setSelectedInfo(readElementInfo(el));
          }
        }
      }, 20);
    };

    const handleAfterInput = () => {
      window.setTimeout(() => {
        if (selectedIdRef.current) {
          const el = doc.getElementById(selectedIdRef.current);
          if (el) {
            positionOverlay(doc, el);
            setSelectedInfo(readElementInfo(el));
          }
        }
      }, 20);
    };

    doc.addEventListener('pointermove', handlePointerMove);
    doc.addEventListener('pointerleave', handlePointerLeave);
    doc.addEventListener('click', handleClickSelect);
    doc.addEventListener('input', handleAfterInput);

    const handleScrollOrResize = () => {
      if (selectedIdRef.current) {
        const el = doc.getElementById(selectedIdRef.current);
        if (el) positionOverlay(doc, el);
      }
    };
    win.addEventListener('scroll', handleScrollOrResize);
    win.addEventListener('resize', handleScrollOrResize);

    // Bind interact.js drag & resize to direct canvas items (or body children when no #canvas wrapper)
    // so dragging a card/tile never gets hijacked by its inner <span>/<p> children, and interactive
    // controls (<button>, <input>) inside panels keep native click/focus behavior.
    const canvasRoot = doc.getElementById('canvas') ?? doc.body;
    const directItems = Array.from(canvasRoot.children).filter(isSelectableElement);

    for (const el of directItems) {
      el.style.touchAction = 'none';
      const isInteractiveControl = ['button', 'input', 'textarea', 'select'].includes(
        el.tagName.toLowerCase()
      );
      const dragState = {
        left: 0,
        top: 0,
        position: 'absolute',
      };

      const instance = interact(el, { context: doc })
        .preventDefault('never')
        .draggable({
          inertia: false,
          ignoreFrom: isInteractiveControl ? 'input, textarea, select' : 'input, textarea, select, button',
          listeners: {
            start() {
              const computed = win.getComputedStyle(el);
              dragState.position =
                computed.position === 'static' ? 'relative' : computed.position;
              dragState.left = parseFloat(computed.left) || 0;
              dragState.top = parseFloat(computed.top) || 0;
              el.style.position = dragState.position;
              onSelectIdRef.current(el.id);
              syncSelectionFromDoc(doc, el.id);
            },
            move(event) {
              dragState.left += event.dx;
              dragState.top += event.dy;
              const roundedLeft = Math.round(dragState.left);
              const roundedTop = Math.round(dragState.top);
              el.style.left = `${roundedLeft}px`;
              el.style.top = `${roundedTop}px`;
              positionOverlay(doc, el);
              setSelectedInfo(readElementInfo(el));
            },
            end() {
              const roundedLeft = Math.round(dragState.left);
              const roundedTop = Math.round(dragState.top);
              el.style.position = '';
              el.style.left = '';
              el.style.top = '';
              onVisualCssChangeRef.current(`#${el.id}`, {
                position: dragState.position,
                left: `${roundedLeft}px`,
                top: `${roundedTop}px`,
              });
            },
          },
        })
        .resizable({
          edges: { left: true, right: true, top: true, bottom: true },
          margin: 10,
          modifiers: [
            interact.modifiers.restrictSize({
              min: { width: 48, height: 28 },
            }),
          ],
          listeners: {
            start() {
              const computed = win.getComputedStyle(el);
              dragState.position =
                computed.position === 'static' ? 'relative' : computed.position;
              dragState.left = parseFloat(computed.left) || 0;
              dragState.top = parseFloat(computed.top) || 0;
              el.style.position = dragState.position;
              onSelectIdRef.current(el.id);
              syncSelectionFromDoc(doc, el.id);
            },
            move(event) {
              const nextWidth = Math.round(event.rect.width);
              const nextHeight = Math.round(event.rect.height);
              dragState.left += event.deltaRect.left;
              dragState.top += event.deltaRect.top;
              const roundedLeft = Math.round(dragState.left);
              const roundedTop = Math.round(dragState.top);

              el.style.width = `${nextWidth}px`;
              el.style.height = `${nextHeight}px`;
              if (event.deltaRect.left !== 0) {
                el.style.left = `${roundedLeft}px`;
              }
              if (event.deltaRect.top !== 0) {
                el.style.top = `${roundedTop}px`;
              }
              positionOverlay(doc, el);
              setSelectedInfo(readElementInfo(el));
            },
            end(event) {
              const nextWidth = Math.round(event.rect.width);
              const nextHeight = Math.round(event.rect.height);
              const roundedLeft = Math.round(dragState.left);
              const roundedTop = Math.round(dragState.top);
              el.style.position = '';
              el.style.width = '';
              el.style.height = '';
              el.style.left = '';
              el.style.top = '';
              onVisualCssChangeRef.current(`#${el.id}`, {
                position: dragState.position,
                left: `${roundedLeft}px`,
                top: `${roundedTop}px`,
                width: `${nextWidth}px`,
                height: `${nextHeight}px`,
              });
            },
          },
        });

      interactablesRef.current.push(instance);
    }

    // Restore selection overlay if an element was already selected
    if (selectedIdRef.current) {
      syncSelectionFromDoc(doc, selectedIdRef.current);
    }

    return () => {
      doc.removeEventListener('pointermove', handlePointerMove);
      doc.removeEventListener('pointerleave', handlePointerLeave);
      doc.removeEventListener('click', handleClickSelect);
      doc.removeEventListener('input', handleAfterInput);
      win.removeEventListener('scroll', handleScrollOrResize);
      win.removeEventListener('resize', handleScrollOrResize);
    };
  }, [cleanupInteractables, syncSelectionFromDoc]);

  // Keep a cleanup ref for document event listeners
  const docCleanupRef = useRef<(() => void) | undefined>(undefined);

  const handleIframeLoad = useCallback(() => {
    if (docCleanupRef.current) {
      docCleanupRef.current();
    }
    docCleanupRef.current = bindDesignInteractions();
  }, [bindDesignInteractions]);

  useEffect(() => {
    return () => {
      if (docCleanupRef.current) {
        docCleanupRef.current();
      }
      cleanupInteractables();
    };
  }, [cleanupInteractables]);

  // Sync overlay whenever selectedId prop changes externally (e.g., after Add Element)
  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    syncSelectionFromDoc(doc, selectedId);
  }, [selectedId, syncSelectionFromDoc]);

  const handleInspectorStyleUpdate = (updates: Record<string, string>) => {
    if (!selectedId) return;
    const doc = iframeRef.current?.contentDocument;
    if (doc) {
      const target = doc.getElementById(selectedId);
      if (target) {
        // Clear any conflicting inline style set by user JS (e.g. color cycle button)
        // so the updated CSS rule takes immediate visual effect.
        for (const prop of Object.keys(updates)) {
          target.style.removeProperty(prop);
        }
      }
    }
    onVisualCssChange(`#${selectedId}`, updates);
  };

  const handleInspectorTextUpdate = (newText: string) => {
    if (!selectedId) return;
    const doc = iframeRef.current?.contentDocument;
    if (doc) {
      const target = doc.getElementById(selectedId);
      if (target) {
        target.textContent = newText;
        positionOverlay(doc, target);
        setSelectedInfo(readElementInfo(target));
      }
    }
    onVisualTextChange(selectedId, newText);
  };

  return (
    <section
      aria-label="Live graphical preview pane"
      className="flex h-full min-h-0 flex-col bg-white"
    >
      <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            role="group"
            aria-label="Preview interaction mode"
            className="flex items-center gap-0.5 rounded-lg bg-slate-200/75 p-0.5"
          >
            <button
              type="button"
              onClick={() => onPreviewModeChange('design')}
              aria-pressed={previewMode === 'design'}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                previewMode === 'design'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MousePointer2 className="h-3.5 w-3.5" />
              <span>Design</span>
            </button>
            <button
              type="button"
              onClick={() => onPreviewModeChange('interact')}
              aria-pressed={previewMode === 'interact'}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                previewMode === 'interact'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Play className="h-3.5 w-3.5" />
              <span>Preview</span>
            </button>
          </div>

          <span className="hidden truncate text-xs text-slate-500 lg:inline">
            {previewMode === 'design'
              ? selectedInfo
                ? `Selected #${selectedInfo.id} · ${selectedInfo.width} × ${selectedInfo.height}px`
                : 'Click any element to move, resize, or restyle'
              : 'Pure interactive preview'}
          </span>
        </div>

        <button
          type="button"
          onClick={onForceRefresh}
          aria-label="Reload preview"
          className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200/70 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <RotateCw className="h-3.5 w-3.5" />
          <span>Reload</span>
        </button>
      </div>

      <StyleInspectorBar
        selected={previewMode === 'design' ? selectedInfo : null}
        isDesignMode={previewMode === 'design'}
        onStyleUpdate={handleInspectorStyleUpdate}
        onTextUpdate={handleInspectorTextUpdate}
        onDelete={() => {
          if (selectedId) {
            onDeleteElement(selectedId);
          }
        }}
        onClearSelection={() => onSelectId(null)}
      />

      {runtimeError && (
        <div
          role="alert"
          className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="font-mono">{runtimeError}</span>
        </div>
      )}

      <div className="relative min-h-0 flex-1 bg-white">
        <iframe
          ref={iframeRef}
          title="Live HTML, CSS, and JavaScript preview"
          data-testid="live-preview-iframe"
          srcDoc={srcDoc}
          sandbox="allow-scripts allow-same-origin"
          onLoad={handleIframeLoad}
          className="h-full w-full border-0 bg-white"
        />
      </div>
    </section>
  );
}
