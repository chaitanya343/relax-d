const palette = [
  [120, 200, 255],
  [200, 140, 255],
  [255, 145, 220],
  [120, 235, 200],
  [255, 190, 120],
  [255, 235, 120],
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
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

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function paletteAtTime(time, offset = 0) {
  const shift = (time * 0.00008 + offset) % palette.length;
  const index = Math.floor(shift);
  const nextIndex = (index + 1) % palette.length;
  const mix = shift - index;
  return mixColor(palette[index], palette[nextIndex], mix);
}

export function mount(container) {
  const canvas = document.createElement('canvas');
  canvas.className = 'tide-canvas';
  container.innerHTML = '';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let dpr = Math.max(window.devicePixelRatio || 1, 1);
  const blooms = [];
  let lastTime = performance.now();
  let rafId = null;
  let autoTimer = 0;

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

  function drawBackground(time) {
    const top = paletteAtTime(time, 0.2);
    const mid = paletteAtTime(time, 1.0);
    const bottom = paletteAtTime(time, 1.8);
    const angle = time * 0.00008;
    const x0 = width * 0.5 + Math.cos(angle) * width * 0.4;
    const y0 = height * 0.5 + Math.sin(angle) * height * 0.4;
    const x1 = width * 0.5 - Math.cos(angle) * width * 0.4;
    const y1 = height * 0.5 - Math.sin(angle) * height * 0.4;
    const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    gradient.addColorStop(0, rgba(top, 1));
    gradient.addColorStop(0.5, rgba(mid, 0.95));
    gradient.addColorStop(1, rgba(bottom, 0.95));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      0,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.8
    );
    glow.addColorStop(0, rgba(paletteAtTime(time, 2.4), 0.35));
    glow.addColorStop(1, rgba(paletteAtTime(time, 0.6), 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  function spawnBloom(x, y) {
    const primary = paletteAtTime(performance.now(), Math.random() * 2);
    const secondary = paletteAtTime(performance.now(), Math.random() * 3);
    blooms.push({
      x,
      y,
      start: 0,
      end: randomBetween(520, 760),
      age: 0,
      life: randomBetween(3800, 5200),
      ring: secondary,
      fill: primary,
    });
  }

  function drawBloom(bloom, time) {
    const progress = bloom.age / bloom.life;
    const radius = lerp(bloom.start, bloom.end, progress);
    const alpha = clamp(1 - Math.pow(progress, 2), 0, 1);

    const swirlCount = 3;
    for (let i = 0; i < swirlCount; i += 1) {
      const phase = time * 0.0012 + i * 2.1 + bloom.x * 0.002;
      const offset = radius * (0.08 + i * 0.05);
      const cx = bloom.x + Math.cos(phase) * offset;
      const cy = bloom.y + Math.sin(phase) * offset;
      const innerRadius = radius * (0.5 + i * 0.08);
      const fillGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerRadius);
      fillGradient.addColorStop(0, rgba(bloom.fill, 0));
      fillGradient.addColorStop(0.35, rgba(bloom.fill, 0.22 * alpha));
      fillGradient.addColorStop(1, rgba(bloom.fill, 0.85 * alpha));

      ctx.beginPath();
      ctx.fillStyle = fillGradient;
      ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function frame(time) {
    const delta = Math.min(time - lastTime, 32);
    lastTime = time;
    autoTimer += delta;

    drawBackground(time);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    if (autoTimer >= 3000) {
      spawnBloom(width * 0.5, height * 0.5);
      autoTimer = 0;
    }
    for (let i = blooms.length - 1; i >= 0; i -= 1) {
      const bloom = blooms[i];
      bloom.age += delta;
      if (bloom.age >= bloom.life) {
        blooms.splice(i, 1);
        continue;
      }
      drawBloom(bloom, time);
    }
    ctx.restore();

    rafId = requestAnimationFrame(frame);
  }

  function onPointerDown(event) {
    const rect = canvas.getBoundingClientRect();
    spawnBloom(event.clientX - rect.left, event.clientY - rect.top);
  }

  resize();
  rafId = requestAnimationFrame(frame);

  window.addEventListener('resize', resize);
  canvas.addEventListener('pointerdown', onPointerDown);

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('pointerdown', onPointerDown);
    container.innerHTML = '';
  };
}
