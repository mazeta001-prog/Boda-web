"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NovioLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Por favor, introduce tu usuario y contraseña.');
      return;
    }

    if (username.trim() !== '2112' || password.trim() !== '2112') {
      setError('Usuario o contraseña incorrectos.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      router.push('/dashboard');
    }, 1000);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background font-body-md text-on-background">
      {/* Background Layer: Full-bleed high-res photo */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center brightness-90" 
          style={{ 
            backgroundImage: `url("https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2000&auto=format&fit=crop")`,
            filter: 'blur(6px)',
            transform: 'scale(1.08)'
          }}
        />
        {/* Soft overlay */}
        <div className="absolute inset-0 bg-black/30 backdrop-blur-xs" />
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 sm:px-gutter py-12">
        <div className="w-full max-w-[440px] glass-modern p-8 sm:p-12 text-center animate-card shadow-2xl rounded-3xl border border-white/40">
          
          {/* Logo / Header */}
          <div className="mb-8">
            <Link href="/" className="inline-block group">
              <span className="font-display-lg text-2xl sm:text-3xl text-primary font-bold tracking-[0.15em] uppercase block">
                Nuestra Historia
              </span>
              <span className="text-[10px] text-secondary font-label-caps tracking-[0.3em] uppercase block mt-1">
                Panel de Administración Novios
              </span>
            </Link>
          </div>

          <div className="decorative-line mb-8"></div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 text-xs text-error bg-error-container/60 border border-error/30 py-3 px-4 rounded-xl animate-fade-in text-center font-body-md">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Usuario */}
            <div className="text-left">
              <label htmlFor="username" className="font-label-caps text-[11px] text-secondary mb-1.5 block uppercase tracking-wider font-bold">
                Usuario
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  id="username" 
                  placeholder="2112" 
                  className="w-full py-3 px-4 bg-surface-container-low/80 border border-outline-variant/60 rounded-xl text-sm font-body-md text-on-surface outline-none focus:border-primary transition-all"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  autoComplete="username"
                />
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline/60 text-[20px]">
                  person
                </span>
              </div>
            </div>

            {/* Contraseña */}
            <div className="text-left">
              <label htmlFor="password" className="font-label-caps text-[11px] text-secondary mb-1.5 block uppercase tracking-wider font-bold">
                Contraseña
              </label>
              <div className="relative">
                <input 
                  type="password" 
                  id="password" 
                  placeholder="••••••••" 
                  className="w-full py-3 px-4 bg-surface-container-low/80 border border-outline-variant/60 rounded-xl text-sm font-body-md text-on-surface outline-none focus:border-primary transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline/60 text-[20px]">
                  lock
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-primary text-on-primary py-3.5 px-6 font-label-caps text-xs uppercase tracking-widest font-bold rounded-xl flex justify-center items-center gap-2 hover:bg-primary-container transition-all shadow-md hover:scale-[1.02] disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined text-lg animate-spin">sync</span>
                    <span>Ingresando al Panel...</span>
                  </>
                ) : (
                  <span>INGRESAR AL DASHBOARD</span>
                )}
              </button>
            </div>

            {/* Secondary Actions */}
            <div className="pt-2">
              <Link 
                href="/" 
                className="font-label-caps text-[11px] text-secondary hover:text-primary transition-colors tracking-widest uppercase"
              >
                ← Volver a la Invitación
              </Link>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-6 left-0 right-0 z-10 text-center pointer-events-none">
        <p className="font-body-md text-[10px] text-white/70 tracking-[0.3em] uppercase">
          Nuestra Historia • Control Center
        </p>
      </footer>
    </div>
  );
}
