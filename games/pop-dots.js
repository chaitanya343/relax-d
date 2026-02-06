const palette = [
  { rim: 'rgba(120, 175, 235, 0.9)', fill: 'rgba(172, 214, 255, 0.62)' },
  { rim: 'rgba(185, 140, 235, 0.88)', fill: 'rgba(215, 185, 255, 0.6)' },
  { rim: 'rgba(255, 195, 155, 0.88)', fill: 'rgba(255, 218, 186, 0.6)' },
  { rim: 'rgba(130, 220, 200, 0.88)', fill: 'rgba(190, 245, 230, 0.6)' },
  { rim: 'rgba(245, 180, 210, 0.9)', fill: 'rgba(255, 205, 230, 0.62)' },
  { rim: 'rgba(255, 210, 135, 0.88)', fill: 'rgba(255, 230, 175, 0.6)' },
];

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function mount(container) {
  const canvas = document.createElement('canvas');
  canvas.className = 'bubble-canvas';
  container.innerHTML = '';
  container.appendChild(canvas);
  const introImage = document.createElement('img');
  introImage.className = 'intro-image';
  introImage.alt = 'Person blowing bubbles';
  introImage.src = './games/pop-dots-intro.png';
  container.appendChild(introImage);

  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let dpr = Math.max(window.devicePixelRatio || 1, 1);

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let motionFactor = prefersReduced.matches ? 0.7 : 1;
  let particleFactor = prefersReduced.matches ? 0.7 : 1;

  const bubbles = [];
  const pops = [];
  const mist = [];
  const respawnQueue = [];
  const emitter = { x: 40, y: 40 };

  const targetCount = 26;
  const introDuration = 3000;
  const respawnDuration = 2800;
  let introStart = null;

  function resize() {
    width = container.clientWidth;
    height = container.clientHeight;
    dpr = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    updateEmitter();
  }

  function updateEmitter() {
    if (!introImage.complete) {
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const imageRect = introImage.getBoundingClientRect();
    emitter.x = imageRect.right - containerRect.left - imageRect.width * 0.08;
    emitter.y = imageRect.top - containerRect.top + imageRect.height * 0.6;
    emitter.x = Math.min(Math.max(emitter.x, 20), width - 20);
    emitter.y = Math.min(Math.max(emitter.y, 20), height - 20);
  }

  function createBubble({
    start,
    target,
    launchedAt = performance.now(),
    launchDuration = 0,
    launchDelay = 0,
  } = {}) {
    const radius = randomBetween(26, 50);
    let bubble = null;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const targetPos = target ?? {
        x: randomBetween(radius, width - radius),
        y: randomBetween(radius, height - radius),
      };
      const startPos = start ?? targetPos;
      const candidate = {
        x: startPos.x,
        y: startPos.y,
        sx: startPos.x,
        sy: startPos.y,
        tx: targetPos.x,
        ty: targetPos.y,
        r: radius,
        vx: randomBetween(-0.32, 0.32),
        vy: randomBetween(-0.22, 0.22),
        seed: Math.random() * Math.PI * 2,
        color: palette[Math.floor(Math.random() * palette.length)],
        launchStart: launchedAt + launchDelay,
        launchDuration,
        settled: launchDuration === 0,
      };
      const tooClose = bubbles.some(
        (other) =>
          distance({ x: candidate.tx, y: candidate.ty }, { x: other.tx ?? other.x, y: other.ty ?? other.y }) <
          (candidate.r + other.r) * 0.8
      );
      if (!tooClose) {
        bubble = candidate;
        break;
      }
    }
    return bubble;
  }

  function seedIntroBubbles() {
    if (!introImage.complete) {
      return;
    }
    updateEmitter();
    introStart = performance.now();
    while (bubbles.length < targetCount) {
      const bubble = createBubble({
        start: { x: emitter.x, y: emitter.y },
        launchedAt: introStart,
        launchDuration: introDuration,
        launchDelay: randomBetween(80, 520),
      });
      if (bubble) {
        bubbles.push(bubble);
      } else {
        break;
      }
    }
  }

  function fillBubbles() {
    while (bubbles.length < targetCount) {
      const bubble = createBubble();
      if (bubble) {
        bubbles.push(bubble);
      } else {
        break;
      }
    }
  }

  function drawBubble(bubble, time) {
    const pulse = 1 + Math.sin(time * 0.0015 + bubble.seed) * 0.03;
    const r = bubble.r * pulse;
    const grad = ctx.createRadialGradient(
      bubble.x - r * 0.3,
      bubble.y - r * 0.3,
      r * 0.2,
      bubble.x,
      bubble.y,
      r
    );
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    grad.addColorStop(0.35, bubble.color.fill);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.08)');

    ctx.beginPath();
    ctx.fillStyle = grad;
    ctx.arc(bubble.x, bubble.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = bubble.color.rim;
    ctx.lineWidth = 1.2;
    ctx.arc(bubble.x, bubble.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawPop(pop) {
    const progress = pop.age / pop.life;
    const radius = pop.start + progress * pop.spread;
    ctx.beginPath();
    ctx.strokeStyle = `rgba(180, 200, 230, ${1 - progress})`;
    ctx.lineWidth = 1.6;
    ctx.arc(pop.x, pop.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawMist(particle) {
    ctx.beginPath();
    ctx.fillStyle = `rgba(255, 255, 255, ${particle.alpha})`;
    ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
    ctx.fill();
  }

  function popBubble(index, time) {
    const bubble = bubbles[index];
    bubbles.splice(index, 1);

    pops.push({
      x: bubble.x,
      y: bubble.y,
      start: bubble.r * 0.5,
      spread: bubble.r * 1.4,
      age: 0,
      life: 480,
    });

    const mistCount = Math.floor(26 * particleFactor);
    for (let i = 0; i < mistCount; i += 1) {
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(0.2, 0.9) * motionFactor;
      mist.push({
        x: bubble.x,
        y: bubble.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: randomBetween(1.5, 3.4),
        alpha: randomBetween(0.4, 0.7),
        life: randomBetween(300, 600),
        age: 0,
      });
    }

    respawnQueue.push({
      at: time + randomBetween(300, 700),
    });
  }

  function updateBubbles(time) {
    bubbles.forEach((bubble) => {
      if (bubble.launchDuration > 0) {
        const rawProgress = (time - bubble.launchStart) / bubble.launchDuration;
        if (rawProgress < 0) {
          bubble.x = bubble.sx;
          bubble.y = bubble.sy;
          return;
        }
        if (rawProgress < 1) {
          const eased = 1 - Math.pow(1 - rawProgress, 3);
          bubble.x = bubble.sx + (bubble.tx - bubble.sx) * eased;
          bubble.y = bubble.sy + (bubble.ty - bubble.sy) * eased;
          return;
        }
        if (!bubble.settled) {
          bubble.x = bubble.tx;
          bubble.y = bubble.ty;
          bubble.settled = true;
        }
      }

      bubble.x += bubble.vx * motionFactor;
      bubble.y += bubble.vy * motionFactor;
      bubble.x += Math.cos(time * 0.0008 + bubble.seed) * 0.14 * motionFactor;
      bubble.y += Math.sin(time * 0.0009 + bubble.seed) * 0.12 * motionFactor;

      if (bubble.x - bubble.r < 0 || bubble.x + bubble.r > width) {
        bubble.vx *= -1;
      }
      if (bubble.y - bubble.r < 0 || bubble.y + bubble.r > height) {
        bubble.vy *= -1;
      }

      bubble.x = Math.min(Math.max(bubble.x, bubble.r), width - bubble.r);
      bubble.y = Math.min(Math.max(bubble.y, bubble.r), height - bubble.r);
    });
  }

  function updatePops(delta) {
    for (let i = pops.length - 1; i >= 0; i -= 1) {
      const pop = pops[i];
      pop.age += delta;
      if (pop.age >= pop.life) {
        pops.splice(i, 1);
      }
    }
  }

  function updateMist(delta) {
    for (let i = mist.length - 1; i >= 0; i -= 1) {
      const particle = mist[i];
      particle.age += delta;
      particle.x += particle.vx * delta * 0.06;
      particle.y += particle.vy * delta * 0.06;
      particle.alpha = Math.max(0, particle.alpha - delta / particle.life);
      if (particle.age >= particle.life || particle.alpha <= 0) {
        mist.splice(i, 1);
      }
    }
  }

  function updateRespawns(time) {
    for (let i = respawnQueue.length - 1; i >= 0; i -= 1) {
      if (respawnQueue[i].at <= time) {
        const bubble = createBubble({
          start: { x: emitter.x, y: emitter.y },
          launchedAt: time,
          launchDuration: respawnDuration,
        });
        if (bubble) {
          bubbles.push(bubble);
        }
        respawnQueue.splice(i, 1);
      }
    }
  }

  function onPointerDown(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    for (let i = bubbles.length - 1; i >= 0; i -= 1) {
      const bubble = bubbles[i];
      const dx = bubble.x - x;
      const dy = bubble.y - y;
      if (dx * dx + dy * dy <= bubble.r * bubble.r) {
        popBubble(i, performance.now());
        break;
      }
    }
  }

  function onMotionChange(event) {
    motionFactor = event.matches ? 0.7 : 1;
    particleFactor = event.matches ? 0.7 : 1;
  }

  let lastTime = performance.now();
  let rafId = null;

  function frame(time) {
    const delta = Math.min(time - lastTime, 32);
    lastTime = time;

    ctx.clearRect(0, 0, width, height);

    updateBubbles(time);
    updatePops(delta);
    updateMist(delta);
    updateRespawns(time);
    if (introStart && time - introStart > introDuration) {
      fillBubbles();
    }

    bubbles.forEach((bubble) => drawBubble(bubble, time));
    pops.forEach(drawPop);
    mist.forEach(drawMist);

    rafId = requestAnimationFrame(frame);
  }

  resize();
  introStart = null;
  if (introImage.complete) {
    seedIntroBubbles();
  }
  rafId = requestAnimationFrame(frame);

  window.addEventListener('resize', resize);
  canvas.addEventListener('pointerdown', onPointerDown);
  prefersReduced.addEventListener('change', onMotionChange);
  introImage.addEventListener('load', () => {
    updateEmitter();
    seedIntroBubbles();
  });

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('pointerdown', onPointerDown);
    prefersReduced.removeEventListener('change', onMotionChange);
    introImage.removeEventListener('load', updateEmitter);
    container.innerHTML = '';
  };
}
