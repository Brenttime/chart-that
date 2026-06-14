/**
 * Chart That v2 — Sketch Your Data
 * Rewritten with PointerEvent API for reliable cross-platform mouse/touch handling.
 * Fixes macOS click registration bug caused by Chart.js + dragdata plugin event interception.
 */

// ─── State ───────────────────────────────────────────────────────────────────
const COLORS = [
  '#007AFF', // System Blue
  '#FF3B30', // System Red
  '#34C759', // System Green
  '#FF9500', // System Orange
  '#AF52DE', // System Purple
  '#5AC8FA', // System Teal
  '#FF2D55', // System Pink
  '#FFCC00', // System Yellow
  '#5856D6', // System Indigo
  '#00C7BE', // System Mint
];

let seriesData = [[]];
let activeSeriesIndex = 0;
let undoStack = [];
let redoStack = [];
let chart = null;
let draggedPointIndex = null;
let isDragging = false;
let hintDismissed = false;
let pointerDownPos = null;

// ─── DOM Refs ────────────────────────────────────────────────────────────────
const canvas = document.getElementById('chartCanvas');
const ctx = canvas.getContext('2d');
const chartHint = document.getElementById('chartHint');
const seriesButtonsEl = document.getElementById('seriesButtons');
const interpolationSelect = document.getElementById('interpolation');

// ─── Segmented Control Wiring ────────────────────────────────────────────────
const segButtons = document.querySelectorAll('#interpolationControl .seg-btn');
segButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    segButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    interpolationSelect.value = btn.dataset.value;
    interpolationSelect.dispatchEvent(new Event('change'));
  });
});

// ─── Inspector Toggle ────────────────────────────────────────────────────────
const inspectorToggle = document.getElementById('inspectorToggle');
const inspectorPanel = document.getElementById('inspector');
inspectorToggle.addEventListener('click', () => {
  inspectorPanel.classList.toggle('hidden');
  inspectorToggle.classList.toggle('active');
  // Give chart time to reflow then update
  setTimeout(() => { if (chart) chart.resize(); }, 220);
});

// ─── Slider Value Display ────────────────────────────────────────────────────
const pointSizeSlider = document.getElementById('pointSize');
const lineWidthSlider = document.getElementById('lineWidth');
const pointSizeVal = document.getElementById('pointSizeVal');
const lineWidthVal = document.getElementById('lineWidthVal');

pointSizeSlider.addEventListener('input', () => { pointSizeVal.textContent = pointSizeSlider.value; });
lineWidthSlider.addEventListener('input', () => { lineWidthVal.textContent = lineWidthSlider.value; });

// ─── Chart Setup ─────────────────────────────────────────────────────────────
function getChartConfig() {
  const interpolation = interpolationSelect.value;
  const pointSize = parseInt(document.getElementById('pointSize').value);
  const lineWidth = parseInt(document.getElementById('lineWidth').value);
  const showGrid = document.getElementById('showGrid').checked;
  const yMax = parseInt(document.getElementById('yMax').value) || 100;
  const xMax = parseInt(document.getElementById('xMax').value) || 100;
  const title = document.getElementById('chartTitle').value;
  const xLabel = document.getElementById('xLabel').value;
  const yLabel = document.getElementById('yLabel').value;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(152, 152, 157, 0.12)' : 'rgba(0, 0, 0, 0.05)';
  const textColor = isDark ? '#98989d' : '#86868b';

  let tension = 0;
  let stepped = false;
  let cubicInterpolationMode = undefined;

  if (interpolation === 'monotone') {
    tension = 0.4;
    cubicInterpolationMode = 'monotone';
  } else if (interpolation === 'bezier') {
    tension = 0.4;
  } else if (interpolation === 'step') {
    stepped = 'before';
  }

  const datasets = seriesData.map((data, i) => ({
    label: `Series ${i + 1}`,
    data: data.map(p => ({ x: p.x, y: p.y })),
    borderColor: COLORS[i % COLORS.length],
    backgroundColor: COLORS[i % COLORS.length] + '22',
    pointBackgroundColor: COLORS[i % COLORS.length],
    pointBorderColor: '#ffffff',
    pointBorderWidth: i === activeSeriesIndex ? 2 : 1,
    pointRadius: i === activeSeriesIndex ? pointSize : pointSize * 0.7,
    pointHoverRadius: pointSize + 3,
    borderWidth: i === activeSeriesIndex ? lineWidth : lineWidth * 0.7,
    tension,
    stepped,
    cubicInterpolationMode,
    fill: false,
    showLine: true,
    order: i === activeSeriesIndex ? 0 : 1,
  }));

  return {
    type: 'scatter',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: {
        mode: 'nearest',
        intersect: true,
        axis: 'xy',
      },
      plugins: {
        title: {
          display: !!title,
          text: title,
          color: textColor,
          font: { size: 15, weight: '600', family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' },
          padding: { bottom: 16 },
        },
        legend: {
          display: seriesData.length > 1,
          position: 'top',
          labels: {
            color: textColor,
            usePointStyle: true,
            pointStyle: 'circle',
            font: { size: 12, family: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif' },
          },
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(0,0,0,0.75)',
          titleFont: { size: 0 },
          bodyFont: { size: 12, family: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif' },
          padding: { x: 10, y: 6 },
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            title: () => '',
            label: (ctx) => `(${ctx.parsed.x.toFixed(1)}, ${ctx.parsed.y.toFixed(1)})`,
          },
        },
      },
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: xMax,
          title: { display: !!xLabel, text: xLabel, color: textColor, font: { size: 12, weight: '500' } },
          grid: { display: showGrid, color: gridColor, lineWidth: 0.5 },
          ticks: { color: textColor, font: { size: 11 } },
          border: { color: gridColor },
        },
        y: {
          type: 'linear',
          min: 0,
          max: yMax,
          title: { display: !!yLabel, text: yLabel, color: textColor, font: { size: 12, weight: '500' } },
          grid: { display: showGrid, color: gridColor, lineWidth: 0.5 },
          ticks: { color: textColor, font: { size: 11 } },
          border: { color: gridColor },
        },
      },
    },
  };
}

