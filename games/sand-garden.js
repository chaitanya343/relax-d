const sandColor = [220, 200, 170];
const trailColor = [180, 160, 130];

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function rgba(rgb, alpha) {
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

export function mount(container) {
    const canvas = document.createElement('canvas');
    canvas.className = 'sand-canvas';
    container.innerHTML = '';
    container.appendChild(canvas);

    const intro = document.createElement('div');
    intro.className = 'sand-intro';
    intro.textContent = 'Draw in the sand';
    container.appendChild(intro);

    const resetBtn = document.createElement('button');
    resetBtn.className = 'sand-reset';
    resetBtn.textContent = 'Rake';
    container.appendChild(resetBtn);

    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let dpr = Math.max(window.devicePixelRatio || 1, 1);
    let lastTime = performance.now();
    let rafId = null;

    const trails = [];
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let rakeProgress = 0;
    let isRaking = false;

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

    function drawBackground() {
        // Sand texture base
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, rgba([235, 220, 195], 1));
        grad.addColorStop(1, rgba([215, 195, 165], 1));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Subtle noise texture (horizontal lines for zen garden feel)
        ctx.strokeStyle = rgba([200, 180, 150], 0.15);
        ctx.lineWidth = 1;
        const spacing = 12;
        for (let y = spacing; y < height; y += spacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }

    function drawTrail(trail, time) {
        if (trail.points.length < 2) return;

        const fadeStart = trail.life - 8000;
        const alpha = trail.age > fadeStart ? clamp(1 - (trail.age - fadeStart) / 8000, 0, 1) : 1;

        if (alpha <= 0) return;

        // Main groove
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Shadow/depth
        ctx.strokeStyle = rgba([160, 140, 110], 0.4 * alpha);
        ctx.lineWidth = trail.width + 4;
        ctx.beginPath();
        trail.points.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x + 2, p.y + 2);
            else ctx.lineTo(p.x + 2, p.y + 2);
        });
        ctx.stroke();

        // Main groove
        ctx.strokeStyle = rgba(trailColor, 0.85 * alpha);
        ctx.lineWidth = trail.width;
        ctx.beginPath();
        trail.points.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        // Highlight edge
        ctx.strokeStyle = rgba([240, 230, 210], 0.5 * alpha);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        trail.points.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x - 1, p.y - 1);
            else ctx.lineTo(p.x - 1, p.y - 1);
        });
        ctx.stroke();

        ctx.restore();
    }

    function drawRakeOverlay() {
        if (rakeProgress <= 0) return;

        const eased = 1 - Math.pow(1 - rakeProgress, 3);
        ctx.fillStyle = rgba([235, 220, 195], eased);
        ctx.fillRect(0, 0, width, height);

        // Rake lines appearing
        if (rakeProgress > 0.3) {
            const lineAlpha = (rakeProgress - 0.3) / 0.7;
            ctx.strokeStyle = rgba([200, 180, 150], 0.2 * lineAlpha);
            ctx.lineWidth = 1;
            const spacing = 12;
            for (let y = spacing; y < height; y += spacing) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
        }
    }

    function startTrail(x, y) {
        trails.push({
            points: [{ x, y }],
            width: 14,
            age: 0,
            life: 45000,
        });
        lastX = x;
        lastY = y;
        isDrawing = true;
    }

    function addPoint(x, y) {
        if (!isDrawing || trails.length === 0) return;

        const trail = trails[trails.length - 1];
        const dx = x - lastX;
        const dy = y - lastY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Add intermediate points for smooth lines
        if (dist > 4) {
            const steps = Math.ceil(dist / 4);
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                trail.points.push({
                    x: lastX + dx * t,
                    y: lastY + dy * t,
                });
            }
            lastX = x;
            lastY = y;
        }
    }

    function endTrail() {
        isDrawing = false;
    }

    function startRake() {
        isRaking = true;
        rakeProgress = 0;
    }

    function frame(time) {
        const delta = Math.min(time - lastTime, 32);
        lastTime = time;

        // Update rake animation
        if (isRaking) {
            rakeProgress += delta / 800;
            if (rakeProgress >= 1) {
                trails.length = 0;
                isRaking = false;
                rakeProgress = 0;
            }
        }

        // Update trail ages
        for (let i = trails.length - 1; i >= 0; i--) {
            trails[i].age += delta;
            if (trails[i].age >= trails[i].life) {
                trails.splice(i, 1);
            }
        }

        drawBackground();
        trails.forEach((trail) => drawTrail(trail, time));
        drawRakeOverlay();

        rafId = requestAnimationFrame(frame);
    }

    function onPointerDown(event) {
        if (isRaking) return;
        const rect = canvas.getBoundingClientRect();
        startTrail(event.clientX - rect.left, event.clientY - rect.top);
    }

    function onPointerMove(event) {
        if (isRaking) return;
        const rect = canvas.getBoundingClientRect();
        addPoint(event.clientX - rect.left, event.clientY - rect.top);
    }

    function onPointerUp() {
        endTrail();
    }

    function onRakeClick() {
        if (!isRaking) {
            startRake();
        }
    }

    resize();
    rafId = requestAnimationFrame(frame);

    window.addEventListener('resize', resize);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    resetBtn.addEventListener('click', onRakeClick);

    return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', resize);
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
        resetBtn.removeEventListener('click', onRakeClick);
        container.innerHTML = '';
    };
}
