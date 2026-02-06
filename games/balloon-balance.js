const balloonColors = [
    { body: [255, 180, 200], highlight: [255, 220, 230] },
    { body: [180, 200, 255], highlight: [220, 230, 255] },
    { body: [200, 255, 220], highlight: [230, 255, 240] },
    { body: [255, 220, 180], highlight: [255, 240, 210] },
    { body: [220, 180, 255], highlight: [240, 210, 255] },
];

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
    canvas.className = 'balloon-canvas';
    container.innerHTML = '';
    container.appendChild(canvas);

    const intro = document.createElement('div');
    intro.className = 'balloon-intro';
    intro.textContent = 'Tap to lift';
    container.appendChild(intro);

    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let dpr = Math.max(window.devicePixelRatio || 1, 1);
    let lastTime = performance.now();
    let rafId = null;

    const puffs = [];
    const colorScheme = balloonColors[Math.floor(Math.random() * balloonColors.length)];

    // Balloon state
    const balloon = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        width: 70,
        height: 90,
        rotation: 0,
        rotationVel: 0,
    };

    // String segments for trailing effect
    const stringSegments = 8;
    const stringPoints = [];

    function resize() {
        width = container.clientWidth;
        height = container.clientHeight;
        dpr = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Initialize balloon position
        balloon.x = width / 2;
        balloon.y = height / 2;

        // Initialize string
        stringPoints.length = 0;
        for (let i = 0; i <= stringSegments; i++) {
            stringPoints.push({
                x: balloon.x,
                y: balloon.y + balloon.height / 2 + i * 15,
            });
        }
    }

    function drawBalloon(time) {
        ctx.save();
        ctx.translate(balloon.x, balloon.y);
        ctx.rotate(balloon.rotation);

        const wobble = Math.sin(time * 0.002) * 0.03;
        const scaleX = 1 + wobble;
        const scaleY = 1 - wobble * 0.5;
        ctx.scale(scaleX, scaleY);

        // Balloon body gradient
        const grad = ctx.createRadialGradient(
            -balloon.width * 0.2, -balloon.height * 0.2, 0,
            0, 0, balloon.height * 0.6
        );
        grad.addColorStop(0, rgba(colorScheme.highlight, 0.95));
        grad.addColorStop(0.5, rgba(colorScheme.body, 0.9));
        grad.addColorStop(1, rgba(colorScheme.body, 0.7));

        // Main balloon shape (ellipse)
        ctx.beginPath();
        ctx.ellipse(0, 0, balloon.width / 2, balloon.height / 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Highlight
        ctx.beginPath();
        ctx.ellipse(-balloon.width * 0.15, -balloon.height * 0.2, balloon.width * 0.15, balloon.height * 0.12, -0.3, 0, Math.PI * 2);
        ctx.fillStyle = rgba([255, 255, 255], 0.4);
        ctx.fill();

        // Knot at bottom
        ctx.beginPath();
        ctx.moveTo(-6, balloon.height / 2 - 5);
        ctx.lineTo(0, balloon.height / 2 + 8);
        ctx.lineTo(6, balloon.height / 2 - 5);
        ctx.closePath();
        ctx.fillStyle = rgba(colorScheme.body, 0.8);
        ctx.fill();

        ctx.restore();
    }

    function updateString() {
        // First point follows balloon
        stringPoints[0].x = balloon.x;
        stringPoints[0].y = balloon.y + balloon.height / 2 + 8;

        // Each subsequent point follows the one before it
        for (let i = 1; i < stringPoints.length; i++) {
            const prev = stringPoints[i - 1];
            const curr = stringPoints[i];

            // Gravity and lag
            const targetX = prev.x;
            const targetY = prev.y + 15;

            curr.x = lerp(curr.x, targetX, 0.08);
            curr.y = lerp(curr.y, targetY, 0.1);

            // Add some sway
            curr.x += Math.sin(performance.now() * 0.002 + i * 0.5) * 0.3;
        }
    }

    function drawString() {
        if (stringPoints.length < 2) return;

        ctx.beginPath();
        ctx.strokeStyle = rgba([180, 160, 140], 0.7);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        ctx.moveTo(stringPoints[0].x, stringPoints[0].y);
        for (let i = 1; i < stringPoints.length; i++) {
            ctx.lineTo(stringPoints[i].x, stringPoints[i].y);
        }
        ctx.stroke();

        // Small curl at end
        const last = stringPoints[stringPoints.length - 1];
        ctx.beginPath();
        ctx.arc(last.x, last.y + 5, 6, 0, Math.PI * 1.5);
        ctx.stroke();
    }

    function drawPuff(puff) {
        const progress = puff.age / puff.life;
        const alpha = 1 - progress;
        const radius = puff.radius * (0.5 + progress * 0.5);

        ctx.beginPath();
        ctx.fillStyle = rgba([255, 255, 255], 0.15 * alpha);
        ctx.arc(puff.x, puff.y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    function frame(time) {
        const delta = Math.min(time - lastTime, 32);
        lastTime = time;

        // Gravity (gentle)
        balloon.vy += 0.012 * delta * 0.06;

        // Air resistance
        balloon.vx *= 0.99;
        balloon.vy *= 0.99;
        balloon.rotationVel *= 0.96;

        // Gentle side-to-side drift
        balloon.vx += Math.sin(time * 0.0005) * 0.002;

        // Update position
        balloon.x += balloon.vx * delta * 0.06;
        balloon.y += balloon.vy * delta * 0.06;
        balloon.rotation += balloon.rotationVel * delta * 0.001;

        // Bounce off edges
        if (balloon.x < balloon.width / 2) {
            balloon.x = balloon.width / 2;
            balloon.vx *= -0.5;
        }
        if (balloon.x > width - balloon.width / 2) {
            balloon.x = width - balloon.width / 2;
            balloon.vx *= -0.5;
        }
        if (balloon.y < balloon.height / 2) {
            balloon.y = balloon.height / 2;
            balloon.vy *= -0.3;
        }
        if (balloon.y > height - balloon.height / 2 - 100) {
            balloon.y = height - balloon.height / 2 - 100;
            balloon.vy *= -0.5;
        }

        // Update puffs
        for (let i = puffs.length - 1; i >= 0; i--) {
            puffs[i].age += delta;
            puffs[i].y -= 0.5;
            if (puffs[i].age >= puffs[i].life) {
                puffs.splice(i, 1);
            }
        }

        updateString();

        // Draw
        ctx.clearRect(0, 0, width, height);

        puffs.forEach(drawPuff);
        drawString();
        drawBalloon(time);

        rafId = requestAnimationFrame(frame);
    }

    function onPointerDown(event) {
        const rect = canvas.getBoundingClientRect();
        const tapX = event.clientX - rect.left;
        const tapY = event.clientY - rect.top;

        // Distance from tap to balloon
        const dx = balloon.x - tapX;
        const dy = balloon.y - tapY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Upward force, stronger if tap is closer/below balloon
        const force = 3.5;
        balloon.vy -= force;

        // Slight horizontal push away from tap
        if (dist > 10) {
            balloon.vx += (dx / dist) * 0.8;
        }

        // Rotation based on tap position relative to balloon
        balloon.rotationVel += (tapX - balloon.x) * 0.0015;

        // Spawn puff effect
        puffs.push({
            x: tapX,
            y: tapY,
            radius: 40,
            age: 0,
            life: 400,
        });
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
