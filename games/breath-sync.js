// 7 chakra colors from root to crown
const chakraColors = [
    [255, 0, 0],      // Root - Red
    [255, 127, 0],    // Sacral - Orange
    [255, 255, 0],    // Solar Plexus - Yellow
    [0, 255, 0],      // Heart - Green
    [0, 191, 255],    // Throat - Blue
    [75, 0, 130],     // Third Eye - Indigo
    [148, 0, 211],    // Crown - Violet
];

const phases = [
    { name: 'Breathe In', duration: 4000, action: 'expand' },
    { name: 'Hold', duration: 4000, action: 'hold' },
    { name: 'Breathe Out', duration: 4000, action: 'shrink' },
    { name: 'Hold', duration: 4000, action: 'hold' },
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

function easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function mount(container) {
    const canvas = document.createElement('canvas');
    canvas.className = 'breath-canvas';
    container.innerHTML = '';
    container.appendChild(canvas);

    // Start screen overlay
    const startOverlay = document.createElement('div');
    startOverlay.className = 'breath-start';
    startOverlay.innerHTML = `
        <div class="breath-start-content">
            <p class="breath-start-title">Box Breathing</p>
            <p class="breath-start-desc">4-4-4-4 rhythm</p>
            <button class="breath-start-btn">Tap to Begin</button>
        </div>
    `;
    container.appendChild(startOverlay);

    const label = document.createElement('div');
    label.className = 'breath-label';
    label.style.opacity = '0';
    container.appendChild(label);

    const counter = document.createElement('div');
    counter.className = 'breath-counter';
    counter.style.opacity = '0';
    container.appendChild(counter);

    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let dpr = Math.max(window.devicePixelRatio || 1, 1);
    let lastTime = performance.now();
    let rafId = null;

    let isStarted = false;
    let cycleTime = 0;
    let breathCount = 0; // Track number of complete breath cycles
    const cycleDuration = phases.reduce((sum, p) => sum + p.duration, 0);
    const minRadius = 50;
    const maxRadius = 160;
    let currentRadius = minRadius;
    let targetRadius = minRadius;

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

    function getPhaseInfo(time) {
        let elapsed = time % cycleDuration;
        let accumulated = 0;
        for (let i = 0; i < phases.length; i++) {
            const phase = phases[i];
            if (elapsed < accumulated + phase.duration) {
                const phaseElapsed = elapsed - accumulated;
                const phaseProgress = phaseElapsed / phase.duration;
                return {
                    phase,
                    index: i,
                    progress: phaseProgress,
                    secondsLeft: Math.ceil((phase.duration - phaseElapsed) / 1000),
                };
            }
            accumulated += phase.duration;
        }
        return { phase: phases[0], index: 0, progress: 0, secondsLeft: 4 };
    }

    function getChakraColor(breathNum) {
        // Cycle through chakra colors based on breath count
        const chakraIndex = breathNum % chakraColors.length;
        const nextChakraIndex = (breathNum + 1) % chakraColors.length;
        return {
            current: chakraColors[chakraIndex],
            next: chakraColors[nextChakraIndex],
        };
    }

    function drawCircle(radius, primaryColor, secondaryColor, mixProgress, time) {
        const cx = width / 2;
        const cy = height / 2;

        const color = mixColor(primaryColor, secondaryColor, mixProgress);

        // Outer aura rings
        for (let i = 3; i >= 1; i--) {
            const ringRadius = radius * (1 + i * 0.25);
            const ringAlpha = 0.08 * (4 - i);
            ctx.beginPath();
            ctx.strokeStyle = rgba(color, ringAlpha);
            ctx.lineWidth = 2;
            ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Outer glow - larger and more vibrant
        const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.6, cx, cy, radius * 2);
        glowGrad.addColorStop(0, rgba(color, 0.4));
        glowGrad.addColorStop(0.5, rgba(color, 0.15));
        glowGrad.addColorStop(1, rgba(color, 0));
        ctx.beginPath();
        ctx.fillStyle = glowGrad;
        ctx.arc(cx, cy, radius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Main circle with beautiful gradient
        const mainGrad = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, 0, cx, cy, radius);
        mainGrad.addColorStop(0, rgba([255, 255, 255], 0.9));
        mainGrad.addColorStop(0.3, rgba(mixColor(color, [255, 255, 255], 0.5), 0.85));
        mainGrad.addColorStop(0.7, rgba(color, 0.9));
        mainGrad.addColorStop(1, rgba(mixColor(color, [0, 0, 0], 0.2), 0.95));
        ctx.beginPath();
        ctx.fillStyle = mainGrad;
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        // Highlight arc
        ctx.beginPath();
        ctx.strokeStyle = rgba([255, 255, 255], 0.6);
        ctx.lineWidth = 3;
        ctx.arc(cx, cy, radius * 0.85, -Math.PI * 0.7, -Math.PI * 0.3);
        ctx.stroke();

        // Inner glow ring
        const innerGlow = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius * 0.7);
        innerGlow.addColorStop(0, rgba([255, 255, 255], 0.35));
        innerGlow.addColorStop(1, rgba([255, 255, 255], 0));
        ctx.beginPath();
        ctx.fillStyle = innerGlow;
        ctx.arc(cx, cy, radius * 0.7, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing outer ring
        const pulsePhase = Math.sin(time * 0.004) * 0.5 + 0.5;
        const pulseRadius = radius * (1.05 + pulsePhase * 0.05);
        ctx.beginPath();
        ctx.strokeStyle = rgba(color, 0.4 + pulsePhase * 0.2);
        ctx.lineWidth = 2;
        ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Floating particles around the circle
        const particleCount = 8;
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2 + time * 0.0008;
            const dist = radius * 1.3 + Math.sin(time * 0.002 + i) * 15;
            const px = cx + Math.cos(angle) * dist;
            const py = cy + Math.sin(angle) * dist;
            const particleSize = 3 + Math.sin(time * 0.003 + i * 0.5) * 2;

            ctx.beginPath();
            ctx.fillStyle = rgba(color, 0.5);
            ctx.arc(px, py, particleSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function frame(time) {
        const delta = Math.min(time - lastTime, 32);
        lastTime = time;

        if (!isStarted) {
            // Draw idle circle before starting
            ctx.clearRect(0, 0, width, height);
            const idleColor = chakraColors[0];
            const idlePulse = minRadius + Math.sin(time * 0.002) * 5;
            drawCircle(idlePulse, idleColor, idleColor, 0, time);
            rafId = requestAnimationFrame(frame);
            return;
        }

        const prevCycle = Math.floor(cycleTime / cycleDuration);
        cycleTime += delta;
        const currentCycle = Math.floor(cycleTime / cycleDuration);

        // Track breath count (increment when completing a full cycle)
        if (currentCycle > prevCycle) {
            breathCount++;
        }

        const { phase, index, progress, secondsLeft } = getPhaseInfo(cycleTime);

        // Calculate target radius based on phase
        if (phase.action === 'expand') {
            targetRadius = lerp(minRadius, maxRadius, easeInOutSine(progress));
        } else if (phase.action === 'shrink') {
            targetRadius = lerp(maxRadius, minRadius, easeInOutSine(progress));
        }

        // Smooth radius transition
        currentRadius = lerp(currentRadius, targetRadius, 0.1);

        // Update labels
        label.textContent = phase.name;
        counter.textContent = secondsLeft;

        // Get colors - transition between chakras during breathing
        const { current, next } = getChakraColor(breathCount);
        const cycleProgress = (cycleTime % cycleDuration) / cycleDuration;

        ctx.clearRect(0, 0, width, height);
        drawCircle(currentRadius, current, next, cycleProgress, time);

        rafId = requestAnimationFrame(frame);
    }

    function startBreathing() {
        if (isStarted) return;
        isStarted = true;
        cycleTime = 0;
        breathCount = 0;

        // Fade out start overlay
        startOverlay.style.transition = 'opacity 0.5s ease';
        startOverlay.style.opacity = '0';
        setTimeout(() => {
            startOverlay.style.display = 'none';
        }, 500);

        // Fade in labels
        label.style.transition = 'opacity 0.5s ease';
        counter.style.transition = 'opacity 0.5s ease';
        label.style.opacity = '1';
        counter.style.opacity = '1';
    }

    resize();
    rafId = requestAnimationFrame(frame);

    const startBtn = startOverlay.querySelector('.breath-start-btn');
    startBtn.addEventListener('click', startBreathing);
    startOverlay.addEventListener('click', startBreathing);
    window.addEventListener('resize', resize);

    return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', resize);
        startBtn.removeEventListener('click', startBreathing);
        startOverlay.removeEventListener('click', startBreathing);
        container.innerHTML = '';
    };
}
