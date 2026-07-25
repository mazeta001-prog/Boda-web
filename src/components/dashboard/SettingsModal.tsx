"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const router = useRouter();
  const { signOut } = useAuth();

  if (!isOpen) return null;

  const handleLogout = async () => {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
      await signOut();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('wedding_auth_session');
        sessionStorage.clear();
      }
      onClose();
      router.push('/login');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-2xl overflow-hidden z-10 p-4 sm:p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center mb-6 pb-3 border-b border-outline-variant/30">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-2xl">settings</span>
            <div>
              <h3 className="font-headline-sm text-lg font-bold text-on-surface">Configuración y Cuenta</h3>
              <p className="text-xs text-secondary font-body-md">Administra tu sesión y preferencias</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* User Account Summary Card */}
        <div className="p-4 rounded-xl bg-surface-container-low/70 border border-outline-variant/40 mb-6 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold text-lg shrink-0">
            <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-label-caps text-primary font-bold uppercase tracking-wider block">Sesión Activa</span>
            <h4 className="font-bold text-sm text-on-surface truncate">Administrador (Ivan &amp; Dana)</h4>
            <p className="text-xs text-secondary truncate">Panel de Gestión de Boda</p>
          </div>
        </div>

        {/* Menu Options */}
        <div className="space-y-3 mb-6">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center justify-between p-3.5 rounded-xl border border-outline-variant/40 bg-surface-container-lowest hover:bg-surface-container-low transition-all text-xs font-bold text-on-surface group"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-lg">home</span>
              <span>Ir al Sitio Web Público (Invitación)</span>
            </div>
            <span className="material-symbols-outlined text-secondary text-base group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </Link>

          <div className="p-3.5 rounded-xl border border-outline-variant/40 bg-surface-container-lowest flex items-center justify-between text-xs font-bold text-on-surface">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-lg">notifications_active</span>
              <span>Notificaciones del Sistema</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Activas
            </span>
          </div>
        </div>

        {/* LOGOUT BUTTON SECTION */}
        <div className="pt-4 border-t border-outline-variant/30 space-y-3">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-3 px-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 font-label-caps text-xs font-bold hover:bg-rose-500/20 transition-all flex items-center justify-center gap-2 shadow-2xs"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            <span>CERRAR SESIÓN</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-label-caps text-secondary hover:bg-surface-container transition-colors text-center"
          >
            Cancelar
          </button>
        </div>

      </div>
    </div>
  );
}
