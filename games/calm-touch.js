const pastelPalette = [
  { ring: [105, 170, 255], fill: [165, 215, 255] },
  { ring: [160, 120, 255], fill: [200, 175, 255] },
  { ring: [255, 130, 185], fill: [255, 195, 220] },
  { ring: [100, 225, 185], fill: [165, 245, 215] },
  { ring: [255, 170, 95], fill: [255, 210, 150] },
];

function lerp(a, b, t) {
  return a + (b - a) * t;
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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function shiftHue(rgb, degrees) {
  const [r, g, b] = rgb.map((channel) => channel / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === r) {
      hue = ((g - b) / delta) % 6;
    } else if (max === g) {
      hue = (b - r) / delta + 2;
    } else {
      hue = (r - g) / delta + 4;
    }
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  const newHue = (hue + degrees + 360) % 360;
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs(((newHue / 60) % 2) - 1));
  const m = lightness - c / 2;

  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (newHue < 60) {
    rp = c;
    gp = x;
  } else if (newHue < 120) {
    rp = x;
    gp = c;
  } else if (newHue < 180) {
    gp = c;
    bp = x;
  } else if (newHue < 240) {
    gp = x;
    bp = c;
  } else if (newHue < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }

  return [
    Math.round(clamp((rp + m) * 255, 0, 255)),
    Math.round(clamp((gp + m) * 255, 0, 255)),
    Math.round(clamp((bp + m) * 255, 0, 255)),
  ];
}

function rgba(rgb, alpha) {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

export function mount(container) {
  const canvas = document.createElement('canvas');
  canvas.className = 'calm-canvas';
  container.innerHTML = '';
  container.appendChild(canvas);

  const intro = document.createElement('div');
  intro.className = 'calm-intro';
  intro.textContent = 'Tap for ripples';
  container.appendChild(intro);

  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let dpr = Math.max(window.devicePixelRatio || 1, 1);

  const ripples = [];
  let lastTime = performance.now();
  let rafId = null;

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

  function randomPaletteMix() {
    const firstIndex = Math.floor(Math.random() * pastelPalette.length);
    let secondIndex = Math.floor(Math.random() * pastelPalette.length);
    if (secondIndex === firstIndex) {
      secondIndex = (secondIndex + 1) % pastelPalette.length;
    }
    const mix = Math.random();
    const first = pastelPalette[firstIndex];
    const second = pastelPalette[secondIndex];
    return {
      ring: mixColor(first.ring, second.ring, mix),
      fill: mixColor(first.fill, second.fill, mix),
    };
  }

  function spawnRipple(x, y, time) {
    const palette = randomPaletteMix();
    const hueShift = randomBetween(-16, 16);
    ripples.push({
      x,
      y,
      start: 0,
      end: randomBetween(600, 900),
      age: 0,
      life: randomBetween(5200, 7200),
      ring: shiftHue(palette.ring, hueShift),
      fill: shiftHue(palette.fill, hueShift * 0.7),
    });
  }

  function onPointerDown(event) {
    const rect = canvas.getBoundingClientRect();
    spawnRipple(event.clientX - rect.left, event.clientY - rect.top, performance.now());
  }

  function drawRipple(ripple) {
    const progress = ripple.age / ripple.life;
    const radius = lerp(ripple.start, ripple.end, progress);
    const alpha = Math.max(0, 1 - Math.pow(progress, 2.1));

    // Central fill with softer gradient
    ctx.beginPath();
    const innerRadius = radius * 0.65;
    const fillGradient = ctx.createRadialGradient(
      ripple.x,
      ripple.y,
      0,
      ripple.x,
      ripple.y,
      innerRadius
    );
    fillGradient.addColorStop(0, rgba(ripple.fill, 0));
    fillGradient.addColorStop(0.4, rgba(ripple.fill, 0.15 * alpha));
    fillGradient.addColorStop(0.7, rgba(ripple.fill, 0.35 * alpha));
    fillGradient.addColorStop(1, rgba(ripple.fill, 0.8 * alpha));
    ctx.fillStyle = fillGradient;
    ctx.arc(ripple.x, ripple.y, innerRadius, 0, Math.PI * 2);
    ctx.fill();

    // Multiple concentric rings with varying opacity
    const ringCount = 4;
    for (let r = 0; r < ringCount; r++) {
      const ringProgress = (r + 1) / (ringCount + 1);
      const ringRadius = radius * ringProgress;
      const ringAlpha = alpha * (1 - ringProgress * 0.5);
      const lineWidth = 2.5 - r * 0.4;

      ctx.beginPath();
      ctx.strokeStyle = rgba(ripple.ring, ringAlpha * 0.6);
      ctx.lineWidth = lineWidth;

      // Draw wavy ring using sin waves
      const waveCount = 12 + r * 4;
      const waveAmp = 3 + r * 1.5;
      const phaseOffset = progress * Math.PI * 2 + r * 0.5;

      for (let i = 0; i <= 360; i += 2) {
        const angle = (i * Math.PI) / 180;
        const wave = Math.sin(angle * waveCount + phaseOffset) * waveAmp * (1 - progress);
        const px = ripple.x + Math.cos(angle) * (ringRadius + wave);
        const py = ripple.y + Math.sin(angle) * (ringRadius + wave);
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Outer glow ring with shadow
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = rgba(ripple.ring, 0.3 * alpha);
    ctx.beginPath();
    ctx.strokeStyle = rgba(ripple.ring, 0.9 * alpha);
    ctx.lineWidth = 3;
    ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Petal-like decorative elements
    if (progress < 0.7) {
      const petalCount = 6;
      const petalAlpha = alpha * (1 - progress / 0.7) * 0.4;
      for (let p = 0; p < petalCount; p++) {
        const petalAngle = (p / petalCount) * Math.PI * 2 + progress * Math.PI;
        const petalDist = radius * 0.85;
        const px = ripple.x + Math.cos(petalAngle) * petalDist;
        const py = ripple.y + Math.sin(petalAngle) * petalDist;

        ctx.beginPath();
        ctx.fillStyle = rgba(ripple.fill, petalAlpha);
        ctx.arc(px, py, 4 + (1 - progress) * 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function frame(time) {
    const delta = Math.min(time - lastTime, 32);
    lastTime = time;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = ripples.length - 1; i >= 0; i -= 1) {
      const ripple = ripples[i];
      ripple.age += delta;
      if (ripple.age >= ripple.life) {
        ripples.splice(i, 1);
        continue;
      }
      drawRipple(ripple);
    }
    ctx.restore();

    rafId = requestAnimationFrame(frame);
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
