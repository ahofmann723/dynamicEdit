import type { ElementTemplateType } from '../types/editor';

export const STARTER_HTML = `<div id="canvas">
  <section id="stage-card">
    <h1 id="card-title">Interactive Canvas Card</h1>
    <p id="card-copy">
      Select any element on this canvas to drag, resize from its edges, or edit its styles.
      Every visual change writes directly back into the CSS and HTML editors.
    </p>
    <div id="color-readout">Current surface: #ffffff</div>
  </section>

  <div id="controls-panel">
    <label id="title-label" for="title-input">Live Card Title</label>
    <input
      id="title-input"
      type="text"
      value="Interactive Canvas Card"
      placeholder="Type a new card title..."
    />
    <button id="color-btn" type="button">Change Card Background</button>
  </div>

  <aside id="metric-tile">
    <span id="metric-value">60 fps</span>
    <span id="metric-caption">Two-way CSS sync active</span>
  </aside>
</div>`;

export const STARTER_CSS = `#canvas {
  position: relative;
  min-height: 540px;
  width: 100%;
  font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif;
  color: #0f172a;
}

#stage-card {
  position: absolute;
  left: 36px;
  top: 36px;
  width: 390px;
  height: 215px;
  padding: 24px;
  background-color: #ffffff;
  color: #0f172a;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
  box-sizing: border-box;
  overflow: hidden;
}

#card-title {
  margin: 0 0 10px 0;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.25;
  color: #0f172a;
}

#card-copy {
  margin: 0 0 16px 0;
  font-size: 14px;
  line-height: 1.55;
  color: #475569;
}

#color-readout {
  font-family: "JetBrains Mono", monospace;
  font-size: 12px;
  color: #2563eb;
}

#controls-panel {
  position: absolute;
  left: 36px;
  top: 280px;
  width: 390px;
  height: 175px;
  padding: 20px;
  background-color: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

#title-label {
  font-size: 12px;
  font-weight: 600;
  color: #334155;
}

#title-input {
  width: 100%;
  padding: 9px 12px;
  font-size: 14px;
  color: #0f172a;
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  box-sizing: border-box;
}

#color-btn {
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  background-color: #2563eb;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  align-self: flex-start;
}

#color-btn:hover {
  background-color: #1d4ed8;
}

#metric-tile {
  position: absolute;
  left: 454px;
  top: 36px;
  width: 210px;
  height: 118px;
  padding: 20px;
  background-color: #0f172a;
  color: #f8fafc;
  border-radius: 12px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

#metric-value {
  font-family: "JetBrains Mono", monospace;
  font-size: 24px;
  font-weight: 600;
  color: #ffffff;
}

#metric-caption {
  font-size: 12px;
  color: #94a3b8;
}`;

export const STARTER_JS = `// Interactive UI controls — edit this JavaScript directly in the editor
const palette = [
  '#ffffff',
  '#eff6ff',
  '#f0fdf4',
  '#fefce8',
  '#fdf2f8'
];

let colorIndex = 0;

const stageCard = document.getElementById('stage-card');
const colorBtn = document.getElementById('color-btn');
const colorReadout = document.getElementById('color-readout');
const titleInput = document.getElementById('title-input');
const cardTitle = document.getElementById('card-title');

if (colorBtn && stageCard) {
  colorBtn.addEventListener('click', () => {
    colorIndex = (colorIndex + 1) % palette.length;
    const nextColor = palette[colorIndex];
    stageCard.style.backgroundColor = nextColor;
    if (colorReadout) {
      colorReadout.textContent = 'Current surface: ' + nextColor;
    }
  });
}

if (titleInput && cardTitle) {
  titleInput.addEventListener('input', (event) => {
    const value = event.target.value.trim();
    cardTitle.textContent = value || 'Untitled Card';
  });
}`;

export interface NewElementSnippet {
  id: string;
  html: string;
  cssSelector: string;
  cssProps: Record<string, string>;
}

export function createElementSnippet(
  type: ElementTemplateType,
  existingHtml: string
): NewElementSnippet {
  let counter = 1;
  const prefix =
    type === 'box'
      ? 'box'
      : type === 'heading'
        ? 'heading'
        : type === 'button'
          ? 'action-btn'
          : 'text-field';

  while (
    existingHtml.includes(`id="${prefix}-${counter}"`) ||
    existingHtml.includes(`id='${prefix}-${counter}'`)
  ) {
    counter += 1;
  }

  const id = `${prefix}-${counter}`;
  const offset = ((counter - 1) % 6) * 24;
  const left = `${454 + offset}px`;
  const top = `${184 + offset}px`;

  if (type === 'box') {
    return {
      id,
      html: `  <div id="${id}">Draggable Box ${counter}</div>`,
      cssSelector: `#${id}`,
      cssProps: {
        position: 'absolute',
        left,
        top,
        width: '210px',
        height: '110px',
        padding: '16px',
        'background-color': '#eff6ff',
        color: '#1e3a8a',
        border: '1px solid #93c5fd',
        'border-radius': '10px',
        'font-size': '14px',
        'font-weight': '600',
        'box-sizing': 'border-box',
      },
    };
  }

  if (type === 'heading') {
    return {
      id,
      html: `  <h2 id="${id}">Editable Heading ${counter}</h2>`,
      cssSelector: `#${id}`,
      cssProps: {
        position: 'absolute',
        left,
        top,
        width: '240px',
        height: '44px',
        margin: '0',
        'font-size': '20px',
        'font-weight': '700',
        color: '#0f172a',
        'box-sizing': 'border-box',
      },
    };
  }

  if (type === 'button') {
    return {
      id,
      html: `  <button id="${id}" type="button">Action Button ${counter}</button>`,
      cssSelector: `#${id}`,
      cssProps: {
        position: 'absolute',
        left,
        top,
        width: '170px',
        height: '42px',
        padding: '8px 16px',
        'background-color': '#0f172a',
        color: '#ffffff',
        border: 'none',
        'border-radius': '8px',
        'font-size': '13px',
        'font-weight': '600',
        cursor: 'pointer',
        'box-sizing': 'border-box',
      },
    };
  }

  return {
    id,
    html: `  <input id="${id}" type="text" placeholder="Type here..." />`,
    cssSelector: `#${id}`,
    cssProps: {
      position: 'absolute',
      left,
      top,
      width: '210px',
      height: '40px',
      padding: '8px 12px',
      'background-color': '#ffffff',
      color: '#0f172a',
      border: '1px solid #cbd5e1',
      'border-radius': '8px',
      'font-size': '14px',
      'box-sizing': 'border-box',
    },
  };
}
