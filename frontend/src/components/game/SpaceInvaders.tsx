import { useEffect, useRef } from 'react';

interface Alien { x: number; y: number; alive: boolean; type: 0 | 1 | 2; frame: number; }
interface Bullet { x: number; y: number; vy: number; active: boolean; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; }
interface Star { x: number; y: number; r: number; speed: number; opacity: number; pulse: number; }

const COLS = 11; const ROWS = 5;
const ALIEN_W = 36; const ALIEN_H = 28;
const ALIEN_GAP_X = 18; const ALIEN_GAP_Y = 20;
const ALIEN_SPEED_BASE = 1.1; const BULLET_SPEED = 9;
const GREEN = '#00ff88'; const CYAN = '#00d4ff'; const GOLD = '#ffc845';

function drawAlien(ctx: CanvasRenderingContext2D, x: number, y: number, type: 0 | 1 | 2, frame: number, alpha: number): void {
    ctx.save(); ctx.globalAlpha = alpha;
    const color = type === 0 ? GREEN : type === 1 ? CYAN : GOLD;
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 14;
    const px = 3;
    const patterns: number[][][] = [
        [[0, 0, 1, 0, 0, 0, 0, 1, 0], [0, 0, 0, 1, 0, 0, 1, 0, 0], [0, 0, 1, 1, 1, 1, 1, 0, 0], [0, 1, 1, 0, 1, 0, 1, 1, 0], [1, 1, 1, 1, 1, 1, 1, 1, 1], frame === 0 ? [1, 0, 1, 0, 0, 0, 1, 0, 1] : [0, 1, 0, 1, 0, 1, 0, 1, 0], frame === 0 ? [0, 0, 1, 0, 0, 0, 1, 0, 0] : [0, 1, 0, 0, 0, 0, 0, 1, 0]],
        [[0, 0, 0, 1, 1, 1, 0, 0, 0], [0, 1, 1, 1, 1, 1, 1, 1, 0], [1, 1, 0, 1, 1, 1, 0, 1, 1], [1, 1, 1, 1, 1, 1, 1, 1, 1], [0, 0, 1, 0, 0, 0, 1, 0, 0], frame === 0 ? [0, 1, 0, 1, 0, 1, 0, 1, 0] : [1, 0, 1, 0, 0, 0, 1, 0, 1], frame === 0 ? [1, 0, 0, 1, 0, 1, 0, 0, 1] : [0, 1, 0, 0, 0, 0, 0, 1, 0]],
        [[1, 0, 0, 0, 0, 0, 0, 0, 1], [0, 1, 0, 0, 0, 0, 0, 1, 0], [1, 0, 1, 1, 1, 1, 1, 0, 1], [1, 1, 1, 0, 1, 0, 1, 1, 1], [1, 1, 1, 1, 1, 1, 1, 1, 1], frame === 0 ? [0, 1, 0, 0, 0, 0, 0, 1, 0] : [1, 0, 0, 0, 0, 0, 0, 0, 1], frame === 0 ? [0, 0, 1, 0, 0, 0, 1, 0, 0] : [0, 1, 0, 1, 0, 1, 0, 1, 0]],
    ];
    const pat = patterns[type];
    const offX = x - (9 * px) / 2; const offY = y - (7 * px) / 2;
    for (let r = 0; r < pat.length; r++) for (let c = 0; c < pat[r].length; c++) if (pat[r][c]) ctx.fillRect(offX + c * px, offY + r * px, px, px);
    ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save(); ctx.fillStyle = GREEN; ctx.shadowColor = GREEN; ctx.shadowBlur = 20;
    ctx.fillRect(x - 20, y, 40, 6); ctx.fillRect(x - 6, y - 8, 12, 8);
    ctx.fillRect(x - 20, y + 2, 10, 4); ctx.fillRect(x + 10, y + 2, 10, 4);
    ctx.restore();
}

