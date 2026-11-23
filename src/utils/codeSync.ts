/**
 * Pure two-way code synchronization utilities for HTML, CSS, and iframe document building.
 */

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Converts rgb()/rgba() CSS color strings or 3-digit hex into lowercase 6-digit #rrggbb hex.
 */
export function normalizeColorToHex(color: string, fallback = '#ffffff'): string {
  const trimmed = color.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(trimmed)) {
    return trimmed;
  }
  if (/^#[0-9a-f]{3}$/.test(trimmed)) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  const rgbMatch = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/);
  if (rgbMatch) {
    const alpha = rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1;
    if (alpha === 0) {
      return fallback;
    }
    const r = Math.max(0, Math.min(255, parseInt(rgbMatch[1], 10)));
    const g = Math.max(0, Math.min(255, parseInt(rgbMatch[2], 10)));
    const b = Math.max(0, Math.min(255, parseInt(rgbMatch[3], 10)));
    return (
      '#' +
      [r, g, b]
        .map((channel) => channel.toString(16).padStart(2, '0'))
        .join('')
    );
  }
  return fallback;
}

/**
 * Inserts or updates CSS declarations for a given selector in a CSS stylesheet string.
 * Preserves existing formatting and unrelated rules.
 */
export function upsertCssProperty(
  cssCode: string,
  selector: string,
  updates: Record<string, string>
): string {
  const entries = Object.entries(updates).filter(([, value]) => value !== undefined && value !== '');
  if (entries.length === 0) {
    return cssCode;
  }

  const escapedSelector = escapeRegExp(selector.trim());
  const ruleRegex = new RegExp(`(^|\\n)([ \\t]*${escapedSelector}\\s*\\{)([\\s\\S]*?)(\\})`, 'm');
  const match = ruleRegex.exec(cssCode);

  if (!match) {
    const declarations = entries
      .map(([prop, value]) => `  ${prop}: ${value};`)
      .join('\n');
    const separator = cssCode.trim().length > 0 ? '\n\n' : '';
    return `${cssCode.trimEnd()}${separator}${selector.trim()} {\n${declarations}\n}`;
  }

  const leading = match[1];
  const opening = match[2];
  let body = match[3];
  const closing = match[4];

  for (const [prop, value] of entries) {
    const escapedProp = escapeRegExp(prop.trim());
    const declRegex = new RegExp(`(^|\\n)([ \\t]*${escapedProp}\\s*:\\s*)([^;\\n]+)(;?)`, 'm');
    if (declRegex.test(body)) {
      body = body.replace(declRegex, `$1$2${value};`);
    } else {
      const normalizedBody = body.endsWith('\n') ? body : `${body}\n`;
      body = `${normalizedBody}  ${prop}: ${value};\n`;
    }
  }

  const before = cssCode.slice(0, match.index);
  const after = cssCode.slice(match.index + match[0].length);
  return `${before}${leading}${opening}${body}${closing}${after}`;
}

/**
 * Removes a CSS rule block matching the exact selector.
 */
