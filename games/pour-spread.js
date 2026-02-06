const palette = [
  { fill: [140, 200, 255] },
  { fill: [200, 150, 255] },
  { fill: [255, 160, 200] },
  { fill: [140, 230, 200] },
  { fill: [255, 190, 140] },
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
  const mix = Math.random() * 0.4;
  return mixColor(palette[firstIndex].fill, palette[secondIndex].fill, mix);
}

export function mount(container) {
  const canvas = document.createElement('canvas');
  canvas.className = 'pour-canvas';
  container.innerHTML = '';
  container.appendChild(canvas);

  const intro = document.createElement('div');
  intro.className = 'pour-intro';
  intro.textContent = 'Touch to pour';
  container.appendChild(intro);

  const clearBtn = document.createElement('button');
  clearBtn.className = 'pour-clear';
  clearBtn.textContent = 'Clear';
  container.appendChild(clearBtn);

  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let dpr = Math.max(window.devicePixelRatio || 1, 1);
  const blobs = [];
  let lastTime = performance.now();
  let rafId = null;
  let isPouring = false;
  let pourX = 0;
  let pourY = 0;
  let clearProgress = 0;
  let isClearing = false;

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

  function drawBlob(blob, time) {
    const alpha = clamp(1 - blob.age / blob.life, 0, 1);
    if (alpha <= 0) return;

    const wobbleSpeed = 0.002;
    const wobbleAmp = 0.12;

    ctx.save();

    // Outer glow
    const glowGrad = ctx.createRadialGradient(
      blob.x, blob.y, blob.radius * 0.5,
      blob.x, blob.y, blob.radius * 1.4
    );
    glowGrad.addColorStop(0, rgba(blob.color, 0.2 * alpha));
    glowGrad.addColorStop(1, rgba(blob.color, 0));
    ctx.beginPath();
    ctx.fillStyle = glowGrad;
    ctx.arc(blob.x, blob.y, blob.radius * 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Main organic blob shape
    ctx.beginPath();
    const points = 32;
    for (let i = 0; i <= points; i++) {
      const angle = (Math.PI * 2 * i) / points;
      const wave1 = Math.sin(angle * 3 + blob.seed + time * wobbleSpeed) * wobbleAmp;
      const wave2 = Math.cos(angle * 5 + blob.seed * 1.5 + time * wobbleSpeed * 0.7) * (wobbleAmp * 0.5);
      const wave3 = Math.sin(angle * 2 + blob.seed * 0.5) * (wobbleAmp * 0.3);
      const r = blob.radius * (1 + wave1 + wave2 + wave3);
      const px = blob.x + Math.cos(angle) * r;
      const py = blob.y + Math.sin(angle) * r;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();

    // Gradient fill
    const grad = ctx.createRadialGradient(
      blob.x - blob.radius * 0.2, blob.y - blob.radius * 0.2, 0,
      blob.x, blob.y, blob.radius
    );
    grad.addColorStop(0, rgba(mixColor(blob.color, [255, 255, 255], 0.4), 0.9 * alpha));
    grad.addColorStop(0.5, rgba(blob.color, 0.85 * alpha));
    grad.addColorStop(1, rgba(mixColor(blob.color, [0, 0, 0], 0.1), 0.8 * alpha));
    ctx.fillStyle = grad;
    ctx.fill();

    // Highlight
    ctx.beginPath();
    ctx.arc(blob.x - blob.radius * 0.25, blob.y - blob.radius * 0.25, blob.radius * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = rgba([255, 255, 255], 0.4 * alpha);
    ctx.fill();

    ctx.restore();
  }

  function drawClearOverlay() {
    if (clearProgress <= 0) return;
    const eased = 1 - Math.pow(1 - clearProgress, 3);
    ctx.fillStyle = `rgba(255, 255, 255, ${eased * 0.95})`;
    ctx.fillRect(0, 0, width, height);
  }

  function spawnBlob(x, y) {
    const color = randomPaletteMix();
    blobs.push({
      x: x + randomBetween(-15, 15),
      y: y + randomBetween(-15, 15),
      color,
      seed: Math.random() * Math.PI * 2,
      radius: randomBetween(8, 16),
      targetRadius: randomBetween(50, 100),
      growSpeed: randomBetween(0.015, 0.025),
      age: 0,
      life: randomBetween(20000, 35000),
    });
  }

  function clearCanvas() {
    isClearing = true;
    clearProgress = 0;
  }

  function frame(time) {
    const delta = Math.min(time - lastTime, 32);
    lastTime = time;

    // Spawn new blobs while pouring
    if (isPouring && Math.random() < 0.12) {
      spawnBlob(pourX, pourY);
    }

    // Update clear animation
    if (isClearing) {
      clearProgress += delta / 600;
      if (clearProgress >= 1) {
        blobs.length = 0;
        isClearing = false;
        clearProgress = 0;
      }
    }

    // Update blobs - smooth organic growth
    for (let i = blobs.length - 1; i >= 0; i--) {
      const blob = blobs[i];
      blob.age += delta;

      // Smooth growth toward target
      blob.radius = lerp(blob.radius, blob.targetRadius, blob.growSpeed);

      if (blob.age >= blob.life) {
        blobs.splice(i, 1);
      }
    }

    ctx.clearRect(0, 0, width, height);

    // Draw all blobs
    blobs.forEach((blob) => drawBlob(blob, time));

    drawClearOverlay();

    rafId = requestAnimationFrame(frame);
  }

  function onPointerDown(event) {
    if (isClearing) return;
    const rect = canvas.getBoundingClientRect();
    pourX = event.clientX - rect.left;
    pourY = event.clientY - rect.top;
    isPouring = true;
    spawnBlob(pourX, pourY);
  }

  function onPointerMove(event) {
    if (!isPouring || isClearing) return;
    const rect = canvas.getBoundingClientRect();
    pourX = event.clientX - rect.left;
    pourY = event.clientY - rect.top;
  }

  function onPointerUp() {
    isPouring = false;
  }

  function onClearClick() {
    if (!isClearing) {
      clearCanvas();
    }
  }

  resize();
  rafId = requestAnimationFrame(frame);

  window.addEventListener('resize', resize);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  clearBtn.addEventListener('click', onClearClick);

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    clearBtn.removeEventListener('click', onClearClick);
    container.innerHTML = '';
  };
}
