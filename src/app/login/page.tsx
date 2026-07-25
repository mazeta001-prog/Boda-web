"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, isSupabaseConfigured, ensureAdminSession } from '@/lib/supabaseClient';

export default function NovioLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          router.push('/dashboard');
        }
      });
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Por favor, introduce tu usuario y contraseña.');
      return;
    }

    setIsLoading(true);

    try {
      if (isSupabaseConfigured && supabase) {
        const email = username.includes('@') ? username.trim() : `${username.trim()}@boda.com`;
        
        let { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password: password.trim()
        });

        if (authError && (authError.message.includes('Invalid login credentials') || authError.message.includes('User not found'))) {
          // Auto create admin user in Supabase Auth if first time
          const signUpRes = await supabase.auth.signUp({
            email,
            password: password.trim()
          });
          if (signUpRes.data?.session) {
            authError = null;
          }
        }

        if (authError) {
          setError(authError.message || 'Usuario o contraseña incorrectos.');
          setIsLoading(false);
          return;
        }

        const {
          data: { session },
          error: debugSessionErr
        } = await supabase.auth.getSession();

        console.log("SESSION:", session);
        console.log("USER:", session?.user);
        console.log("AUTH ERROR:", debugSessionErr);
      }

      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Ocurrió un error al iniciar sesión.');
    } finally {
      setIsLoading(false);
    }
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
      <main className="relative z-10 flex min-h-screen items-center justify-center px-3 sm:px-gutter py-8 sm:py-12">
        <div className="w-full max-w-[440px] glass-modern p-5 sm:p-8 md:p-12 text-center animate-card shadow-2xl rounded-3xl border border-white/40">
          
          {/* Logo / Header */}
          <div className="mb-6 sm:mb-8">
            <Link href="/" className="inline-block group">
              <span className="font-display-lg text-xl sm:text-3xl text-primary font-bold tracking-[0.15em] uppercase block">
                Nuestra Historia
              </span>
              <span className="text-[10px] text-secondary font-label-caps tracking-[0.2em] sm:tracking-[0.3em] uppercase block mt-1">
                Panel de Administración Novios
              </span>
            </Link>
          </div>

          <div className="decorative-line mb-6 sm:mb-8"></div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 text-xs text-error bg-error-container/60 border border-error/30 py-3 px-4 rounded-xl animate-fade-in text-center font-body-md">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
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
                  className="w-full py-3 px-4 bg-surface-container-low/80 border border-outline-variant/60 rounded-xl text-sm font-body-md text-on-surface outline-none focus:border-primary transition-all min-h-[44px]"
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
                  className="w-full py-3 px-4 bg-surface-container-low/80 border border-outline-variant/60 rounded-xl text-sm font-body-md text-on-surface outline-none focus:border-primary transition-all min-h-[44px]"
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
            <div className="pt-3 sm:pt-4">
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-primary text-on-primary py-3.5 px-6 font-label-caps text-xs uppercase tracking-wider sm:tracking-widest font-bold rounded-xl flex justify-center items-center gap-2 hover:bg-primary-container transition-all shadow-md hover:scale-[1.02] disabled:opacity-60 min-h-[44px]"
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
                className="font-label-caps text-[11px] text-secondary hover:text-primary transition-colors tracking-widest uppercase inline-block py-2"
              >
                ← Volver a la Invitación
              </Link>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative mt-auto sm:fixed sm:bottom-6 left-0 right-0 z-10 text-center pointer-events-none pb-4 sm:pb-0">
        <p className="font-body-md text-[10px] text-white/70 tracking-[0.2em] sm:tracking-[0.3em] uppercase">
          Nuestra Historia • Control Center
        </p>
      </footer>
    </div>
  );
}
