// ...existing code...
import { nanoid } from 'nanoid';
import { Game } from './src/app/Game.js';
import { createLoop } from './src/app/loop.js';

const STORAGE_KEY = 'prototype-sandbox:v1';

// Minimal global state with persistence
const state = loadState() ?? {
  buildId: genBuildId(),
  items: []
};

// Elements
const el = {
  list: document.getElementById('items'),
  addBtn: document.getElementById('add-item'),
  input: document.getElementById('new-item-input'),
  devToggle: document.getElementById('toggle-dev'),
  devPanel: document.getElementById('dev-panel'),
  buildId: document.getElementById('build-id'),
  itemCount: document.getElementById('item-count'),
  exportBtn: document.getElementById('export-state'),
  resetBtn: document.getElementById('reset-state'),
  dump: document.getElementById('state-dump'),
};

// Init
render();
wireUI();

// --- Functions ---
function wireUI() {
  el.addBtn.addEventListener('click', onAdd);
  el.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') onAdd(); });
  el.devToggle.addEventListener('click', toggleDev);
  el.exportBtn.addEventListener('click', exportState);
  el.resetBtn.addEventListener('click', resetState);
}

function onAdd() {
  const text = el.input.value.trim();
  if (!text) return;
  state.items.unshift({ id: nanoid(8), text, done: false, createdAt: Date.now() });
  el.input.value = '';
  persist(); render();
}

function onToggle(id) {
  const it = state.items.find(i => i.id === id);
  if (!it) return;
  it.done = !it.done;
  persist(); render();
}

function onRemove(id) {
  state.items = state.items.filter(i => i.id !== id);
  persist(); render();
}

function render() {
  el.buildId.textContent = state.buildId;
  el.itemCount.textContent = String(state.items.length);

  el.list.innerHTML = '';
  for (const item of state.items) {
    const li = document.createElement('li');
    li.className = 'item';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = item.done;
    cb.addEventListener('change', () => onToggle(item.id));

    const text = document.createElement('div');
    text.className = 'text';
    text.textContent = item.text;
    if (item.done) text.style.textDecoration = 'line-through';

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `<span>${timeAgo(item.createdAt)}</span>`;

    const del = document.createElement('button');
    del.className = 'trash';
    del.setAttribute('aria-label', `Delete item ${item.text}`);
    del.textContent = '✕';
    del.addEventListener('click', () => onRemove(item.id));

    li.append(cb, text, meta, del);
    el.list.appendChild(li);
  }

  if (!el.devPanel.hidden) {
    el.dump.textContent = JSON.stringify(state, null, 2);
  }
}

function toggleDev() {
  const nowHidden = !el.devPanel.hidden;
  el.devPanel.hidden = nowHidden;
  el.devToggle.setAttribute('aria-expanded', String(!nowHidden));
  if (!nowHidden) el.dump.textContent = JSON.stringify(state, null, 2);
}

function exportState() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: 'state.json' });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function resetState() {
  if (!confirm('Reset all data?')) return;
  localStorage.removeItem(STORAGE_KEY);
  state.items = [];
  persist(); render();
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
  catch { return null; }
}

function genBuildId() {
  const d = new Date();
  return `${d.getFullYear().toString().slice(-2)}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`;
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// Game elements
const canvas = document.getElementById('game');
const debugEl = document.getElementById('debug');
const toggleBtn = document.getElementById('toggle-debug');

const game = new Game(canvas, { debugEl });
const loop = createLoop({
  update: (dt) => game.update(dt),
  render: (interp) => game.render(interp),
});

toggleBtn.addEventListener('click', () => {
  const on = debugEl.hasAttribute('hidden');
  debugEl.toggleAttribute('hidden', !on ? false : true);
  toggleBtn.setAttribute('aria-pressed', String(!on));
  game.debugOverlay.enabled = !on;
});

window.addEventListener('resize', () => game.renderer.resizeToDisplay());
game.renderer.resizeToDisplay();
loop.start();