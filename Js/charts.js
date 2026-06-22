// charts.js — tiny canvas chart helpers. No external chart library; keeps the app 100% offline.

function themeColor(varName, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v || fallback;
}

function prepCanvas(canvas, cssHeight) {
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || canvas.parentElement.clientWidth || 300;
  const h = cssHeight || canvas.height || 160;
  canvas.width = cssWidth * dpr;
  canvas.height = h * dpr;
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, h);
  return { ctx, w: cssWidth, h };
}

export function drawEmptyState(canvas, message = 'Not enough data yet') {
  const { ctx, w, h } = prepCanvas(canvas);
  ctx.fillStyle = themeColor('--text-3', '#6E7790');
  ctx.font = '12.5px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, w / 2, h / 2);
}

export function drawLineChart(canvas, points, opts = {}) {
  if (!points || points.length < 2) return drawEmptyState(canvas);
  const { ctx, w, h } = prepCanvas(canvas);
  const padL = 34, padR = 10, padT = 14, padB = 22;
  const color = opts.color || themeColor('--violet', '#8B7CF6');
  const gridColor = themeColor('--glass-border', 'rgba(255,255,255,0.12)');
  const textColor = themeColor('--text-3', '#6E7790');

  const ys = points.map((p) => p.y);
  let min = Math.min(...ys), max = Math.max(...ys);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.15;
  min -= pad; max += pad;

  const plotW = w - padL - padR, plotH = h - padT - padB;
  const xAt = (i) => padL + (i / (points.length - 1)) * plotW;
  const yAt = (v) => padT + plotH - ((v - min) / (max - min)) * plotH;

  // grid lines
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y = padT + (plotH / 3) * i;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
  }

  // y labels (min/max)
  ctx.fillStyle = textColor;
  ctx.font = '10.5px -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(Math.round(max), padL - 6, padT);
  ctx.fillText(Math.round(min), padL - 6, padT + plotH);

  // area fill
  const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
  grad.addColorStop(0, color + '55');
  grad.addColorStop(1, color + '00');
  ctx.beginPath();
  points.forEach((p, i) => { const x = xAt(i), y = yAt(p.y); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
  ctx.lineTo(xAt(points.length - 1), padT + plotH);
  ctx.lineTo(xAt(0), padT + plotH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // line
  ctx.beginPath();
  points.forEach((p, i) => { const x = xAt(i), y = yAt(p.y); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  // dots
  ctx.fillStyle = color;
  points.forEach((p, i) => {
    const x = xAt(i), y = yAt(p.y);
    ctx.beginPath(); ctx.arc(x, y, i === points.length - 1 ? 3.6 : 2.4, 0, Math.PI * 2); ctx.fill();
  });

  // x labels: first / last
  ctx.fillStyle = textColor;
  ctx.textAlign = 'left';
  ctx.fillText(points[0].x, padL, h - 6);
  ctx.textAlign = 'right';
  ctx.fillText(points[points.length - 1].x, w - padR, h - 6);
}

export function drawBarChart(canvas, points, opts = {}) {
  if (!points || points.length === 0) return drawEmptyState(canvas);
  const { ctx, w, h } = prepCanvas(canvas);
  const padL = 30, padR = 10, padT = 14, padB = 22;
  const color = opts.color || themeColor('--orange', '#FF7A45');
  const textColor = themeColor('--text-3', '#6E7790');
  const goal = opts.goalLine;

  const ys = points.map((p) => p.y);
  let max = Math.max(...ys, goal || 0, 1);
  max *= 1.15;

  const plotW = w - padL - padR, plotH = h - padT - padB;
  const slot = plotW / points.length;
  const barW = Math.min(28, slot * 0.55);

  ctx.fillStyle = textColor;
  ctx.font = '10.5px -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(Math.round(max), padL - 6, padT);
  ctx.fillText('0', padL - 6, padT + plotH);

  points.forEach((p, i) => {
    const x = padL + slot * i + (slot - barW) / 2;
    const barH = (p.y / max) * plotH;
    const y = padT + plotH - barH;
    const grad = ctx.createLinearGradient(0, y, 0, padT + plotH);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color + '88');
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, barW, Math.max(barH, 2), 5);
    ctx.fill();

    ctx.fillStyle = textColor;
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.x, x + barW / 2, h - 6);
  });

  if (goal) {
    const gy = padT + plotH - (goal / max) * plotH;
    ctx.strokeStyle = themeColor('--violet', '#8B7CF6');
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(w - padR, gy); ctx.stroke();
    ctx.setLineDash([]);
  }
}

// Sets an SVG <circle> progress ring's fill amount (0-100) using stroke-dasharray/offset.
export function setRingProgress(circleEl, percent) {
  if (!circleEl) return;
  const r = parseFloat(circleEl.getAttribute('r'));
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  circleEl.style.strokeDasharray = `${circumference}`;
  circleEl.style.strokeDashoffset = `${circumference * (1 - clamped / 100)}`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
