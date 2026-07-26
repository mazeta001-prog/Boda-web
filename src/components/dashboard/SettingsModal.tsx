"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, isSupabaseConfigured, ensureAdminSession } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const router = useRouter();
  const { signOut } = useAuth();

  const [loadingDeadline, setLoadingDeadline] = useState(false);
  const [savingDeadline, setSavingDeadline] = useState(false);
  const [deadlineInput, setDeadlineInput] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Helper formatting ISO <-> datetime-local
  const formatIsoToDatetimeLocal = (isoStr: string): string => {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const formatDatetimeLocalToIso = (localStr: string): string => {
    if (!localStr) return '';
    const date = new Date(localStr);
    return date.toISOString();
  };

  // Fetch rsvp_deadline when modal opens
  useEffect(() => {
    async function fetchDeadline() {
      if (!isOpen) return;
      setLoadingDeadline(true);
      try {
        if (isSupabaseConfigured && supabase) {
          await ensureAdminSession();
          const { data, error } = await supabase
            .from('settings')
            .select('rsvp_deadline')
            .eq('id', 1)
            .maybeSingle();

          if (data?.rsvp_deadline) {
            setDeadlineInput(formatIsoToDatetimeLocal(data.rsvp_deadline));
          } else {
            setDeadlineInput(formatIsoToDatetimeLocal('2026-11-20T23:59:00Z'));
          }
        }
      } catch (err) {
        console.error('Error fetching settings deadline:', err);
      } finally {
        setLoadingDeadline(false);
      }
    }

    fetchDeadline();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deadlineInput) return;

    setSavingDeadline(true);
    setToast(null);

    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase no está configurado');
      }

      await ensureAdminSession();
      const isoDeadline = formatDatetimeLocalToIso(deadlineInput);

      const { error } = await supabase
        .from('settings')
        .upsert({ id: 1, rsvp_deadline: isoDeadline }, { onConflict: 'id' });

      if (error) throw error;

      setToast({
        message: '¡Fecha límite de RSVP actualizada!',
        type: 'success'
      });
    } catch (err: any) {
      console.error('Error saving deadline in modal:', err);
      setToast({
        message: err.message || 'Error al guardar la fecha.',
        type: 'error'
      });
    } finally {
      setSavingDeadline(false);
    }
  };

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
      <div className="relative w-full max-w-lg bg-surface-container-lowest border border-outline-variant/60 rounded-3xl shadow-2xl overflow-hidden z-10 p-5 sm:p-7 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-outline-variant/30">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-xl">settings</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-lg font-bold text-on-surface">Configuración General</h3>
              <p className="text-xs text-secondary font-body-md">Ajustes del evento y administración de sesión</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto flex-1 space-y-5 pr-1">

          {/* User Account Summary Card */}
          <div className="p-4 rounded-2xl bg-surface-container-low/70 border border-outline-variant/40 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold text-base shrink-0">
              <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-label-caps text-primary font-bold uppercase tracking-wider block">Sesión Activa</span>
              <h4 className="font-bold text-sm text-on-surface truncate">Administrador (Ivan &amp; Dana)</h4>
              <p className="text-xs text-secondary truncate">Panel de Gestión de Boda</p>
            </div>
          </div>

          {/* SECTION: Configuración de RSVP Deadline */}
          <div className="p-4 rounded-2xl bg-surface-container-low border border-primary/20 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">event_available</span>
                <span className="font-bold text-xs text-on-surface font-label-caps tracking-wider">Fecha Límite para RSVP</span>
              </div>
              <Link 
                href="/dashboard/settings"
                onClick={onClose}
                className="text-[11px] font-label-caps text-primary hover:underline font-bold"
              >
                Ver Página Completa →
              </Link>
            </div>

            {loadingDeadline ? (
              <div className="py-4 text-center text-xs text-secondary animate-pulse">
                Cargando fecha de Supabase...
              </div>
            ) : (
              <form onSubmit={handleSaveDeadline} className="space-y-3 pt-1">
                <input 
                  type="datetime-local" 
                  value={deadlineInput}
                  onChange={(e) => setDeadlineInput(e.target.value)}
                  disabled={savingDeadline}
                  className="w-full py-2.5 px-3 bg-surface-container-lowest border border-outline-variant/80 rounded-xl text-xs font-body-md text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-50"
                />

                <button
                  type="submit"
                  disabled={savingDeadline}
                  className="w-full py-2.5 px-4 bg-primary text-on-primary font-label-caps text-xs tracking-wider font-bold rounded-xl flex items-center justify-center gap-2 shadow-2xs hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {savingDeadline ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">save</span>
                      <span>Guardar nueva fecha RSVP</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Modal Toast Feedback */}
            {toast && (
              <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
              }`}>
                <span className="material-symbols-outlined text-base">
                  {toast.type === 'success' ? 'check_circle' : 'error'}
                </span>
                <span>{toast.message}</span>
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <Link
              href="/"
              onClick={onClose}
              className="flex items-center justify-between p-3.5 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest hover:bg-surface-container-low transition-all text-xs font-bold text-on-surface group"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-lg">home</span>
                <span>Ir al Sitio Web Público (Invitación)</span>
              </div>
              <span className="material-symbols-outlined text-secondary text-base group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </Link>

            <div className="p-3.5 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest flex items-center justify-between text-xs font-bold text-on-surface">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-lg">notifications_active</span>
                <span>Notificaciones del Sistema</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                Activas
              </span>
            </div>
          </div>

        </div>

        {/* LOGOUT BUTTON SECTION */}
        <div className="pt-4 mt-2 border-t border-outline-variant/30 space-y-2">
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
