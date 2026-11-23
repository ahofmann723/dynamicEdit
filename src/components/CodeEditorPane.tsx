import { useEffect, useRef, useState } from 'react';
import { basicSetup, EditorView } from 'codemirror';
import { Compartment, EditorState } from '@codemirror/state';
import { html as htmlLang } from '@codemirror/lang-html';
import { css as cssLang } from '@codemirror/lang-css';
import { javascript as jsLang } from '@codemirror/lang-javascript';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { Check, Copy } from 'lucide-react';
import type { EditorTab } from '../types/editor';

interface CodeEditorPaneProps {
  activeTab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
  html: string;
  css: string;
  js: string;
  onChange: (tab: EditorTab, value: string) => void;
}

const studioEditorTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#ffffff',
      color: '#0f172a',
      height: '100%',
    },
    '.cm-content': {
      padding: '14px 0',
      caretColor: '#2563eb',
    },
    '.cm-gutters': {
      backgroundColor: '#f8fafc',
      color: '#94a3b8',
      borderRight: '1px solid #e2e8f0',
      minWidth: '44px',
      paddingRight: '6px',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#eff6ff',
      color: '#2563eb',
      fontWeight: '600',
    },
    '.cm-activeLine': {
      backgroundColor: '#f8fafc',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: '#dbeafe',
    },
    '.cm-cursor': {
      borderLeftColor: '#2563eb',
      borderLeftWidth: '2px',
    },
  },
  { dark: false }
);

const studioHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: '#7c3aed', fontWeight: '500' },
  { tag: [t.name, t.deleted, t.character, t.macroName], color: '#0f172a' },
  { tag: [t.propertyName], color: '#0369a1' },
  { tag: [t.function(t.variableName), t.labelName], color: '#2563eb' },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#b45309' },
  { tag: [t.definition(t.name), t.separator], color: '#334155' },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier], color: '#0f766e' },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp], color: '#475569' },
  { tag: [t.meta, t.comment], color: '#94a3b8', fontStyle: 'italic' },
  { tag: t.tagName, color: '#2563eb', fontWeight: '500' },
  { tag: t.attributeName, color: '#0f766e' },
  { tag: [t.string, t.attributeValue], color: '#15803d' },
  { tag: t.bracket, color: '#64748b' },
]);

function getLanguageExtension(tab: EditorTab) {
  if (tab === 'html') return htmlLang();
  if (tab === 'css') return cssLang();
  return jsLang();
}

const TABS: { id: EditorTab; label: string }[] = [
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'js', label: 'JavaScript' },
];

export default function CodeEditorPane({
  activeTab,
  onTabChange,
  html,
  css,
  js,
  onChange,
}: CodeEditorPaneProps) {
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const languageCompartmentRef = useRef(new Compartment());
  const activeTabRef = useRef<EditorTab>(activeTab);
  const onChangeRef = useRef(onChange);
  const isSyncingExternalRef = useRef(false);
  const [copied, setCopied] = useState(false);

  activeTabRef.current = activeTab;
  onChangeRef.current = onChange;

  const currentCode = activeTab === 'html' ? html : activeTab === 'css' ? css : js;
  const lineCount = currentCode.split('\n').length;

  useEffect(() => {
    const host = editorHostRef.current;
    if (!host) return;

    const languageCompartment = languageCompartmentRef.current;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !isSyncingExternalRef.current) {
        const nextValue = update.state.doc.toString();
        onChangeRef.current(activeTabRef.current, nextValue);
      }
    });

    const state = EditorState.create({
      doc: currentCode,
      extensions: [
        basicSetup,
        studioEditorTheme,
        syntaxHighlighting(studioHighlightStyle),
        EditorView.lineWrapping,
        languageCompartment.of(getLanguageExtension(activeTab)),
        updateListener,
      ],
    });

    const view = new EditorView({
      state,
      parent: host,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Mount CodeMirror once and reconfigure language/doc cleanly in effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconfigure language mode when switching tabs
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: languageCompartmentRef.current.reconfigure(getLanguageExtension(activeTab)),
    });
  }, [activeTab]);

  // Sync external code changes (tab switches, visual drag/resize, inspector edits, resets)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const existing = view.state.doc.toString();
    if (existing !== currentCode) {
      isSyncingExternalRef.current = true;
      view.dispatch({
        changes: { from: 0, to: existing.length, insert: currentCode },
      });
      isSyncingExternalRef.current = false;
    }
  }, [currentCode, activeTab]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Fallback ignored if clipboard blocked in headless context
    }
  };

  return (
    <section
      aria-label="Code editor pane"
      className="flex h-full min-h-0 flex-col bg-white"
    >
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-3">
        <div role="tablist" aria-label="Editor language tabs" className="flex items-center gap-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(tab.id)}
                className={`relative whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                    : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs font-mono text-slate-500 tabular-nums sm:inline">
            {lineCount} lines
          </span>
          <button
            type="button"
            onClick={handleCopy}
            aria-label={`Copy ${activeTab.toUpperCase()} code`}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200/70 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      <div
        ref={editorHostRef}
        data-testid="codemirror-host"
        className="min-h-0 flex-1 overflow-hidden"
      />
    </section>
  );
}
