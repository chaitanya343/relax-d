const palette = [
    [255, 200, 120],
    [255, 180, 100],
    [255, 160, 90],
    [240, 150, 80],
];

const shapes = [];
const shapeCount = 12;

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

function generateShapes(width, height) {
    shapes.length = 0;
    for (let i = 0; i < shapeCount; i++) {
        shapes.push({
            x: randomBetween(50, width - 50),
            y: randomBetween(50, height - 50),
            radius: randomBetween(30, 70),
            type: Math.random() > 0.5 ? 'circle' : 'blob',
            seed: Math.random() * Math.PI * 2,
            color: palette[Math.floor(Math.random() * palette.length)],
            revealed: 0,
        });
    }
}

export function mount(container) {
    const canvas = document.createElement('canvas');
    canvas.className = 'glow-canvas';
    container.innerHTML = '';
    container.appendChild(canvas);

    const intro = document.createElement('div');
    intro.className = 'glow-intro';
    intro.textContent = 'Hold to create light';
    container.appendChild(intro);

    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let dpr = Math.max(window.devicePixelRatio || 1, 1);
    let lastTime = performance.now();
    let rafId = null;

    let isHolding = false;
    let holdX = 0;
    let holdY = 0;
    let glowRadius = 0;
    let glowIntensity = 0;
    const maxGlowRadius = 400;

    function resize() {
        width = container.clientWidth;
        height = container.clientHeight;
        dpr = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        generateShapes(width, height);
    }

    function drawBackground() {
        ctx.fillStyle = '#0d0d12';
        ctx.fillRect(0, 0, width, height);
    }

    function drawGlow(time) {
        if (glowRadius <= 0) return;

        const warmColor = mixColor([255, 190, 100], [255, 150, 80], Math.sin(time * 0.002) * 0.5 + 0.5);

        // Main glow
        const glowGrad = ctx.createRadialGradient(holdX, holdY, 0, holdX, holdY, glowRadius);
        glowGrad.addColorStop(0, rgba(warmColor, 0.9 * glowIntensity));
        glowGrad.addColorStop(0.3, rgba(warmColor, 0.5 * glowIntensity));
        glowGrad.addColorStop(0.7, rgba(warmColor, 0.15 * glowIntensity));
        glowGrad.addColorStop(1, rgba(warmColor, 0));

        ctx.beginPath();
        ctx.fillStyle = glowGrad;
        ctx.arc(holdX, holdY, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Flickering core
        const flicker = 1 + Math.sin(time * 0.015) * 0.1 + Math.sin(time * 0.023) * 0.05;
        const coreRadius = 30 * glowIntensity * flicker;
        const coreGrad = ctx.createRadialGradient(holdX, holdY, 0, holdX, holdY, coreRadius);
        coreGrad.addColorStop(0, rgba([255, 255, 230], 0.95 * glowIntensity));
        coreGrad.addColorStop(0.5, rgba([255, 220, 150], 0.7 * glowIntensity));
        coreGrad.addColorStop(1, rgba(warmColor, 0));

        ctx.beginPath();
        ctx.fillStyle = coreGrad;
        ctx.arc(holdX, holdY, coreRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawShape(shape, time) {
        const dist = Math.sqrt(Math.pow(shape.x - holdX, 2) + Math.pow(shape.y - holdY, 2));
        const revealDist = glowRadius * 0.85;

        // Calculate reveal based on distance from light
        let targetReveal = 0;
        if (dist < revealDist && glowRadius > 50) {
            targetReveal = clamp(1 - dist / revealDist, 0, 1) * glowIntensity;
        }
        shape.revealed = lerp(shape.revealed, targetReveal, 0.06);

        if (shape.revealed < 0.01) return;

        const alpha = shape.revealed * 0.8;
        const wobble = Math.sin(time * 0.002 + shape.seed) * 3;

        ctx.save();
        ctx.translate(shape.x + wobble, shape.y);

        if (shape.type === 'circle') {
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, shape.radius);
            grad.addColorStop(0, rgba(shape.color, alpha * 0.9));
            grad.addColorStop(0.7, rgba(shape.color, alpha * 0.5));
            grad.addColorStop(1, rgba(shape.color, 0));

            ctx.beginPath();
            ctx.fillStyle = grad;
            ctx.arc(0, 0, shape.radius, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Blob shape
            ctx.beginPath();
            const points = 8;
            for (let i = 0; i <= points; i++) {
                const angle = (Math.PI * 2 * i) / points;
                const wave = Math.sin(angle * 3 + shape.seed) * 0.2;
                const r = shape.radius * (0.8 + wave);
                const px = Math.cos(angle) * r;
                const py = Math.sin(angle) * r;
                if (i === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }
            ctx.closePath();

            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, shape.radius);
            grad.addColorStop(0, rgba(shape.color, alpha * 0.85));
            grad.addColorStop(1, rgba(shape.color, alpha * 0.2));
            ctx.fillStyle = grad;
            ctx.fill();
        }

        ctx.restore();
    }

    function frame(time) {
        const delta = Math.min(time - lastTime, 32);
        lastTime = time;

        // Update glow
        if (isHolding) {
            glowRadius = Math.min(glowRadius + delta * 0.25, maxGlowRadius);
            glowIntensity = Math.min(glowIntensity + delta * 0.002, 1);
        } else {
            glowRadius = Math.max(glowRadius - delta * 0.4, 0);
            glowIntensity = Math.max(glowIntensity - delta * 0.003, 0);
        }

        drawBackground();

        // Draw shapes first (behind glow)
        shapes.forEach((shape) => drawShape(shape, time));

        // Draw glow on top
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        drawGlow(time);
        ctx.restore();

        rafId = requestAnimationFrame(frame);
    }

    function onPointerDown(event) {
        const rect = canvas.getBoundingClientRect();
        holdX = event.clientX - rect.left;
        holdY = event.clientY - rect.top;
        isHolding = true;
    }

    function onPointerMove(event) {
        if (!isHolding) return;
        const rect = canvas.getBoundingClientRect();
        holdX = event.clientX - rect.left;
        holdY = event.clientY - rect.top;
    }

    function onPointerUp() {
        isHolding = false;
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