function initChart() {
  if (chart) chart.destroy();
  chart = new Chart(ctx, getChartConfig());
}

function updateChart() {
  initChart();
}

// ─── Series Management ───────────────────────────────────────────────────────
function renderSeriesButtons() {
  seriesButtonsEl.innerHTML = '';
  seriesData.forEach((_, i) => {
    const btn = document.createElement('button');
    btn.className = `series-btn${i === activeSeriesIndex ? ' active' : ''}`;
    btn.style.backgroundColor = COLORS[i % COLORS.length];
    btn.style.color = 'white';
    btn.textContent = i + 1;
    btn.title = `Series ${i + 1} (${seriesData[i].length} points)`;
    btn.addEventListener('click', () => {
      activeSeriesIndex = i;
      renderSeriesButtons();
      updateChart();
    });
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (seriesData.length > 1) {
        saveUndo();
        seriesData.splice(i, 1);
        if (activeSeriesIndex >= seriesData.length) activeSeriesIndex = seriesData.length - 1;
        renderSeriesButtons();
        updateChart();
        showToast('Series removed');
      }
    });
    seriesButtonsEl.appendChild(btn);
  });
}

document.getElementById('addSeriesBtn').addEventListener('click', () => {
  if (seriesData.length >= COLORS.length) {
    showToast('Max 10 series reached');
    return;
  }
  saveUndo();
  seriesData.push([]);
  activeSeriesIndex = seriesData.length - 1;
  renderSeriesButtons();
  updateChart();
  showToast(`Series ${seriesData.length} added`);
});

// ─── Point Interaction (PointerEvent API) ────────────────────────────────────
// Using pointer events for unified mouse + touch handling.
// This fixes the macOS bug where mousedown/mouseup gets consumed by Chart.js internals.

const DRAG_THRESHOLD = 5; // pixels moved before counting as drag

function getCanvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  return { canvasX: x, canvasY: y };
}

function canvasToData(canvasX, canvasY) {
  const xScale = chart.scales.x;
  const yScale = chart.scales.y;
  return {
    x: xScale.getValueForPixel(canvasX),
    y: yScale.getValueForPixel(canvasY),
  };
}

function dataToCanvas(dataX, dataY) {
  const xScale = chart.scales.x;
  const yScale = chart.scales.y;
  return {
    canvasX: xScale.getPixelForValue(dataX),
    canvasY: yScale.getPixelForValue(dataY),
  };
}

