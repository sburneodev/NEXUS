import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { SpaceInvaders } from '../components/game/SpaceInvaders';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import type { LoginResponse } from '../types/auth';
import { AxiosError } from 'axios';

type LoginState = 'idle' | 'loading' | 'error';

export function LoginPage(): JSX.Element {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [status, setStatus] = useState<LoginState>('idle');
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
                email: email.trim().toLowerCase(),
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

    return (
        <>
            <style>{`
                @keyframes borderGlow {
                    0%   { background-position: 0% 50%; }
                    50%  { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(18px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes glitch {
                    0%   { transform: translate(0);         filter: none; }
                    20%  { transform: translate(-3px, 1px); filter: hue-rotate(90deg); }
                    40%  { transform: translate(3px, -1px); filter: hue-rotate(-90deg); }
                    60%  { transform: translate(-2px, 2px); filter: brightness(1.3); }
                    80%  { transform: translate(2px, -2px); filter: hue-rotate(45deg); }
                    100% { transform: translate(0);         filter: none; }
                }
                @keyframes glitch-border {
                    0%, 100% { box-shadow: -2px 0 #ff4466,  2px 0 #00d4ff; }
                    25%      { box-shadow:  2px 0 #ff4466, -2px 0 #00d4ff; }
                    50%      { box-shadow: -2px 0 #00ff88,  2px 0 #ff4466; }
                    75%      { box-shadow:  2px 0 #00d4ff, -2px 0 #00ff88; }
                }
            `}</style>

            <div style={{ minHeight: '100dvh', background: '#05050a', colorScheme: 'dark', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>

                <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                    <SpaceInvaders />
                </div>

                <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'rgba(5,5,10,0.45)' }} />

                <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: '390px', padding: '16px', animation: 'fadeInUp 0.5s ease both' }}>

                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
                            <div style={{ height: '1px', width: '36px', background: 'linear-gradient(90deg, transparent, #00d4ff)' }} />
                            <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '11px', fontWeight: 600, color: '#00d4ff', letterSpacing: '0.22em', textTransform: 'uppercase' }}>LEVELUP ARCADE</span>
                            <div style={{ height: '1px', width: '36px', background: 'linear-gradient(90deg, #00d4ff, transparent)' }} />
                        </div>
                        <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 'clamp(3rem, 10vw, 5rem)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1, margin: 0 }}>
                            <span style={{ color: '#ffffff' }}>NEX</span>
                            <span style={{ background: 'linear-gradient(90deg, #00ff88 0%, #00d4ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', filter: 'drop-shadow(0 0 14px rgba(0,212,255,0.4))' }}>US</span>
                        </h1>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', inset: '-1.5px', borderRadius: '14px', background: 'linear-gradient(135deg, #00ff88, #00d4ff, #005588, #00d4ff, #00ff88)', backgroundSize: '300% 300%', animation: 'borderGlow 4s ease infinite', zIndex: 0 }} />

                        <div style={{ position: 'relative', zIndex: 1, background: '#0d0d1a', borderRadius: '13px', padding: '30px 26px 26px' }}>

                            <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#ffffff', textAlign: 'center', margin: '0 0 24px' }}>
                                ACCESO AL SISTEMA
                            </h2>

                            <div style={{ animation: status === 'error' ? 'glitch 0.4s ease' : 'none' }}>
                                <form onSubmit={handleSubmit} noValidate>

                                    <div style={{ marginBottom: '13px' }}>
                                        <label style={{ display: 'block', fontFamily: "'Rajdhani', sans-serif", fontSize: '10px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#aaaacc', marginBottom: '6px' }}>EMAIL</label>
                                        <input type="email" autoComplete="email" placeholder="usuario@levelupnexus.es" value={email} onChange={e => setEmail(e.target.value)} disabled={status === 'loading'}
                                            style={{ width: '100%', boxSizing: 'border-box', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#e8e8f0', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '7px', padding: '11px 14px', outline: 'none', caretColor: '#00d4ff', transition: 'border-color 160ms ease, box-shadow 160ms ease' }}
                                            onFocus={e => { e.currentTarget.style.borderColor = '#00d4ff'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,212,255,0.10)'; }}
                                            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.boxShadow = 'none'; }}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '22px' }}>
                                        <label style={{ display: 'block', fontFamily: "'Rajdhani', sans-serif", fontSize: '10px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#aaaacc', marginBottom: '6px' }}>CONTRASEÑA</label>
                                        <div style={{ position: 'relative' }}>
                                            <input type={showPass ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} disabled={status === 'loading'}
                                                style={{ width: '100%', boxSizing: 'border-box', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#e8e8f0', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '7px', padding: '11px 52px 11px 14px', outline: 'none', caretColor: '#00d4ff', transition: 'border-color 160ms ease, box-shadow 160ms ease' }}
                                                onFocus={e => { e.currentTarget.style.borderColor = '#00d4ff'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,212,255,0.10)'; }}
                                                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.boxShadow = 'none'; }}
                                            />
                                            <button type="button" onClick={() => setShowPass(p => !p)} tabIndex={-1}
                                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'Rajdhani', sans-serif", fontSize: '10px', fontWeight: 600, letterSpacing: '0.10em', color: '#4a4a6a', padding: '4px 2px', lineHeight: 1, transition: 'color 160ms ease', textTransform: 'uppercase' }}
                                                onMouseEnter={e => (e.currentTarget.style.color = '#00d4ff')}
                                                onMouseLeave={e => (e.currentTarget.style.color = '#4a4a6a')}
                                            >{showPass ? 'OCULTAR' : 'VER'}</button>
                                        </div>
                                    </div>

                                    {status === 'error' && (
                                        <div style={{ background: 'rgba(255,68,102,0.08)', border: '1px solid #ff4466', borderRadius: '6px', padding: '9px 13px', marginBottom: '16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#ff4466', letterSpacing: '0.02em', animation: 'glitch-border 0.6s ease' }}>
                                            ⚠ {errorMsg}
                                        </div>
                                    )}

                                    <button type="submit" disabled={status === 'loading'}
                                        style={{ width: '100%', padding: '13px', fontFamily: "'Rajdhani', sans-serif", fontSize: '14px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: status === 'loading' ? 'not-allowed' : 'pointer', background: status === 'loading' ? 'rgba(255,255,255,0.04)' : 'linear-gradient(90deg, #00ff88 0%, #00d4ff 100%)', color: status === 'loading' ? '#4a4a6a' : '#05050a', border: 'none', borderRadius: '7px', transition: 'opacity 200ms ease, transform 120ms ease, box-shadow 200ms ease', boxShadow: status === 'loading' ? 'none' : '0 0 24px rgba(0,212,255,0.20)', opacity: status === 'loading' ? 0.45 : 1 }}
                                        onMouseEnter={e => { if (status !== 'loading') { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 36px rgba(0,212,255,0.35)'; } }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 24px rgba(0,212,255,0.20)'; }}
                                    >{status === 'loading' ? 'AUTENTICANDO...' : 'INICIAR SESIÓN'}</button>

                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
