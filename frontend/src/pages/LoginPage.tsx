import { useState, FormEvent, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import type { LoginResponse } from '../types/auth';
import { AxiosError } from 'axios';

type LoginState = 'idle' | 'loading' | 'error';

// ═══════════════════════════════════════════════════════════════════════
// SPACE SHOOTER — fondo animado moderno (paleta azul/cyan de la app)
// Auto-play: la nave apunta al enemigo más cercano y dispara sola.
// ═══════════════════════════════════════════════════════════════════════
function SpaceGame(): JSX.Element {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const _c = canvasRef.current;
        if (!_c) return;
        const _g = _c.getContext('2d');
        if (!_g) return;
        // Rebind con tipos explícitamente non-null para que TypeScript
        // no pierda el narrowing dentro de las funciones anidadas (closures)
        const canvas: HTMLCanvasElement         = _c;
        const ctx:    CanvasRenderingContext2D  = _g;

        // ── Resize ────────────────────────────────────────────────
        function resize(): void {
            canvas!.width  = window.innerWidth;
            canvas!.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        // ── Interfaces ────────────────────────────────────────────
        interface Star     { x: number; y: number; s: number; a: number; da: number; }
        interface Enemy    { x: number; y: number; alive: boolean; type: 0|1|2; angle: number; bob: number; }
        interface Bullet   { x: number; y: number; active: boolean; }
        interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; r: number; col: string; }
        interface Ring     { x: number; y: number; r: number; life: number; col: string; }

        // ── Stars ─────────────────────────────────────────────────
        const stars: Star[] = Array.from({ length: 130 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            s: Math.random() * 1.6 + 0.3,
            a: Math.random() * 0.8 + 0.1,
            da: (Math.random() - 0.5) * 0.007,
        }));

        // ── Enemies ───────────────────────────────────────────────
        const COLS = 7, ROWS = 3;
        const EW = 78, EH = 52;

        function makeWave(): Enemy[] {
            const out: Enemy[] = [];
            const sx = (canvas.width - (COLS - 1) * EW) / 2;
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    out.push({
                        x: sx + c * EW,
                        y: 100 + r * EH,
                        alive: true,
                        type: r as 0|1|2,
                        angle: Math.random() * Math.PI * 2,
                        bob: Math.random() * Math.PI * 2,
                    });
                }
            }
            return out;
        }

        let enemies   = makeWave();
        let enemyDx   = 0.48;
        let waveDelay = 0;

        // ── Bullets, particles, rings ─────────────────────────────
        const bullets:   Bullet[]   = [];
        const particles: Particle[] = [];
        const thrusters: Particle[] = [];
        const rings:     Ring[]     = [];

        // ── Ship state — oscila con seno, NO persigue enemigos ───
        let shipX    = canvas.width / 2;
        let lastFire = performance.now(); // inicializar con now para evitar disparo inmediato
        const FIRE_MS = 620;

        let lastTime   = performance.now();
        let frameCount = 0;
        let animId: number;

        // ── Draw: background ──────────────────────────────────────
        function drawBg(): void {
            // Fondo plano oscuro
            ctx.fillStyle = '#050810';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Halo radial arriba-centro (sin cuadrícula)
            const halo = ctx.createRadialGradient(canvas.width / 2, -40, 0, canvas.width / 2, -40, canvas.height * 0.75);
            halo.addColorStop(0, 'rgba(59,130,246,0.12)');
            halo.addColorStop(1, 'transparent');
            ctx.fillStyle = halo;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Halo secundario abajo-derecha
            const halo2 = ctx.createRadialGradient(canvas.width * 0.9, canvas.height, 0, canvas.width * 0.9, canvas.height, canvas.height * 0.5);
            halo2.addColorStop(0, 'rgba(56,189,248,0.06)');
            halo2.addColorStop(1, 'transparent');
            ctx.fillStyle = halo2;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Estrellas blancas
            for (const s of stars) {
                s.a += s.da;
                if (s.a < 0.08) s.da =  Math.abs(s.da);
                if (s.a > 0.90) s.da = -Math.abs(s.da);
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${(s.a * 0.55).toFixed(2)})`;
                ctx.fill();
            }
        }

        // ── Draw: ship (brillo reducido para no competir con el UI) ──
        function drawShip(x: number, y: number): void {
            ctx.save();
            ctx.translate(x, y);
            ctx.globalAlpha = 0.72;

            // Engine glow — más tenue
            const eg = ctx.createRadialGradient(0, 22, 0, 0, 22, 22);
            eg.addColorStop(0, 'rgba(56,189,248,0.28)');
            eg.addColorStop(1, 'transparent');
            ctx.fillStyle = eg;
            ctx.beginPath();
            ctx.ellipse(0, 22, 16, 12, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur  = 5;
            ctx.shadowColor = 'rgba(59,130,246,0.6)';

            // Left wing
            ctx.beginPath();
            ctx.moveTo(-7, 5); ctx.lineTo(-26, 20);
            ctx.lineTo(-19, 26); ctx.lineTo(-8, 17);
            ctx.closePath();
            ctx.fillStyle   = '#172554';
            ctx.fill();
            ctx.strokeStyle = 'rgba(56,189,248,0.55)';
            ctx.lineWidth   = 1;
            ctx.stroke();

            // Right wing
            ctx.beginPath();
            ctx.moveTo(7, 5); ctx.lineTo(26, 20);
            ctx.lineTo(19, 26); ctx.lineTo(8, 17);
            ctx.closePath();
            ctx.fillStyle   = '#172554';
            ctx.fill();
            ctx.stroke();

            // Fuselage
            ctx.beginPath();
            ctx.moveTo(0, -27);
            ctx.lineTo(9, 2); ctx.lineTo(7, 18);
            ctx.lineTo(0, 17);
            ctx.lineTo(-7, 18); ctx.lineTo(-9, 2);
            ctx.closePath();
            ctx.fillStyle   = '#1e3a8a';
            ctx.fill();
            ctx.strokeStyle = 'rgba(96,165,250,0.55)';
            ctx.lineWidth   = 1.5;
            ctx.stroke();

            // Cockpit
            ctx.shadowBlur  = 4;
            ctx.shadowColor = 'rgba(186,230,253,0.5)';
            ctx.beginPath();
            ctx.ellipse(0, -8, 3.5, 6, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(186,230,253,0.75)';
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // ── Draw: enemy (brillo reducido) ────────────────────────
        function drawEnemy(e: Enemy): void {
            if (!e.alive) return;
            ctx.save();
            ctx.translate(e.x, e.y + Math.sin(e.bob) * 3);
            ctx.rotate(e.angle);
            ctx.globalAlpha = 0.60;
            ctx.shadowBlur  = 4;

            if (e.type === 0) {
                ctx.shadowColor = 'rgba(56,189,248,0.5)';
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
                    i === 0 ? ctx.moveTo(15 * Math.cos(a), 15 * Math.sin(a))
                            : ctx.lineTo(15 * Math.cos(a), 15 * Math.sin(a));
                }
                ctx.closePath();
                ctx.strokeStyle = 'rgba(56,189,248,0.65)';
                ctx.lineWidth   = 1.2;
                ctx.stroke();
                ctx.fillStyle   = 'rgba(56,189,248,0.05)';
                ctx.fill();
                ctx.beginPath();
                ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(56,189,248,0.40)';
                ctx.fill();

            } else if (e.type === 1) {
                ctx.shadowColor = 'rgba(59,130,246,0.5)';
                ctx.beginPath();
                ctx.moveTo(0, -17); ctx.lineTo(12, 0);
                ctx.lineTo(0, 17);  ctx.lineTo(-12, 0);
                ctx.closePath();
                ctx.strokeStyle = 'rgba(96,165,250,0.60)';
                ctx.lineWidth   = 1.2;
                ctx.stroke();
                ctx.fillStyle   = 'rgba(59,130,246,0.06)';
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(0, -9); ctx.lineTo(0, 9);
                ctx.moveTo(-8, 0); ctx.lineTo(8, 0);
                ctx.strokeStyle = 'rgba(96,165,250,0.30)';
                ctx.lineWidth   = 0.8;
                ctx.stroke();

            } else {
                ctx.shadowColor = 'rgba(129,140,248,0.5)';
                ctx.beginPath();
                ctx.arc(0, 0, 15, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(129,140,248,0.60)';
                ctx.lineWidth   = 1.2;
                ctx.stroke();
                ctx.fillStyle   = 'rgba(129,140,248,0.05)';
                ctx.fill();
                ctx.beginPath();
                for (let i = 0; i < 3; i++) {
                    const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
                    i === 0 ? ctx.moveTo(9 * Math.cos(a), 9 * Math.sin(a))
                            : ctx.lineTo(9 * Math.cos(a), 9 * Math.sin(a));
                }
                ctx.closePath();
                ctx.strokeStyle = 'rgba(129,140,248,0.45)';
                ctx.lineWidth   = 0.8;
                ctx.stroke();
            }
            ctx.restore();
        }

        // ── Draw: bullet ─────────────────────────────────────────
        function drawBullet(b: Bullet): void {
            if (!b.active) return;
            ctx.save();
            const g = ctx.createLinearGradient(b.x, b.y + 20, b.x, b.y);
            g.addColorStop(0, 'rgba(56,189,248,0)');
            g.addColorStop(1, 'rgba(56,189,248,0.95)');
            ctx.shadowBlur  = 10;
            ctx.shadowColor = '#38BDF8';
            ctx.fillStyle   = g;
            ctx.fillRect(b.x - 2, b.y, 4, 20);
            ctx.beginPath();
            ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#E0F2FE';
            ctx.fill();
            ctx.restore();
        }

        // ── Draw: particles + rings ───────────────────────────────
        function drawFx(): void {
            for (const p of particles) {
                ctx.save();
                ctx.globalAlpha = p.life / p.maxLife;
                ctx.shadowBlur  = 5;
                ctx.shadowColor = p.col;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = p.col;
                ctx.fill();
                ctx.restore();
            }
            for (const p of thrusters) {
                ctx.save();
                ctx.globalAlpha = (p.life / p.maxLife) * 0.55;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = p.col;
                ctx.fill();
                ctx.restore();
            }
            for (const r of rings) {
                ctx.save();
                ctx.globalAlpha = (r.life / 30) * 0.55;
                ctx.shadowBlur  = 8;
                ctx.shadowColor = r.col;
                ctx.beginPath();
                ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
                ctx.strokeStyle = r.col;
                ctx.lineWidth   = 2;
                ctx.stroke();
                ctx.restore();
            }
        }

        // ── Draw: HUD corners ─────────────────────────────────────
        function drawHud(): void {
            ctx.save();
            ctx.strokeStyle = 'rgba(59,130,246,0.22)';
            ctx.lineWidth   = 1.2;
            const m = 22, L = 44;
            // TL
            ctx.beginPath(); ctx.moveTo(m, m + L); ctx.lineTo(m, m); ctx.lineTo(m + L, m); ctx.stroke();
            // TR
            ctx.beginPath(); ctx.moveTo(canvas.width - m - L, m); ctx.lineTo(canvas.width - m, m); ctx.lineTo(canvas.width - m, m + L); ctx.stroke();
            // BL
            ctx.beginPath(); ctx.moveTo(m, canvas.height - m - L); ctx.lineTo(m, canvas.height - m); ctx.lineTo(m + L, canvas.height - m); ctx.stroke();
            // BR
            ctx.beginPath(); ctx.moveTo(canvas.width - m - L, canvas.height - m); ctx.lineTo(canvas.width - m, canvas.height - m); ctx.lineTo(canvas.width - m, canvas.height - m - L); ctx.stroke();
            ctx.restore();
        }

        // ── Logic helpers ─────────────────────────────────────────
        function spawnExplosion(x: number, y: number, col: string): void {
            for (let i = 0; i < 12; i++) {
                const a = (i / 12) * Math.PI * 2;
                const spd = Math.random() * 2.2 + 0.8;
                particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 0.5, life: 38, maxLife: 38, r: Math.random() * 2.5 + 0.8, col });
            }
            for (let i = 0; i < 5; i++) {
                particles.push({ x, y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, life: 25, maxLife: 25, r: Math.random() * 1.5 + 0.4, col });
            }
            rings.push({ x, y, r: 2, life: 30, col });
        }

        // ── Update ────────────────────────────────────────────────
        function update(now: number): void {
            frameCount++;

            // Wave reset
            if (waveDelay > 0) {
                waveDelay--;
                if (waveDelay === 0) { enemies = makeWave(); enemyDx = 0.48; }
                return;
            }

            const alive = enemies.filter(e => e.alive);
            if (alive.length === 0) { waveDelay = 110; return; }

            // Enemy group movement
            let minX = Infinity, maxX = -Infinity;
            for (const e of alive) { if (e.x < minX) minX = e.x; if (e.x > maxX) maxX = e.x; }
            const speedBoost = 1 + (1 - alive.length / (COLS * ROWS)) * 0.8;
            if (maxX + 22 > canvas.width - 28)  enemyDx = -Math.abs(enemyDx);
            if (minX - 22 < 28) enemyDx =  Math.abs(enemyDx);
            for (const e of enemies) {
                e.angle += (e.type === 0 ? 0.012 : e.type === 1 ? -0.008 : 0.015);
                e.bob   += 0.045;
                if (e.alive) e.x += enemyDx * speedBoost;
            }

            // Nave: oscilación sinusoidal suave, completamente independiente de los enemigos
            shipX = canvas.width / 2 + Math.sin(frameCount * 0.008) * (canvas.width * 0.28);

            // Thruster particles
            if (frameCount % 3 === 0) {
                thrusters.push({ x: shipX + (Math.random() - 0.5) * 8, y: canvas.height - 68, vx: (Math.random() - 0.5) * 0.6, vy: Math.random() * 1.6 + 0.6, life: 20, maxLife: 20, r: Math.random() * 1.8 + 0.5, col: Math.random() > 0.5 ? '#38BDF8' : '#93C5FD' });
            }

            // Auto-fire: siempre desde la posición actual de la nave, recto hacia arriba
            if (now - lastFire > FIRE_MS) {
                lastFire = now;
                bullets.push({ x: shipX, y: canvas.height - 90, active: true });
            }

            // Bullet movement + collision
            for (const b of bullets) {
                if (!b.active) continue;
                b.y -= 13;
                if (b.y < -20) { b.active = false; continue; }
                for (const e of enemies) {
                    if (!e.alive) continue;
                    const dx = b.x - e.x, dy = b.y - (e.y + Math.sin(e.bob) * 3);
                    if (dx * dx + dy * dy < 18 * 18) {
                        b.active = false;
                        e.alive  = false;
                        spawnExplosion(e.x, e.y, e.type === 0 ? '#38BDF8' : e.type === 1 ? '#60A5FA' : '#818CF8');
                        break;
                    }
                }
            }
            // Prune inactive bullets
            for (let i = bullets.length - 1; i >= 0; i--) { if (!bullets[i].active) bullets.splice(i, 1); }

            // Particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.life--;
                if (p.life <= 0) particles.splice(i, 1);
            }
            for (let i = thrusters.length - 1; i >= 0; i--) {
                const p = thrusters[i];
                p.x += p.vx; p.y += p.vy; p.life--;
                if (p.life <= 0) thrusters.splice(i, 1);
            }
            for (let i = rings.length - 1; i >= 0; i--) {
                const r = rings[i];
                r.r += 40 / 30; r.life--;
                if (r.life <= 0) rings.splice(i, 1);
            }
        }

        // ── Main loop ─────────────────────────────────────────────
        function loop(now: number): void {
            lastTime = now;
            update(now);
            drawBg();
            drawFx();
            for (const e of enemies) drawEnemy(e);
            for (const b of bullets)  drawBullet(b);
            drawShip(shipX, canvas.height - 80);
            drawHud();
            animId = requestAnimationFrame(loop);
        }
        animId = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
    );
}


// ═══════════════════════════════════════════════════════════════════════
// LOGIN PAGE
// ═══════════════════════════════════════════════════════════════════════
export function LoginPage(): JSX.Element {
    const { login }  = useAuth();
    const navigate   = useNavigate();

    const [email,    setEmail]    = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [status,   setStatus]   = useState<LoginState>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault();
        if (!email.trim() || !password) {
            setStatus('error');
            setErrorMsg('Introduce email y contraseña.');
            return;
        }
        setStatus('loading');
        setErrorMsg('');
        try {
            const { data } = await api.post<LoginResponse>('/auth/login', {
                email:    email.trim().toLowerCase(),
                password,
            });
            if (data.token) {
                login(data.token);
                navigate('/dashboard', { replace: true });
            } else {
                setStatus('error');
                setErrorMsg('El servidor no devolvió un token. Inténtalo de nuevo.');
            }
        } catch (err) {
            const axiosErr = err as AxiosError<{ message?: string }>;
            if (axiosErr.response?.status === 401 || axiosErr.response?.status === 403) {
                setErrorMsg('Credenciales incorrectas o cuenta no verificada.');
            } else if (axiosErr.response?.data?.message) {
                setErrorMsg(axiosErr.response.data.message);
            } else if (axiosErr.code === 'ERR_NETWORK') {
                setErrorMsg('No se puede conectar con el servidor. Comprueba tu conexión.');
            } else {
                setErrorMsg('Error inesperado. Inténtalo de nuevo.');
            }
            setStatus('error');
        }
    }

    const C = {
        primary:  '#F0F6FC',
        secondary:'#C9D1D9',
        muted:    '#8B949E',
        accent:   '#3B82F6',
        surface:  '#0C1017',
        border:   'rgba(59,130,246,0.20)',
        inputBg:  'rgba(240,246,252,0.04)',
    } as const;

    const onFocus = (e: React.FocusEvent<HTMLInputElement>): void => {
        e.currentTarget.style.borderColor = C.accent;
        e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(59,130,246,0.12)';
        e.currentTarget.style.background  = 'rgba(59,130,246,0.06)';
    };
    const onBlur = (e: React.FocusEvent<HTMLInputElement>): void => {
        e.currentTarget.style.borderColor = C.border;
        e.currentTarget.style.boxShadow   = 'none';
        e.currentTarget.style.background  = C.inputBg;
    };

    return (
        <>
            <style>{`
                @keyframes lp-fadeUp {
                    from { opacity:0; transform:translateY(18px); }
                    to   { opacity:1; transform:translateY(0);    }
                }
                @keyframes lp-shake {
                    0%,100%{transform:translateX(0)}
                    20%{transform:translateX(-5px)}
                    40%{transform:translateX(5px)}
                    60%{transform:translateX(-3px)}
                    80%{transform:translateX(3px)}
                }
                @keyframes lp-pulse {
                    0%,100%{opacity:0.45; transform:scale(1);}
                    50%{opacity:1; transform:scale(1.15);}
                }
                .lp-btn {
                    width:100%; padding:13px 0;
                    font-family:var(--font-display);
                    font-size:13px; font-weight:700;
                    letter-spacing:0.12em; text-transform:uppercase;
                    color:#fff; border:none; border-radius:8px; cursor:pointer;
                    background:linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%);
                    box-shadow:0 2px 16px rgba(37,99,235,0.42),0 1px 0 rgba(255,255,255,0.08) inset;
                    transition:opacity 180ms ease,transform 120ms ease,box-shadow 180ms ease;
                }
                .lp-btn:hover:not(:disabled){
                    opacity:.88; transform:translateY(-1px);
                    box-shadow:0 6px 26px rgba(37,99,235,0.58),0 1px 0 rgba(255,255,255,0.10) inset;
                }
                .lp-btn:active:not(:disabled){transform:translateY(0);}
                .lp-btn:disabled{
                    background:rgba(240,246,252,0.06);
                    color:#8B949E;cursor:not-allowed;box-shadow:none;
                }
            `}</style>

            <div style={{
                minHeight:      '100dvh',
                colorScheme:    'dark',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                position:       'relative',
                overflow:       'hidden',
                background:     '#050810',
            }}>
                {/* Juego de fondo */}
                <div style={{ position:'absolute', inset:0, zIndex:0 }}>
                    <SpaceGame />
                </div>

                {/* Overlay: oscurece el centro para que la tarjeta resalte */}
                <div style={{
                    position:  'absolute', inset:0, zIndex:1,
                    background:'radial-gradient(ellipse 55% 70% at 50% 50%, rgba(5,8,16,0.55) 0%, transparent 80%)',
                    pointerEvents:'none',
                }} />

                {/* ── Tarjeta centrada ──────────────────────────────── */}
                <div style={{
                    position:  'relative',
                    zIndex:    2,
                    width:     '100%',
                    maxWidth:  '400px',
                    padding:   '20px',
                    animation: 'lp-fadeUp 0.48s cubic-bezier(0.23,1,0.32,1) both',
                }}>

                    {/* Wordmark */}
                    <div style={{ textAlign:'center', marginBottom:'30px' }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'12px', marginBottom:'14px' }}>
                            <div style={{ height:'1px', width:'36px', background:'linear-gradient(90deg,transparent,rgba(56,189,248,0.50))' }} />
                            <span style={{ fontFamily:'var(--font-display)', fontSize:'9px', fontWeight:700, color:C.muted, letterSpacing:'0.28em', textTransform:'uppercase' }}>
                                LEVELUP ARCADE
                            </span>
                            <div style={{ height:'1px', width:'36px', background:'linear-gradient(90deg,rgba(56,189,248,0.50),transparent)' }} />
                        </div>

                        <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(3.2rem,10vw,5.2rem)', fontWeight:800, letterSpacing:'0.06em', textTransform:'uppercase', lineHeight:1, margin:0 }}>
                            <span style={{ color:C.primary }}>NEX</span>
                            <span style={{
                                background:'linear-gradient(90deg,#60A5FA 0%,#38BDF8 100%)',
                                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
                                filter:'drop-shadow(0 0 22px rgba(56,189,248,0.40))',
                            }}>US</span>
                        </h1>

                        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginTop:'8px' }}>
                            <span style={{ display:'inline-block', width:'6px', height:'6px', borderRadius:'50%', background:'#3B82F6', animation:'lp-pulse 2.2s ease-in-out infinite', boxShadow:'0 0 10px rgba(59,130,246,0.75)' }} />
                            <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', letterSpacing:'0.22em', color:C.muted, textTransform:'uppercase' }}>
                                ERP SYSTEM
                            </span>
                        </div>
                    </div>

                    {/* Card */}
                    <div style={{
                        background:   C.surface,
                        border:       '1px solid rgba(59,130,246,0.18)',
                        borderTop:    '2px solid rgba(59,130,246,0.55)',
                        borderRadius: '14px',
                        padding:      '28px 26px 24px',
                        boxShadow:    '0 0 0 1px rgba(255,255,255,0.04), 0 24px 64px rgba(0,0,0,0.75), 0 0 40px rgba(59,130,246,0.07)',
                        backdropFilter: 'blur(12px)',
                    }}>
                        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'11px', fontWeight:700, letterSpacing:'0.22em', textTransform:'uppercase', color:C.muted, textAlign:'center', margin:'0 0 24px' }}>
                            ACCESO AL SISTEMA
                        </h2>

                        <div style={{ animation: status === 'error' ? 'lp-shake 0.4s ease' : 'none' }}>
                            <form onSubmit={handleSubmit} noValidate>

                                {/* Email */}
                                <div style={{ marginBottom:'14px' }}>
                                    <label style={{ display:'block', fontFamily:'var(--font-display)', fontSize:'10px', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:C.secondary, marginBottom:'7px' }}>
                                        Email
                                    </label>
                                    <input
                                        type="email" autoComplete="email"
                                        placeholder="usuario@levelupnexus.es"
                                        value={email} onChange={e => setEmail(e.target.value)}
                                        disabled={status === 'loading'}
                                        onFocus={onFocus} onBlur={onBlur}
                                        style={{ width:'100%', boxSizing:'border-box', fontFamily:'var(--font-mono)', fontSize:'13px', color:C.primary, background:C.inputBg, border:`1px solid ${C.border}`, borderRadius:'8px', padding:'11px 14px', outline:'none', caretColor:C.accent, transition:'border-color 160ms ease,box-shadow 160ms ease,background 160ms ease' }}
                                    />
                                </div>

                                {/* Password */}
                                <div style={{ marginBottom:'22px' }}>
                                    <label style={{ display:'block', fontFamily:'var(--font-display)', fontSize:'10px', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:C.secondary, marginBottom:'7px' }}>
                                        Contraseña
                                    </label>
                                    <div style={{ position:'relative' }}>
                                        <input
                                            type={showPass ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            placeholder="••••••••"
                                            value={password} onChange={e => setPassword(e.target.value)}
                                            disabled={status === 'loading'}
                                            onFocus={onFocus} onBlur={onBlur}
                                            style={{ width:'100%', boxSizing:'border-box', fontFamily:'var(--font-mono)', fontSize:'13px', color:C.primary, background:C.inputBg, border:`1px solid ${C.border}`, borderRadius:'8px', padding:'11px 52px 11px 14px', outline:'none', caretColor:C.accent, transition:'border-color 160ms ease,box-shadow 160ms ease,background 160ms ease' }}
                                        />
                                        <button
                                            type="button" onClick={() => setShowPass(p => !p)} tabIndex={-1}
                                            style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'transparent', border:'none', cursor:'pointer', fontFamily:'var(--font-display)', fontSize:'9px', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:C.muted, padding:'4px 2px', lineHeight:1, transition:'color 160ms ease' }}
                                            onMouseEnter={e => (e.currentTarget.style.color = C.secondary)}
                                            onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
                                        >
                                            {showPass ? 'Ocultar' : 'Ver'}
                                        </button>
                                    </div>
                                </div>

                                {/* Error */}
                                {status === 'error' && (
                                    <div style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.28)', borderRadius:'7px', padding:'10px 13px', marginBottom:'16px', fontFamily:'var(--font-mono)', fontSize:'11px', color:'#F87171', letterSpacing:'0.02em' }}>
                                        ⚠ {errorMsg}
                                    </div>
                                )}

                                <button type="submit" disabled={status === 'loading'} className="lp-btn">
                                    {status === 'loading' ? 'Autenticando...' : 'Iniciar Sesión'}
                                </button>
                            </form>
                        </div>
                    </div>

                    <p style={{ textAlign:'center', marginTop:'20px', fontFamily:'var(--font-mono)', fontSize:'10px', color:C.muted, letterSpacing:'0.06em', opacity:0.5 }}>
                        NEXUS ERP — LevelUp Arcade © 2025
                    </p>
                </div>
            </div>
        </>
    );
}