function findNearestPoint(canvasX, canvasY, threshold = 15) {
  const activeData = seriesData[activeSeriesIndex];
  let minDist = Infinity;
  let nearestIdx = -1;

  for (let i = 0; i < activeData.length; i++) {
    const { canvasX: px, canvasY: py } = dataToCanvas(activeData[i].x, activeData[i].y);
    const dist = Math.sqrt((canvasX - px) ** 2 + (canvasY - py) ** 2);
    if (dist < minDist && dist < threshold) {
      minDist = dist;
      nearestIdx = i;
    }
  }
  return nearestIdx;
}

function snapValue(val, gridSize) {
  const snap = document.getElementById('snapToGrid').checked;
  if (!snap) return val;
  const step = gridSize || 5;
  return Math.round(val / step) * step;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function isInChartArea(canvasX, canvasY) {
  if (!chart || !chart.chartArea) return false;
  const { left, right, top, bottom } = chart.chartArea;
  return canvasX >= left && canvasX <= right && canvasY >= top && canvasY <= bottom;
}

// ─── Pointer Events ──────────────────────────────────────────────────────────
canvas.addEventListener('pointerdown', (e) => {
  if (e.button === 2) return; // right-click handled by contextmenu

  // Capture pointer for reliable tracking
  canvas.setPointerCapture(e.pointerId);

  const { canvasX, canvasY } = getCanvasPoint(e);
  pointerDownPos = { canvasX, canvasY, pointerId: e.pointerId };

  const nearIdx = findNearestPoint(canvasX, canvasY);
  if (nearIdx >= 0) {
    draggedPointIndex = nearIdx;
    isDragging = false;
    saveUndo();
    canvas.style.cursor = 'grabbing';
  } else {
    draggedPointIndex = null;
    isDragging = false;
  }
});

canvas.addEventListener('pointermove', (e) => {
  const { canvasX, canvasY } = getCanvasPoint(e);

  if (draggedPointIndex !== null && pointerDownPos) {
    // Check if we've moved beyond threshold to count as drag
    const dx = canvasX - pointerDownPos.canvasX;
    const dy = canvasY - pointerDownPos.canvasY;
    const moved = Math.sqrt(dx * dx + dy * dy);

    if (moved > DRAG_THRESHOLD) {
      isDragging = true;
    }

    if (isDragging) {
      const { x, y } = canvasToData(canvasX, canvasY);
      const yMax = parseInt(document.getElementById('yMax').value) || 100;
      const xMax = parseInt(document.getElementById('xMax').value) || 100;

      seriesData[activeSeriesIndex][draggedPointIndex] = {
        x: clamp(snapValue(x, xMax / 20), 0, xMax),
        y: clamp(snapValue(y, yMax / 20), 0, yMax),
      };
      sortActiveData();
      updateChart();
    }
  } else {
    // Cursor feedback
    const nearIdx = findNearestPoint(canvasX, canvasY);
    if (isInChartArea(canvasX, canvasY)) {
      canvas.style.cursor = nearIdx >= 0 ? 'grab' : 'crosshair';
    } else {
      canvas.style.cursor = 'default';
    }
  }
});

canvas.addEventListener('pointerup', (e) => {
  if (e.button === 2) return;

  canvas.releasePointerCapture(e.pointerId);

  const { canvasX, canvasY } = getCanvasPoint(e);

  if (draggedPointIndex !== null) {
    if (!isDragging) {
      // Click on existing point without dragging — revert undo save
      undoStack.pop();
    }
    draggedPointIndex = null;
    isDragging = false;
    pointerDownPos = null;
    canvas.style.cursor = 'crosshair';
    return;
  }

  // Check if pointer stayed near start (no drag) — this is an "add point" click
  if (pointerDownPos) {
    const dx = canvasX - pointerDownPos.canvasX;
    const dy = canvasY - pointerDownPos.canvasY;
    const moved = Math.sqrt(dx * dx + dy * dy);

    if (moved <= DRAG_THRESHOLD && isInChartArea(canvasX, canvasY)) {
      const { x, y } = canvasToData(canvasX, canvasY);
      const yMax = parseInt(document.getElementById('yMax').value) || 100;
      const xMax = parseInt(document.getElementById('xMax').value) || 100;

      if (x >= 0 && x <= xMax && y >= 0 && y <= yMax) {
        saveUndo();
        const snappedX = clamp(snapValue(x, xMax / 20), 0, xMax);
        const snappedY = clamp(snapValue(y, yMax / 20), 0, yMax);
        seriesData[activeSeriesIndex].push({ x: snappedX, y: snappedY });
        sortActiveData();
        updateChart();
        dismissHint();
      }
    }
  }

  draggedPointIndex = null;
  isDragging = false;
  pointerDownPos = null;
  canvas.style.cursor = 'crosshair';
});

canvas.addEventListener('pointercancel', (e) => {
  // Clean up on cancel
  if (draggedPointIndex !== null && !isDragging) {
    undoStack.pop();
  }
  draggedPointIndex = null;
  isDragging = false;
  pointerDownPos = null;
  canvas.style.cursor = 'crosshair';
});

// Right-click to delete
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const { canvasX, canvasY } = getCanvasPoint(e);
  const nearIdx = findNearestPoint(canvasX, canvasY, 20);

  if (nearIdx >= 0) {
    saveUndo();
    seriesData[activeSeriesIndex].splice(nearIdx, 1);
    updateChart();
    showToast('Point removed');
  }
});