export function SpaceInvaders(): JSX.Element {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const cvs = canvas;
        const c = ctx;

        // ── TODAS las variables declaradas ANTES de resize ──────
        let W = cvs.offsetWidth;
        let H = cvs.offsetHeight;
        let aliens: Alien[] = [];
        let bullets: Bullet[] = [];
        let particles: Particle[] = [];
        let stars: Star[] = [];   // ← declarada ANTES de que resize la use
        let playerX = W / 2;
        let direction = 1;
        let alienFrame = 0;
        let frameCount = 0;
        let offsetX = 0;
        let offsetY = 55;
        let speed = ALIEN_SPEED_BASE;
        let shootTimer = 0;
        let animId = 0;
        let scanLine = 0;

        // Ahora sí podemos definir las funciones que usan esas variables
        function initStars(): void {
            stars = Array.from({ length: 80 }, () => ({
                x: Math.random() * W, y: Math.random() * H,
                r: Math.random() * 1.2 + 0.3, speed: Math.random() * 0.3 + 0.05,
                opacity: Math.random() * 0.5 + 0.1, pulse: Math.random() * Math.PI * 2,
            }));
        }

        const resize = (): void => {
            W = cvs.offsetWidth; H = cvs.offsetHeight;
            cvs.width = W; cvs.height = H;
            initStars();
        };
        resize();
        window.addEventListener('resize', resize);

        function initAliens(): void {
            aliens = [];
            for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++)
                aliens.push({ x: col * (ALIEN_W + ALIEN_GAP_X), y: row * (ALIEN_H + ALIEN_GAP_Y), alive: true, type: row === 0 ? 2 : row < 3 ? 1 : 0, frame: 0 });
            offsetX = (W - (COLS * (ALIEN_W + ALIEN_GAP_X) - ALIEN_GAP_X)) / 2;
            offsetY = 55; speed = ALIEN_SPEED_BASE; direction = 1;
        }
        initAliens();

        function spawnParticles(x: number, y: number, color: string): void {
            for (let i = 0; i < 14; i++) {
                const angle = (i / 14) * Math.PI * 2; const vel = 2 + Math.random() * 4;
                particles.push({ x, y, vx: Math.cos(angle) * vel, vy: Math.sin(angle) * vel, life: 1, maxLife: 0.7 + Math.random() * 0.3, color, size: 2 + Math.random() * 3 });
            }
        }

        function update(): void {
            frameCount++;
            stars.forEach(s => { s.y += s.speed; s.pulse += 0.04; if (s.y > H) { s.y = 0; s.x = Math.random() * W; } });
            scanLine = (scanLine + 1.5) % H;
            if (frameCount % 18 === 0) alienFrame = alienFrame === 0 ? 1 : 0;
            offsetX += speed * direction;
            const alive = aliens.filter(a => a.alive);
            if (alive.length === 0) { initAliens(); return; }
            const leftmost = Math.min(...alive.map(a => offsetX + a.x));
            const rightmost = Math.max(...alive.map(a => offsetX + a.x + ALIEN_W));
            if (rightmost > W - 10 || leftmost < 10) { direction *= -1; offsetY += 16; speed += 0.08; }
            const bottommost = Math.max(...alive.map(a => offsetY + a.y + ALIEN_H));
            if (bottommost > H - 55) { initAliens(); return; }
            const centerAlien = alive.reduce((prev, curr) => Math.abs(offsetX + curr.x + ALIEN_W / 2 - W / 2) < Math.abs(offsetX + prev.x + ALIEN_W / 2 - W / 2) ? curr : prev);
            playerX += (offsetX + centerAlien.x + ALIEN_W / 2 - playerX) * 0.04;
            playerX = Math.max(22, Math.min(W - 22, playerX));
            shootTimer--;
            if (shootTimer <= 0) { bullets.push({ x: playerX, y: H - 52, vy: -BULLET_SPEED, active: true }); shootTimer = 28 + Math.floor(Math.random() * 28); }
            bullets.forEach(b => { if (b.active) b.y += b.vy; });
            bullets = bullets.filter(b => b.active && b.y > -10);
            bullets.forEach(bullet => {
                if (!bullet.active) return;
                aliens.forEach(alien => {
                    if (!alien.alive) return;
                    const ax = offsetX + alien.x + ALIEN_W / 2; const ay = offsetY + alien.y + ALIEN_H / 2;
                    if (Math.abs(bullet.x - ax) < ALIEN_W / 2 + 3 && Math.abs(bullet.y - ay) < ALIEN_H / 2 + 3) {
                        alien.alive = false; bullet.active = false;
                        spawnParticles(ax, ay, alien.type === 0 ? GREEN : alien.type === 1 ? CYAN : GOLD);
                    }
                });
            });
            particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.025; p.vx *= 0.96; p.vy *= 0.96; });
            particles = particles.filter(p => p.life > 0);
        }

        function draw(): void {
            c.fillStyle = '#05050a'; c.fillRect(0, 0, W, H);
            stars.forEach(s => {
                const op = s.opacity * (0.6 + 0.4 * Math.sin(s.pulse));
                c.beginPath(); c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                c.fillStyle = `rgba(180,220,255,${op})`; c.shadowColor = 'rgba(100,200,255,0.8)'; c.shadowBlur = 4; c.fill();
            });
            c.save(); c.strokeStyle = 'rgba(0,212,255,0.04)'; c.lineWidth = 1;
            for (let x = 0; x < W; x += 50) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
            for (let y = 0; y < H; y += 50) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
            c.restore();
            const sg = c.createLinearGradient(0, scanLine - 60, 0, scanLine + 20);
            sg.addColorStop(0, 'rgba(0,212,255,0)'); sg.addColorStop(0.7, 'rgba(0,212,255,0.04)'); sg.addColorStop(1, 'rgba(0,212,255,0)');
            c.fillStyle = sg; c.fillRect(0, scanLine - 60, W, 80);
            const hg = c.createLinearGradient(0, H * 0.6, 0, H);
            hg.addColorStop(0, 'rgba(0,255,136,0)'); hg.addColorStop(1, 'rgba(0,255,136,0.04)');
            c.fillStyle = hg; c.fillRect(0, H * 0.6, W, H * 0.4);
            aliens.forEach(alien => {
                if (!alien.alive) return;
                drawAlien(c, offsetX + alien.x + ALIEN_W / 2, offsetY + alien.y + ALIEN_H / 2, alien.type, alienFrame, 0.65);
            });
            bullets.forEach(b => {
                if (!b.active) return;
                c.save();
                const bg = c.createLinearGradient(b.x, b.y, b.x, b.y + 16);
                bg.addColorStop(0, GREEN); bg.addColorStop(1, 'rgba(0,255,136,0)');
                c.fillStyle = bg; c.shadowColor = GREEN; c.shadowBlur = 10;
                c.fillRect(b.x - 1.5, b.y - 16, 3, 16); c.restore();
            });
            particles.forEach(p => {
                c.save(); c.globalAlpha = Math.max(0, p.life / p.maxLife * 0.9);
                c.fillStyle = p.color; c.shadowColor = p.color; c.shadowBlur = 6;
                c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); c.restore();
            });
            drawPlayer(c, playerX, H - 50);
            c.save(); c.strokeStyle = 'rgba(0,255,136,0.20)'; c.lineWidth = 1;
            c.shadowColor = GREEN; c.shadowBlur = 6;
            c.beginPath(); c.moveTo(0, H - 34); c.lineTo(W, H - 34); c.stroke(); c.restore();
        }

        function loop(): void { update(); draw(); animId = requestAnimationFrame(loop); }
        animId = requestAnimationFrame(loop);

        return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', opacity: 0.75 }}
        />
    );
}
