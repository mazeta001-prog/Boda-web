"use client";

import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

interface RSVPCountdownProps {
  onExpiredChange?: (isExpired: boolean) => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function RSVPCountdown({ onExpiredChange }: RSVPCountdownProps) {
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // 1. Fetch rsvp_deadline from Supabase table `settings` (row id: 1)
  useEffect(() => {
    async function fetchDeadline() {
      try {
        if (isSupabaseConfigured && supabase) {
          const { data, error } = await supabase
            .from('settings')
            .select('rsvp_deadline')
            .eq('id', 1)
            .maybeSingle();

          if (!error && data?.rsvp_deadline) {
            const parsedDate = new Date(data.rsvp_deadline);
            if (!isNaN(parsedDate.getTime())) {
              setDeadline(parsedDate);
              setLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch rsvp_deadline from settings table:', err);
      }

      // Default fallback deadline if table or row is not present
      const defaultDate = new Date('2026-11-20T23:59:59Z');
      setDeadline(defaultDate);
      setLoading(false);
    }

    fetchDeadline();
  }, []);

  // 2. Countdown timer calculation
  useEffect(() => {
    if (!deadline) return;

    function calculateTimeLeft() {
      const now = new Date().getTime();
      const target = deadline!.getTime();
      const difference = target - now;

      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (onExpiredChange) onExpiredChange(true);
        return true; // expired
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
      setIsExpired(false);
      if (onExpiredChange) onExpiredChange(false);
      return false;
    }

    const expiredImmediate = calculateTimeLeft();
    if (expiredImmediate) return;

    const timer = setInterval(() => {
      const expired = calculateTimeLeft();
      if (expired) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline, onExpiredChange]);

  if (loading) {
    return (
      <div className="my-6 p-4 rounded-2xl bg-surface-container-low/50 border border-outline-variant/30 text-center animate-pulse">
        <div className="h-4 w-48 bg-primary/20 mx-auto rounded mb-3"></div>
        <div className="flex justify-center gap-3 max-w-xs mx-auto">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="w-12 h-12 bg-primary/10 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="my-6 p-4 sm:p-5 rounded-2xl bg-surface-container-low/70 dark:bg-surface-container-highest/20 border border-primary/20 backdrop-blur-xs text-center transition-all shadow-xs">
      {isExpired ? (
        <div className="py-2 space-y-1 animate-fadeIn">
          <div className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-label-caps text-xs font-bold tracking-widest uppercase mb-1">
            <span className="material-symbols-outlined text-base">timer_off</span>
            <span>Plazo Finalizado</span>
          </div>
          <p className="font-display-lg text-lg sm:text-xl text-primary font-bold">
            El tiempo para confirmar ha finalizado
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-1.5 text-secondary dark:text-on-surface-variant text-xs font-label-caps tracking-wider uppercase font-semibold">
            <span className="material-symbols-outlined text-sm text-primary animate-pulse">hourglass_top</span>
            <span>Tienes hasta esta fecha para confirmar tu asistencia</span>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-sm mx-auto" id="rsvp-countdown-grid">
            {/* Días */}
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-surface dark:bg-surface-dim border border-outline-variant/40 shadow-2xs">
              <span className="font-display-lg text-lg sm:text-2xl text-primary font-bold">
                {String(timeLeft.days).padStart(2, '0')}
              </span>
              <span className="font-label-caps text-[8px] sm:text-[9px] text-secondary tracking-widest uppercase mt-0.5 border-t border-primary/20 pt-0.5 w-full text-center font-bold">
                Días
              </span>
            </div>

            {/* Horas */}
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-surface dark:bg-surface-dim border border-outline-variant/40 shadow-2xs">
              <span className="font-display-lg text-lg sm:text-2xl text-primary font-bold">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className="font-label-caps text-[8px] sm:text-[9px] text-secondary tracking-widest uppercase mt-0.5 border-t border-primary/20 pt-0.5 w-full text-center font-bold">
                Horas
              </span>
            </div>

            {/* Minutos */}
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-surface dark:bg-surface-dim border border-outline-variant/40 shadow-2xs">
              <span className="font-display-lg text-lg sm:text-2xl text-primary font-bold">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="font-label-caps text-[8px] sm:text-[9px] text-secondary tracking-widest uppercase mt-0.5 border-t border-primary/20 pt-0.5 w-full text-center font-bold">
                Min.
              </span>
            </div>

            {/* Segundos */}
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-surface dark:bg-surface-dim border border-outline-variant/40 shadow-2xs">
              <span className="font-display-lg text-lg sm:text-2xl text-primary font-bold">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className="font-label-caps text-[8px] sm:text-[9px] text-secondary tracking-widest uppercase mt-0.5 border-t border-primary/20 pt-0.5 w-full text-center font-bold">
                Seg.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