// Prevent default touch actions on canvas (avoids scroll/zoom interference)
canvas.style.touchAction = 'none';

// ─── Undo / Redo ─────────────────────────────────────────────────────────────
function saveUndo() {
  undoStack.push(JSON.parse(JSON.stringify(seriesData)));
  redoStack = [];
  if (undoStack.length > 50) undoStack.shift();
}

function undo() {
  if (undoStack.length === 0) return;
  redoStack.push(JSON.parse(JSON.stringify(seriesData)));
  seriesData = undoStack.pop();
  if (activeSeriesIndex >= seriesData.length) activeSeriesIndex = seriesData.length - 1;
  renderSeriesButtons();
  updateChart();
}

function redo() {
  if (redoStack.length === 0) return;
  undoStack.push(JSON.parse(JSON.stringify(seriesData)));
  seriesData = redoStack.pop();
  renderSeriesButtons();
  updateChart();
}

document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
    e.preventDefault();
    undo();
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
    e.preventDefault();
    redo();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
    e.preventDefault();
    redo();
  }
});

// ─── Sort ────────────────────────────────────────────────────────────────────
function sortActiveData() {
  seriesData[activeSeriesIndex].sort((a, b) => a.x - b.x);
}

// ─── Clear ───────────────────────────────────────────────────────────────────
document.getElementById('clearBtn').addEventListener('click', () => {
  if (seriesData[activeSeriesIndex].length === 0) return;
  saveUndo();
  seriesData[activeSeriesIndex] = [];
  updateChart();
  showToast('Series cleared');
});

document.getElementById('clearAllBtn').addEventListener('click', () => {
  const hasPoints = seriesData.some(s => s.length > 0);
  if (!hasPoints) return;
  saveUndo();
  seriesData = [[]];
  activeSeriesIndex = 0;
  renderSeriesButtons();
  updateChart();
  showToast('All cleared');
});

// ─── Export ──────────────────────────────────────────────────────────────────
document.getElementById('exportPng').addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'chart-that.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('PNG exported');
});

document.getElementById('copyBtn').addEventListener('click', async () => {
  try {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    showToast('Copied to clipboard');
  } catch (err) {
    showToast('Copy failed — try Export instead');
  }
});

// ─── Settings Changes ────────────────────────────────────────────────────────
const settingIds = ['chartTitle', 'xLabel', 'yLabel', 'yMax', 'xMax', 'interpolation', 'pointSize', 'lineWidth', 'showGrid', 'snapToGrid'];
settingIds.forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', updateChart);
    el.addEventListener('change', updateChart);
  }
});

// ─── Theme Toggle ────────────────────────────────────────────────────────────
const themeToggle = document.getElementById('themeToggle');
const sunIcon = document.getElementById('sunIcon');
const moonIcon = document.getElementById('moonIcon');

function setTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  sunIcon.style.display = dark ? 'none' : 'block';
  moonIcon.style.display = dark ? 'block' : 'none';
  localStorage.setItem('chart-that-theme', dark ? 'dark' : 'light');
  updateChart();
}

themeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  setTheme(!isDark);
});

// Init theme
const savedTheme = localStorage.getItem('chart-that-theme');
if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  setTheme(true);
}

// ─── Hint ────────────────────────────────────────────────────────────────────
function dismissHint() {
  if (!hintDismissed) {
    hintDismissed = true;
    chartHint.classList.add('hidden');
  }
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  // Force reflow for re-trigger animation
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('show'), 2200);
}

// ─── Init ────────────────────────────────────────────────────────────────────
renderSeriesButtons();
initChart();
canvas.style.cursor = 'crosshair';