export function removeCssRule(cssCode: string, selector: string): string {
  const escapedSelector = escapeRegExp(selector.trim());
  const ruleRegex = new RegExp(`(?:^|\\n{1,2})[ \\t]*${escapedSelector}\\s*\\{[\\s\\S]*?\\}`, 'm');
  return cssCode.replace(ruleRegex, '').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Escapes HTML text content safely so edited text cannot break tags.
 */
function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Updates inner text of an element identified by id in an HTML string.
 * Leaves attributes and outer markup untouched.
 */
export function updateElementTextInHtml(
  htmlCode: string,
  elementId: string,
  newText: string
): string {
  const escapedId = escapeRegExp(elementId);
  const tagRegex = new RegExp(
    `(<([a-zA-Z][a-zA-Z0-9-]*)\\b[^>]*\\bid\\s*=\\s*["']${escapedId}["'][^>]*>)([\\s\\S]*?)(<\\/\\2>)`,
    'm'
  );
  if (!tagRegex.test(htmlCode)) {
    return htmlCode;
  }
  return htmlCode.replace(tagRegex, `$1${escapeHtmlText(newText)}$4`);
}

/**
 * Inserts a new HTML element snippet right before the closing tag of #canvas,
 * or appends it to the end if no #canvas wrapper exists.
 */
export function insertElementIntoHtml(htmlCode: string, snippet: string): string {
  const canvasEndIndex = htmlCode.lastIndexOf('</div>');
  if (htmlCode.includes('id="canvas"') && canvasEndIndex !== -1) {
    const before = htmlCode.slice(0, canvasEndIndex).trimEnd();
    const after = htmlCode.slice(canvasEndIndex);
    return `${before}\n\n${snippet}\n${after}`;
  }
  const trimmed = htmlCode.trimEnd();
  return trimmed.length > 0 ? `${trimmed}\n${snippet}` : snippet;
}

/**
 * Removes an element by id from HTML source (supports paired tags and self-closing/void tags).
 */
export function removeElementFromHtml(htmlCode: string, elementId: string): string {
  const escapedId = escapeRegExp(elementId);
  const pairedRegex = new RegExp(
    `[ \\t]*<([a-zA-Z][a-zA-Z0-9-]*)\\b[^>]*\\bid\\s*=\\s*["']${escapedId}["'][^>]*>[\\s\\S]*?<\\/\\1>\\s*`,
    'm'
  );
  if (pairedRegex.test(htmlCode)) {
    return htmlCode.replace(pairedRegex, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  const voidRegex = new RegExp(
    `[ \\t]*<[a-zA-Z][a-zA-Z0-9-]*\\b[^>]*\\bid\\s*=\\s*["']${escapedId}["'][^>]*\\/?>\\s*`,
    'm'
  );
  if (voidRegex.test(htmlCode)) {
    return htmlCode.replace(voidRegex, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  return htmlCode;
}

/**
 * Prevents accidental </script> termination inside injected inline scripts.
 */
function sanitizeInlineScript(js: string): string {
  return js.replace(/<\/script>/gi, '<\\/script>');
}

/**
 * Builds the live preview iframe srcdoc combining user HTML, CSS, JS,
 * design-mode helpers, and safe runtime error reporting.
 */
export function buildPreviewSrcDoc(
  html: string,
  css: string,
  js: string,
  designMode: boolean
): string {
  const safeJs = sanitizeInlineScript(js);
  const designGridCss = designMode
    ? `
    html, body {
      min-height: 100%;
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
      background-size: 20px 20px;
    }
    [data-cc-hover="true"] {
      outline: 1.5px dashed #3b82f6 !important;
      outline-offset: 2px;
    }
    `
    : `
    html, body {
      min-height: 100%;
      margin: 0;
      padding: 0;
      background-color: #ffffff;
    }
    `;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style data-workbench-base="true">${designGridCss}</style>
  <style id="user-styles">${css}</style>
</head>
<body>
${html}
<script data-workbench-runner="true">
(function() {
  window.addEventListener('error', function(event) {
    window.parent.postMessage({
      type: 'cc-preview-error',
      message: event.message || 'Runtime error in preview script'
    }, '*');
  });

  window.addEventListener('unhandledrejection', function(event) {
    var reason = event.reason && event.reason.message ? event.reason.message : String(event.reason);
    window.parent.postMessage({
      type: 'cc-preview-error',
      message: reason
    }, '*');
  });

  try {
    ${safeJs}
    window.parent.postMessage({ type: 'cc-preview-ready' }, '*');
  } catch (err) {
    window.parent.postMessage({
      type: 'cc-preview-error',
      message: err && err.message ? err.message : String(err)
    }, '*');
  }
})();
</script>
</body>
</html>`;
}

/**
 * Generates a clean, self-contained HTML file suitable for download and standalone browser use.
 */
export function buildStandaloneHtml(html: string, css: string, js: string): string {
  const safeJs = sanitizeInlineScript(js);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CanvasCode Export</title>
  <style>
${css}
  </style>
</head>
<body>
${html}
  <script>
${safeJs}
  </script>
</body>
</html>
`;
}
