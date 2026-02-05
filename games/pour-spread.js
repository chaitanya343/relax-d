const palette = [
  { fill: [170, 215, 255] },
  { fill: [210, 175, 255] },
  { fill: [255, 190, 220] },
  { fill: [170, 245, 220] },
  { fill: [255, 210, 165] },
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function mixChannel(a, b, t) {
  return Math.round(lerp(a, b, t));
}

function mixColor(a, b, t) {
  return [
    mixChannel(a[0], b[0], t),
    mixChannel(a[1], b[1], t),
    mixChannel(a[2], b[2], t),
  ];
}

function rgba(rgb, alpha) {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function randomPaletteMix() {
  const firstIndex = Math.floor(Math.random() * palette.length);
  let secondIndex = Math.floor(Math.random() * palette.length);
  if (secondIndex === firstIndex) {
    secondIndex = (secondIndex + 1) % palette.length;
  }
  const mix = Math.random();
  return {
    fill: mixColor(palette[firstIndex].fill, palette[secondIndex].fill, mix),
  };
}

export function mount(container) {
  const canvas = document.createElement('canvas');
  canvas.className = 'pour-canvas';
  container.innerHTML = '';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let dpr = Math.max(window.devicePixelRatio || 1, 1);
  const blooms = [];
  let lastTime = performance.now();
  let rafId = null;
  let activePour = null;

  function resize() {
    width = container.clientWidth;
    height = container.clientHeight;
    dpr = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawBloom(bloom) {
    const progress = bloom.age / bloom.life;
    const radius = lerp(bloom.start, bloom.end, progress);
    const alpha = clamp(1 - Math.pow(progress, 2.0), 0, 1);

    const innerRadius = radius * 0.92;
    ctx.fillStyle = rgba(bloom.fill, 0.98 * alpha);
    ctx.beginPath();
    ctx.arc(bloom.x, bloom.y, innerRadius, 0, Math.PI * 2);
    ctx.fill();

    if (bloom.blob) {
      const { offsets, scale } = bloom.blob;
      offsets.forEach((offset) => {
        ctx.beginPath();
        ctx.arc(
          bloom.x + offset.x,
          bloom.y + offset.y,
          innerRadius * scale,
          0,
          Math.PI * 2
        );
        ctx.fill();
      });
    }

    ctx.save();
    ctx.strokeStyle = rgba(bloom.fill, 0.45 * alpha);
    ctx.lineWidth = 1.1;
    ctx.setLineDash([6, 10]);
    ctx.beginPath();
    ctx.arc(bloom.x, bloom.y, innerRadius * 0.95, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const streakCount = 14;
    for (let i = 0; i < streakCount; i += 1) {
      const angle = (Math.PI * 2 * i) / streakCount + (bloom.seed ?? 0);
      const length = innerRadius * (0.07 + (i % 4) * 0.025);
      const jitter = (i % 2 === 0 ? 1 : -1) * 2.5;
      const sx = bloom.x + Math.cos(angle) * innerRadius * 0.84;
      const sy = bloom.y + Math.sin(angle) * innerRadius * 0.84;
      const ex = bloom.x + Math.cos(angle) * (innerRadius * 0.84 + length) + jitter;
      const ey = bloom.y + Math.sin(angle) * (innerRadius * 0.84 + length) - jitter;
      ctx.beginPath();
      ctx.strokeStyle = rgba(bloom.fill, 0.35 * alpha);
      ctx.lineWidth = 1;
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
    ctx.restore();
  }

  function beginPour(x, y) {
    const paletteMix = randomPaletteMix();
    activePour = {
      x,
      y,
      seed: Math.random() * Math.PI * 2,
      start: 0,
      end: randomBetween(210, 350),
      age: 0,
      life: randomBetween(21000, 29400),
      fill: paletteMix.fill,
      growing: true,
      growthSpeed: randomBetween(0.3, 0.5),
      spillTimer: 0,
      blob: {
        scale: randomBetween(0.82, 0.96),
        offsets: [
          { x: randomBetween(-12, 12), y: randomBetween(-10, 10) },
          { x: randomBetween(-10, 10), y: randomBetween(-12, 12) },
        ],
      },
    };
  }

  function endPour() {
    if (activePour) {
      activePour.growing = false;
      blooms.push(activePour);
      activePour = null;
    }
  }

  function updateActive(delta) {
    if (!activePour) return;
    activePour.age += delta;
    activePour.end = Math.min(activePour.end + delta * activePour.growthSpeed, 1000);
    activePour.spillTimer += delta;
    if (activePour.spillTimer > 90) {
      blooms.push({
        x: activePour.x + Math.sin(activePour.seed + activePour.spillTimer * 0.01) * 3,
        y: activePour.y + Math.cos(activePour.seed + activePour.spillTimer * 0.012) * 3,
        start: 0,
        end: randomBetween(90, 160),
        age: 0,
        life: randomBetween(10800, 15600),
        fill: activePour.fill,
        blob: {
          scale: randomBetween(0.78, 0.92),
          offsets: [
            { x: randomBetween(-10, 10), y: randomBetween(-8, 8) },
            { x: randomBetween(-8, 8), y: randomBetween(-10, 10) },
          ],
        },
      });
      activePour.spillTimer = 0;
    }
  }

  function frame(time) {
    const delta = Math.min(time - lastTime, 32);
    lastTime = time;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    updateActive(delta);
    if (activePour) {
      drawBloom(activePour);
    }

    for (let i = blooms.length - 1; i >= 0; i -= 1) {
      const bloom = blooms[i];
      bloom.age += delta;
      if (bloom.age >= bloom.life) {
        blooms.splice(i, 1);
        continue;
      }
      drawBloom(bloom);
    }
    ctx.restore();

    rafId = requestAnimationFrame(frame);
  }

  function onPointerDown(event) {
    const rect = canvas.getBoundingClientRect();
    beginPour(event.clientX - rect.left, event.clientY - rect.top);
  }

  function onPointerMove(event) {
    if (!activePour) return;
    const rect = canvas.getBoundingClientRect();
    activePour.x = event.clientX - rect.left;
    activePour.y = event.clientY - rect.top;
    blooms.push({
      x: activePour.x,
      y: activePour.y,
      start: 0,
      end: randomBetween(60, 110),
      age: 0,
      life: randomBetween(8400, 12600),
      fill: activePour.fill,
      blob: {
        scale: randomBetween(0.76, 0.9),
        offsets: [
          { x: randomBetween(-8, 8), y: randomBetween(-6, 6) },
          { x: randomBetween(-6, 6), y: randomBetween(-8, 8) },
        ],
      },
    });
  }

  function onPointerUp() {
    endPour();
  }

  resize();
  rafId = requestAnimationFrame(frame);

  window.addEventListener('resize', resize);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    container.innerHTML = '';
  };
}
