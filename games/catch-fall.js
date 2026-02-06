const palette = [
    [255, 220, 150],
    [255, 200, 180],
    [200, 220, 255],
    [180, 255, 220],
    [255, 180, 220],
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

function rgba(rgb, alpha) {
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

export function mount(container) {
    const canvas = document.createElement('canvas');
    canvas.className = 'fall-canvas';
    container.innerHTML = '';
    container.appendChild(canvas);

    const intro = document.createElement('div');
    intro.className = 'fall-intro';
    intro.textContent = 'Tap to guide the light';
    container.appendChild(intro);

    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let dpr = Math.max(window.devicePixelRatio || 1, 1);
    let lastTime = performance.now();
    let rafId = null;

    const particles = [];
    const maxParticles = 18;
    const pushes = [];
    let score = 0;

    // Basket dimensions
    const basketHeight = 80;
    let basketLeft = 0;
    let basketRight = 0;

    function resize() {
        width = container.clientWidth;
        height = container.clientHeight;
        dpr = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Basket covers middle half of bottom edge
        basketLeft = width * 0.25;
        basketRight = width * 0.75;
    }

    function spawnParticle() {
        if (particles.length >= maxParticles) return;

        particles.push({
            x: randomBetween(30, width - 30),
            y: -20,
            vx: randomBetween(-0.3, 0.3),
            vy: randomBetween(0.4, 0.8),
            radius: randomBetween(10, 18),
            color: palette[Math.floor(Math.random() * palette.length)],
            seed: Math.random() * Math.PI * 2,
            caught: false,
            fadeOut: 0,
        });
    }

    function drawBasket() {
        const basketY = height - basketHeight;

        // Basket glow
        const glowGrad = ctx.createLinearGradient(basketLeft, basketY, basketRight, height);
        glowGrad.addColorStop(0, rgba([255, 240, 200], 0.1));
        glowGrad.addColorStop(1, rgba([255, 240, 200], 0.3));
        ctx.fillStyle = glowGrad;
        ctx.fillRect(basketLeft, basketY, basketRight - basketLeft, basketHeight);

        // Basket rim
        ctx.strokeStyle = rgba([255, 220, 150], 0.6);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(basketLeft, basketY);
        ctx.lineTo(basketLeft, height);
        ctx.moveTo(basketRight, basketY);
        ctx.lineTo(basketRight, height);
        ctx.moveTo(basketLeft, basketY);
        ctx.lineTo(basketRight, basketY);
        ctx.stroke();

        // Basket pattern (curved lines inside)
        ctx.strokeStyle = rgba([255, 220, 150], 0.2);
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const y = basketY + (basketHeight * (i + 1)) / 6;
            ctx.beginPath();
            ctx.moveTo(basketLeft + 10, y);
            ctx.quadraticCurveTo((basketLeft + basketRight) / 2, y + 8, basketRight - 10, y);
            ctx.stroke();
        }
    }

    function drawParticle(particle, time) {
        const pulse = 1 + Math.sin(time * 0.003 + particle.seed) * 0.1;
        const r = particle.radius * pulse;
        const alpha = particle.caught ? 1 - particle.fadeOut : 1;

        if (alpha <= 0) return;

        // Glow
        const glowGrad = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, r * 2.5);
        glowGrad.addColorStop(0, rgba(particle.color, 0.4 * alpha));
        glowGrad.addColorStop(1, rgba(particle.color, 0));
        ctx.beginPath();
        ctx.fillStyle = glowGrad;
        ctx.arc(particle.x, particle.y, r * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Core
        const coreGrad = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, r);
        coreGrad.addColorStop(0, rgba([255, 255, 255], 0.9 * alpha));
        coreGrad.addColorStop(0.5, rgba(particle.color, 0.8 * alpha));
        coreGrad.addColorStop(1, rgba(particle.color, 0.4 * alpha));
        ctx.beginPath();
        ctx.fillStyle = coreGrad;
        ctx.arc(particle.x, particle.y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawPush(push) {
        const progress = push.age / push.life;
        const radius = push.radius * (0.5 + progress * 0.5);
        const alpha = 1 - progress;

        ctx.beginPath();
        ctx.strokeStyle = rgba([255, 255, 255], 0.4 * alpha);
        ctx.lineWidth = 2;
        ctx.arc(push.x, push.y, radius, 0, Math.PI * 2);
        ctx.stroke();
    }

    function applyPushForce(particle, push) {
        const dx = particle.x - push.x;
        const dy = particle.y - push.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < push.radius && dist > 0) {
            const force = (1 - dist / push.radius) * 0.15;
            particle.vx += (dx / dist) * force;
            particle.vy += (dy / dist) * force;
        }
    }

    function frame(time) {
        const delta = Math.min(time - lastTime, 32);
        lastTime = time;

        // Spawn new particles
        if (Math.random() < 0.02 && particles.length < maxParticles) {
            spawnParticle();
        }

        // Update pushes
        for (let i = pushes.length - 1; i >= 0; i--) {
            pushes[i].age += delta;
            if (pushes[i].age >= pushes[i].life) {
                pushes.splice(i, 1);
            }
        }

        // Update particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];

            if (p.caught) {
                p.fadeOut += delta / 500;
                if (p.fadeOut >= 1) {
                    particles.splice(i, 1);
                }
                continue;
            }

            // Apply push forces
            pushes.forEach((push) => applyPushForce(p, push));

            // Gentle drift
            p.x += p.vx * delta * 0.06;
            p.y += p.vy * delta * 0.06;

            // Dampen velocity
            p.vx *= 0.995;
            p.vy *= 0.998;

            // Gravity
            p.vy += 0.0003 * delta;

            // Gentle sway
            p.x += Math.sin(time * 0.001 + p.seed) * 0.15;

            // Bounce off sides
            if (p.x < p.radius) {
                p.x = p.radius;
                p.vx *= -0.5;
            }
            if (p.x > width - p.radius) {
                p.x = width - p.radius;
                p.vx *= -0.5;
            }

            // Check basket catch
            if (p.y > height - basketHeight - p.radius) {
                if (p.x > basketLeft && p.x < basketRight) {
                    p.caught = true;
                    score++;
                } else if (p.y > height + 50) {
                    particles.splice(i, 1);
                }
            }
        }

        // Draw
        ctx.clearRect(0, 0, width, height);

        drawBasket();
        pushes.forEach(drawPush);
        particles.forEach((p) => drawParticle(p, time));

        rafId = requestAnimationFrame(frame);
    }

    function onPointerDown(event) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        pushes.push({
            x,
            y,
            radius: 120,
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
