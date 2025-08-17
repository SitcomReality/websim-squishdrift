export class TweaksPanel {
  constructor(aidriving) {
    this.aidriving = aidriving;
    this.panel = null;
    this.createPanel();
  }

  createPanel() {
    // Create floating panel
    this.panel = document.createElement('div');
    this.panel.className = 'dev-panel';
    this.panel.style.position = 'fixed';
    this.panel.style.right = '12px';
    this.panel.style.bottom = '12px';
    this.panel.style.width = '360px';
    this.panel.style.maxWidth = 'calc(100% - 24px)';
    this.panel.style.border = '1px solid var(--line)';
    this.panel.style.background = '#fff';
    this.panel.style.borderRadius = '12px';
    this.panel.style.padding = '12px';
    this.panel.style.boxShadow = '0 8px 40px rgba(0,0,0,.1)';
    this.panel.style.zIndex = '1000';

    const header = document.createElement('h3');
    header.textContent = 'NPC Driving Tweaks';
    header.style.margin = '0 0 12px 0';
    header.style.fontSize = '16px';
    this.panel.appendChild(header);

    // Create tweak controls
    this.createSlider('Base Speed', 'baseSpeed', 1, 8, 0.1);
    this.createCheckbox('Zebra Slowdown', 'zebraSlowdown.enabled');
    this.createSlider('Zebra Min Distance', 'zebraSlowdown.minDistance', 1, 10, 1);
    this.createSlider('Zebra Max Distance', 'zebraSlowdown.maxDistance', 2, 20, 1);
    this.createSlider('Zebra Min Speed', 'zebraSlowdown.minSpeedMultiplier', 0.1, 1, 0.05);
    this.createSlider('Steering Gain', 'steering.steerGain', 1, 20, 0.5);
    this.createSlider('Steering Smooth', 'steering.smoothFactor', 0, 1, 0.05);
    this.createSlider('Prediction Time', 'steering.predictionTime', 0.1, 2, 0.1);

    document.body.appendChild(this.panel);
  }

  createSlider(label, path, min, max, step) {
    const container = document.createElement('div');
    container.className = 'dev-row';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'space-between';
    container.style.gap = '8px';
    container.style.marginBottom = '8px';

    const labelEl = document.createElement('span');
    labelEl.className = 'label';
    labelEl.textContent = label;
    labelEl.style.color = 'var(--muted)';
    labelEl.style.fontSize = '12px';

    const value = this.getNestedValue(this.aidriving.tweaks, path);
    const valueEl = document.createElement('span');
    valueEl.className = 'mono';
    valueEl.textContent = value.toFixed(2);
    valueEl.style.fontFamily = 'ui-monospace';
    valueEl.style.fontSize = '12px';
    valueEl.style.minWidth = '40px';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = value;
    slider.style.flex = '1';
    slider.style.margin = '0 8px';

    slider.addEventListener('input', () => {
      this.setNestedValue(this.aidriving.tweaks, path, parseFloat(slider.value));
      valueEl.textContent = parseFloat(slider.value).toFixed(2);
    });

    container.appendChild(labelEl);
    container.appendChild(slider);
    container.appendChild(valueEl);
    this.panel.appendChild(container);
  }

  createCheckbox(label, path) {
    const container = document.createElement('div');
    container.className = 'dev-row';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'space-between';
    container.style.marginBottom = '8px';

    const labelEl = document.createElement('span');
    labelEl.className = 'label';
    labelEl.textContent = label;
    labelEl.style.color = 'var(--muted)';
    labelEl.style.fontSize = '12px';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = this.getNestedValue(this.aidriving.tweaks, path);
    checkbox.addEventListener('change', () => {
      this.setNestedValue(this.aidriving.tweaks, path, checkbox.checked);
    });

    container.appendChild(labelEl);
    container.appendChild(checkbox);
    this.panel.appendChild(container);
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((o, k) => o[k], obj);
  }

  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((o, k) => o[k], obj);
    target[lastKey] = value;
  }
}