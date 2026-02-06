// Different flower types
const flowerTypes = [
    {
        name: 'daisy',
        petals: 8,
        petalShape: 'round',
        petalRatio: 0.5,
        centerRatio: 0.25,
    },
    {
        name: 'tulip',
        petals: 6,
        petalShape: 'pointed',
        petalRatio: 0.6,
        centerRatio: 0.15,
    },
    {
        name: 'sunflower',
        petals: 12,
        petalShape: 'long',
        petalRatio: 0.35,
        centerRatio: 0.35,
    },
    {
        name: 'rose',
        petals: 10,
        petalShape: 'spiral',
        petalRatio: 0.45,
        centerRatio: 0.2,
    },
    {
        name: 'lotus',
        petals: 7,
        petalShape: 'layered',
        petalRatio: 0.55,
        centerRatio: 0.18,
    },
];

const palette = [
    { stem: [120, 180, 140], bloom: [255, 180, 200] }, // Pink
    { stem: [100, 160, 130], bloom: [255, 220, 140] }, // Yellow
    { stem: [130, 170, 120], bloom: [200, 160, 255] }, // Purple
    { stem: [110, 175, 150], bloom: [255, 160, 140] }, // Coral
    { stem: [140, 160, 110], bloom: [180, 220, 255] }, // Light Blue
    { stem: [120, 170, 130], bloom: [255, 200, 200] }, // Soft Pink
    { stem: [100, 180, 160], bloom: [255, 255, 180] }, // Cream
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

function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeOutElastic(t) {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
}

export function mount(container) {
    const canvas = document.createElement('canvas');
    canvas.className = 'grow-canvas';
    container.innerHTML = '';
    container.appendChild(canvas);

    const intro = document.createElement('div');
    intro.className = 'grow-intro';
    intro.textContent = 'Tap to plant';
    container.appendChild(intro);

    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let dpr = Math.max(window.devicePixelRatio || 1, 1);
    const plants = [];
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

    function randomPalette() {
        return palette[Math.floor(Math.random() * palette.length)];
    }

    function randomFlowerType() {
        return flowerTypes[Math.floor(Math.random() * flowerTypes.length)];
    }

    function spawnPlant(x, y) {
        const colors = randomPalette();
        const flowerType = randomFlowerType();
        plants.push({
            x,
            y,
            age: 0,
            growDuration: randomBetween(2000, 3000),
            bloomDelay: randomBetween(700, 1200),
            bloomDuration: randomBetween(1600, 2400),
            life: randomBetween(18000, 28000),
            stemHeight: randomBetween(70, 130),
            stemWidth: randomBetween(3, 5),
            bloomRadius: randomBetween(26, 45),
            flowerType,
            seed: Math.random() * Math.PI * 2,
            stemColor: colors.stem,
            bloomColor: colors.bloom,
        });
    }

    function drawPetal(ctx, type, length, width, progress, alpha) {
        ctx.beginPath();
        switch (type.petalShape) {
            case 'round':
                ctx.ellipse(0, -length * 0.5, width * 0.5, length * 0.5, 0, 0, Math.PI * 2);
                break;
            case 'pointed':
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(width * 0.6, -length * 0.4, 0, -length);
                ctx.quadraticCurveTo(-width * 0.6, -length * 0.4, 0, 0);
                break;
            case 'long':
                ctx.ellipse(0, -length * 0.55, width * 0.35, length * 0.55, 0, 0, Math.PI * 2);
                break;
            case 'spiral':
                const spiralWidth = width * (0.4 + progress * 0.2);
                ctx.ellipse(0, -length * 0.45, spiralWidth, length * 0.45, 0, 0, Math.PI * 2);
                break;
            case 'layered':
            default:
                ctx.ellipse(0, -length * 0.5, width * 0.45, length * 0.5, 0, 0, Math.PI * 2);
                break;
        }
    }

    function drawPlant(plant, time) {
        const { x, y, age, growDuration, bloomDelay, bloomDuration, life } = plant;
        const { stemHeight, stemWidth, bloomRadius, flowerType, seed } = plant;
        const { stemColor, bloomColor } = plant;

        const fadeStart = life - 3000;
        const alpha = age > fadeStart ? clamp(1 - (age - fadeStart) / 3000, 0, 1) : 1;

        const stemProgress = clamp(age / growDuration, 0, 1);
        const stemEased = easeOutBack(stemProgress);
        const currentStemHeight = stemHeight * stemEased;

        if (currentStemHeight > 0) {
            ctx.save();
            ctx.strokeStyle = rgba(stemColor, 0.85 * alpha);
            ctx.lineWidth = stemWidth;
            ctx.lineCap = 'round';
            ctx.beginPath();

            const sway = Math.sin(time * 0.001 + seed) * 8;
            const cp1x = x + sway * 0.3;
            const cp1y = y - currentStemHeight * 0.4;
            const cp2x = x + sway * 0.7;
            const cp2y = y - currentStemHeight * 0.7;
            const endX = x + sway;
            const endY = y - currentStemHeight;

            ctx.moveTo(x, y);
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
            ctx.stroke();
            ctx.restore();

            // Small leaves on stem
            if (stemProgress > 0.5) {
                const leafProgress = clamp((stemProgress - 0.5) / 0.3, 0, 1);
                const leafSize = 12 * leafProgress;
                const leafY = y - currentStemHeight * 0.4;
                const leafSway = sway * 0.4;

                ctx.save();
                ctx.fillStyle = rgba(stemColor, 0.7 * alpha);

                // Left leaf
                ctx.beginPath();
                ctx.ellipse(x + leafSway - 8, leafY, leafSize * 0.4, leafSize, -0.5, 0, Math.PI * 2);
                ctx.fill();

                // Right leaf
                ctx.beginPath();
                ctx.ellipse(x + leafSway + 8, leafY + 10, leafSize * 0.4, leafSize, 0.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Bloom
            const bloomStart = bloomDelay;
            const bloomAge = age - bloomStart;
            if (bloomAge > 0) {
                const bloomProgress = clamp(bloomAge / bloomDuration, 0, 1);
                const bloomEased = easeOutElastic(bloomProgress);
                const currentBloomRadius = bloomRadius * bloomEased;

                ctx.save();
                ctx.translate(endX, endY);

                // Draw multiple layers for layered/spiral types
                const layers = flowerType.petalShape === 'layered' ? 2 :
                    flowerType.petalShape === 'spiral' ? 3 : 1;

                for (let layer = layers - 1; layer >= 0; layer--) {
                    const layerScale = 1 - layer * 0.22;
                    const layerRotation = layer * 0.15;
                    const layerAlpha = 1 - layer * 0.15;

                    for (let i = 0; i < flowerType.petals; i++) {
                        const angle = (Math.PI * 2 * i) / flowerType.petals + seed + layerRotation;
                        const petalLength = currentBloomRadius * (0.75 + Math.sin(seed + i) * 0.15) * layerScale;
                        const petalWidth = currentBloomRadius * flowerType.petalRatio * layerScale;

                        ctx.save();
                        ctx.rotate(angle);

                        const grad = ctx.createRadialGradient(0, -petalLength * 0.4, 0, 0, -petalLength * 0.4, petalLength);
                        const lightBloom = mixColor(bloomColor, [255, 255, 255], 0.3 + layer * 0.1);
                        grad.addColorStop(0, rgba(lightBloom, 0.95 * alpha * layerAlpha));
                        grad.addColorStop(1, rgba(bloomColor, 0.4 * alpha * layerAlpha));
                        ctx.fillStyle = grad;

                        drawPetal(ctx, flowerType, petalLength, petalWidth, bloomProgress, alpha);
                        ctx.fill();

                        ctx.restore();
                    }
                }

                // Center
                const centerRadius = currentBloomRadius * flowerType.centerRatio;
                const centerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, centerRadius);
                const centerColor = flowerType.name === 'sunflower' ? [139, 90, 43] : mixColor(bloomColor, [255, 255, 200], 0.7);
                centerGrad.addColorStop(0, rgba(mixColor(centerColor, [255, 255, 255], 0.3), 0.95 * alpha));
                centerGrad.addColorStop(1, rgba(centerColor, 0.9 * alpha));
                ctx.beginPath();
                ctx.fillStyle = centerGrad;
                ctx.arc(0, 0, centerRadius, 0, Math.PI * 2);
                ctx.fill();

                // Center dots for sunflower
                if (flowerType.name === 'sunflower' && bloomProgress > 0.5) {
                    const dotCount = 8;
                    for (let d = 0; d < dotCount; d++) {
                        const dotAngle = (d / dotCount) * Math.PI * 2 + seed;
                        const dotDist = centerRadius * 0.5;
                        ctx.beginPath();
                        ctx.fillStyle = rgba([80, 50, 20], 0.6 * alpha);
                        ctx.arc(
                            Math.cos(dotAngle) * dotDist,
                            Math.sin(dotAngle) * dotDist,
                            2, 0, Math.PI * 2
                        );
                        ctx.fill();
                    }
                }

                ctx.restore();
            }
        }

        // Seed dot at base
        if (stemProgress < 0.3) {
            const seedAlpha = 1 - stemProgress / 0.3;
            ctx.beginPath();
            ctx.fillStyle = rgba([140, 120, 100], 0.7 * seedAlpha * alpha);
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function frame(time) {
        const delta = Math.min(time - lastTime, 32);
        lastTime = time;

        ctx.clearRect(0, 0, width, height);

        for (let i = plants.length - 1; i >= 0; i--) {
            const plant = plants[i];
            plant.age += delta;
            if (plant.age >= plant.life) {
                plants.splice(i, 1);
                continue;
            }
            drawPlant(plant, time);
        }

        rafId = requestAnimationFrame(frame);
    }

    function onPointerDown(event) {
        const rect = canvas.getBoundingClientRect();
        spawnPlant(event.clientX - rect.left, event.clientY - rect.top);
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
