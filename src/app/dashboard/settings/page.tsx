"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import { supabase, isSupabaseConfigured, ensureAdminSession } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [deadlineInput, setDeadlineInput] = useState<string>('');
  
  // Feedback toast message state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Convert ISO timestamp string to YYYY-MM-DDTHH:mm format for datetime-local input
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

  // Convert YYYY-MM-DDTHH:mm local datetime input string to ISO string for Supabase timestamptz
  const formatDatetimeLocalToIso = (localStr: string): string => {
    if (!localStr) return '';
    const date = new Date(localStr);
    return date.toISOString();
  };

  // Protect route if not authenticated
  useEffect(() => {
    if (!authLoading && !session) {
      router.push('/login');
    }
  }, [session, authLoading, router]);

  // Carga inicial (Fetch) de la tabla settings (id: 1)
  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      try {
        if (isSupabaseConfigured && supabase) {
          await ensureAdminSession();
          const { data, error } = await supabase
            .from('settings')
            .select('rsvp_deadline')
            .eq('id', 1)
            .maybeSingle();

          if (error) {
            console.error('Error fetching settings from Supabase:', error);
            setToast({
              message: 'Error al consultar la configuración desde Supabase: ' + error.message,
              type: 'error'
            });
          } else if (data?.rsvp_deadline) {
            setDeadlineInput(formatIsoToDatetimeLocal(data.rsvp_deadline));
          } else {
            // Default date fallback if rsvp_deadline is empty
            setDeadlineInput(formatIsoToDatetimeLocal('2026-11-20T23:59:00Z'));
          }
        }
      } catch (err: any) {
        console.error('Unexpected error fetching settings:', err);
        setToast({
          message: 'Error al conectar con la base de datos.',
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    }

    if (session) {
      fetchSettings();
    }
  }, [session]);

  // Actualización (Update) en Supabase
  const handleSaveDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deadlineInput) {
      setToast({ message: 'Por favor selecciona una fecha y hora válidas.', type: 'error' });
      return;
    }

    setIsSaving(true);
    setToast(null);

    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase no está configurado.');
      }

      await ensureAdminSession();

      const isoDeadline = formatDatetimeLocalToIso(deadlineInput);

      // Execute upsert/update on table settings for row with id: 1
      const { error: updateErr } = await supabase
        .from('settings')
        .upsert(
          { id: 1, rsvp_deadline: isoDeadline },
          { onConflict: 'id' }
        );

      if (updateErr) {
        throw updateErr;
      }

      setToast({
        message: '¡Fecha límite de RSVP actualizada con éxito!',
        type: 'success'
      });
    } catch (err: any) {
      console.error('Error updating rsvp_deadline:', err);
      setToast({
        message: err.message || 'Error al guardar la nueva fecha límite en Supabase.',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-body text-on-surface">
      <Sidebar 
        variant="novios" 
        isOpenMobile={isMobileSidebarOpen} 
        onCloseMobile={() => setIsMobileSidebarOpen(false)} 
      />

      <main className="md:ml-64 flex-1 flex flex-col relative overflow-x-hidden min-w-0">
        {/* Header */}
        <header className="min-h-[64px] bg-surface/80 backdrop-blur-md flex flex-wrap items-center justify-between px-4 sm:px-gutter border-b border-outline-variant sticky top-0 z-10 gap-3 py-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 text-secondary hover:text-primary transition-colors bg-surface-container-low rounded-xl touch-target"
              aria-label="Abrir menú"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>
            <div>
              <h2 className="font-headline-sm text-base sm:text-headline-sm text-on-surface font-bold">Configuración Global</h2>
              <p className="text-[12px] text-secondary font-body-md hidden sm:block">Ajustes generales del evento y límites de confirmación.</p>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-4 sm:p-gutter max-w-4xl w-full mx-auto flex-1 space-y-6">
          
          {/* Toast Notification Alert */}
          {toast && (
            <div 
              className={`p-4 rounded-2xl border text-sm font-body-md flex items-center justify-between gap-3 animate-fadeIn shadow-md ${
                toast.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-xl shrink-0">
                  {toast.type === 'success' ? 'check_circle' : 'error'}
                </span>
                <span className="font-semibold">{toast.message}</span>
              </div>
              <button 
                onClick={() => setToast(null)}
                className="p-1 hover:opacity-75 transition-opacity"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          )}

          {/* Card: Configuración de RSVP */}
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden backdrop-blur-md">
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-primary to-transparent"></div>

            <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-outline-variant/30">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-2xl">event_available</span>
              </div>
              <div>
                <h3 className="font-display-lg text-xl sm:text-2xl text-primary font-bold">
                  Configuración de RSVP
                </h3>
                <p className="text-xs sm:text-sm text-secondary font-body-md">
                  Define la fecha y hora límite para que los invitados confirmen o declinen su asistencia.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center space-y-3">
                <span className="material-symbols-outlined text-3xl text-primary animate-spin">sync</span>
                <p className="text-xs font-label-caps text-secondary tracking-widest uppercase">Cargando configuración de Supabase...</p>
              </div>
            ) : (
              <form onSubmit={handleSaveDeadline} className="space-y-6">
                <div className="space-y-2 max-w-lg">
                  <label htmlFor="rsvp_deadline_input" className="block font-label-caps text-xs text-secondary uppercase tracking-wider font-bold">
                    Fecha y Hora Límite de RSVP (Timestamptz)
                  </label>
                  <div className="relative">
                    <input 
                      type="datetime-local" 
                      id="rsvp_deadline_input"
                      value={deadlineInput}
                      onChange={(e) => setDeadlineInput(e.target.value)}
                      disabled={isSaving}
                      className="w-full py-3.5 px-4 bg-surface-container-low border border-outline-variant/80 rounded-xl text-sm font-body-md text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-50 min-h-[48px]"
                    />
                  </div>
                  <p className="text-[11px] text-secondary/80 font-body-md">
                    Una vez superada esta fecha y hora, el contador público en <span className="font-mono text-primary font-semibold">/rsvp</span> indicará que el plazo ha finalizado y deshabilitará nuevas verificaciones.
                  </p>
                </div>

                {/* Save Button */}
                <div className="pt-4 border-t border-outline-variant/30 flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="btn-premium btn-shine bg-primary text-on-primary py-3.5 px-8 font-label-caps text-xs uppercase tracking-widest font-bold rounded-xl flex items-center justify-center gap-2.5 shadow-md hover:scale-[1.02] transition-all disabled:opacity-50 min-h-[44px]"
                  >
                    {isSaving ? (
                      <>
                        <span className="material-symbols-outlined text-lg animate-spin">sync</span>
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-lg">save</span>
                        <span>Guardar nueva fecha</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <Footer variant="dashboard" />
      </main>
    </div>
  );
}
