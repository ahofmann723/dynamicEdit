import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPreviewSrcDoc,
  buildStandaloneHtml,
  insertElementIntoHtml,
  normalizeColorToHex,
  removeCssRule,
  removeElementFromHtml,
  updateElementTextInHtml,
  upsertCssProperty,
} from './codeSync';

test('normalizeColorToHex converts rgb, rgba, and 3-digit hex accurately', () => {
  assert.equal(normalizeColorToHex('rgb(37, 99, 235)'), '#2563eb');
  assert.equal(normalizeColorToHex('rgba(15, 23, 42, 0.9)'), '#0f172a');
  assert.equal(normalizeColorToHex('rgba(0, 0, 0, 0)', '#ffffff'), '#ffffff');
  assert.equal(normalizeColorToHex('#abc'), '#aabbcc');
  assert.equal(normalizeColorToHex('#F8FAFC'), '#f8fafc');
});

test('upsertCssProperty updates existing properties in place and appends missing ones', () => {
  const initialCss = `#stage-card {
  position: absolute;
  left: 36px;
  top: 36px;
  background-color: #ffffff;
}`;

  const updated = upsertCssProperty(initialCss, '#stage-card', {
    left: '120px',
    top: '84px',
    width: '410px',
  });

  assert.match(updated, /left:\s*120px;/);
  assert.match(updated, /top:\s*84px;/);
  assert.match(updated, /width:\s*410px;/);
  assert.match(updated, /background-color:\s*#ffffff;/);
});

test('upsertCssProperty appends a new rule when selector does not exist yet', () => {
  const initialCss = `#card-title {\n  font-size: 22px;\n}`;
  const updated = upsertCssProperty(initialCss, '#box-1', {
    left: '200px',
    'background-color': '#eff6ff',
  });

  assert.match(updated, /#card-title \{/);
  assert.match(updated, /#box-1 \{\n  left: 200px;\n  background-color: #eff6ff;\n\}/);
});

test('updateElementTextInHtml updates matching element text while keeping attributes', () => {
  const html = `<section id="stage-card">\n  <h1 id="card-title" class="hero">Old Title</h1>\n</section>`;
  const updated = updateElementTextInHtml(html, 'card-title', 'New Title & Demo');
  assert.equal(
    updated,
    `<section id="stage-card">\n  <h1 id="card-title" class="hero">New Title &amp; Demo</h1>\n</section>`
  );
});

test('insertElementIntoHtml and removeElementFromHtml manage canvas elements cleanly', () => {
  const html = `<div id="canvas">\n  <div id="a">A</div>\n</div>`;
  const withNew = insertElementIntoHtml(html, '  <div id="box-1">Hello</div>');
  assert.ok(withNew.includes('<div id="box-1">Hello</div>'));
  assert.ok(withNew.trim().endsWith('</div>'));

  const removed = removeElementFromHtml(withNew, 'box-1');
  assert.ok(!removed.includes('box-1'));
  assert.ok(removed.includes('id="a"'));
});

test('removeCssRule deletes only the targeted selector rule', () => {
  const css = `#a {\n  color: red;\n}\n\n#b {\n  color: blue;\n}`;
  const cleaned = removeCssRule(css, '#a');
  assert.ok(!cleaned.includes('#a'));
  assert.ok(cleaned.includes('#b'));
});

test('buildPreviewSrcDoc escapes closing script tags and injects styles and html', () => {
  const doc = buildPreviewSrcDoc(
    '<div id="x">Hi</div>',
    '#x { color: #000; }',
    'const s = "</script>";',
    true
  );
  assert.ok(doc.includes('<style id="user-styles">#x { color: #000; }</style>'));
  assert.ok(doc.includes('<div id="x">Hi</div>'));
  assert.ok(doc.includes('<\\/script>'));
  assert.ok(doc.includes('radial-gradient'));
});

test('buildStandaloneHtml outputs clean export without workbench hooks', () => {
  const standalone = buildStandaloneHtml('<p>Hello</p>', 'p { margin: 0; }', 'console.log(1);');
  assert.ok(standalone.includes('<p>Hello</p>'));
  assert.ok(!standalone.includes('cc-preview-error'));
});
