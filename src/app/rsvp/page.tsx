"use client";

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase, isSupabaseConfigured, localDB, normalizeString } from '@/lib/supabaseClient';
import { Guest } from '@/types/database';

type StepType = 'search' | 'found' | 'success' | 'decline';
type SlotStatus = 'waiting' | 'searching' | 'found' | 'not-found';

interface GuestSearchSlot {
  id: number;
  firstName: string;
  lastName: string;
  status: SlotStatus;
  foundGuest: Guest | null;
  errorMessage: string | null;
}

interface SessionConfirmedItem {
  guest: Guest;
  status: 'confirmed' | 'declined';
  companions: number;
  dietary?: string;
}

export default function RSVPForm() {
  const [step, setStep] = useState<StepType>('search');
  const [selectedGuestCount, setSelectedGuestCount] = useState<number>(1);
  
  // Dynamic Guest Search Slots (up to 5)
  const [guestSlots, setGuestSlots] = useState<GuestSearchSlot[]>([
    { id: 1, firstName: '', lastName: '', status: 'waiting', foundGuest: null, errorMessage: null }
  ]);

  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // RSVP Form States for verified guests
  const [guestCountMap, setGuestCountMap] = useState<Record<string, number>>({});
  const [dietaryMap, setDietaryMap] = useState<Record<string, string>>({});
  const [confettiList, setConfettiList] = useState<{ id: number; style: React.CSSProperties }[]>([]);
  
  // Track all invitations confirmed or declined in this active user session
  const [sessionConfirmed, setSessionConfirmed] = useState<SessionConfirmedItem[]>([]);

  // Rate limiting / security state
  const [failedSearchAttempts, setFailedSearchAttempts] = useState<number>(0);
  const [isRateLimited, setIsRateLimited] = useState<boolean>(false);

  // Dietary restriction quick tags
  const dietaryOptions = ['Ninguna', 'Vegetariano', 'Vegano', 'Celíaco / Sin Gluten', 'Sin Lactosa'];

  // Handle changing the number of guest slots (1 to 5)
  const handleGuestCountChange = (count: number) => {
    setSelectedGuestCount(count);
    setGuestSlots(prev => {
      const newSlots: GuestSearchSlot[] = [];
      for (let i = 1; i <= count; i++) {
        const existing = prev.find(s => s.id === i);
        if (existing) {
          newSlots.push(existing);
        } else {
          newSlots.push({ id: i, firstName: '', lastName: '', status: 'waiting', foundGuest: null, errorMessage: null });
        }
      }
      return newSlots;
    });
  };

  // Update input fields for a specific guest slot
  const updateSlotField = (id: number, field: 'firstName' | 'lastName', value: string) => {
    setGuestSlots(prev => prev.map(slot => {
      if (slot.id === id) {
        return {
          ...slot,
          [field]: value,
          // Reset status to waiting if user changes inputs after search
          status: slot.status === 'not-found' ? 'waiting' : slot.status,
          errorMessage: slot.status === 'not-found' ? null : slot.errorMessage
        };
      }
      return slot;
    }));
  };

  // Execute exact match search for all filled guest slots
  const handleSearch = async () => {
    if (isRateLimited) return;

    // Check rate limiting (security rule)
    if (failedSearchAttempts >= 10) {
      setIsRateLimited(true);
      setTimeout(() => {
        setIsRateLimited(false);
        setFailedSearchAttempts(0);
      }, 15000);
      return;
    }

    const validSlotsToSearch = guestSlots.filter(s => s.firstName.trim() && s.lastName.trim());
    if (validSlotsToSearch.length === 0) return;

    setIsSearching(true);

    // Set status to searching for active slots
    setGuestSlots(prev => prev.map(s => {
      if (s.firstName.trim() && s.lastName.trim()) {
        return { ...s, status: 'searching', errorMessage: null };
      }
      return s;
    }));

    try {
      let dbGuests: Guest[] = [];

      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.from('guests').select('*');
        if (data) dbGuests = data as Guest[];
      }

      let totalFailedInThisSearch = 0;

      const updatedSlots = await Promise.all(guestSlots.map(async (slot) => {
        const fName = slot.firstName.trim();
        const lName = slot.lastName.trim();

        if (!fName || !lName) {
          return slot;
        }

        const target = normalizeString(`${fName} ${lName}`);
        let matched: Guest | null = null;

        // Exact match comparison against Supabase or LocalDB records
        if (dbGuests.length > 0) {
          matched = dbGuests.find(g => {
            const normFull = normalizeString(g.full_name);
            const normSansAmp = normalizeString(g.full_name.replace(/&/g, ' '));
            return normFull === target || normSansAmp === target;
          }) || null;
        }

        if (!matched) {
          matched = localDB.findExactGuestByFirstAndLastName(fName, lName);
        }

        if (matched) {
          return {
            ...slot,
            status: 'found' as SlotStatus,
            foundGuest: matched,
            errorMessage: null
          };
        } else {
          totalFailedInThisSearch++;
          return {
            ...slot,
            status: 'not-found' as SlotStatus,
            foundGuest: null,
            errorMessage: 'Invitation not found. Please verify that the first name and last name are spelled exactly as shown on your invitation.'
          };
        }
      }));

      setGuestSlots(updatedSlots);

      if (totalFailedInThisSearch > 0) {
        setFailedSearchAttempts(prev => prev + totalFailedInThisSearch);
      }

      // Initialize default guest counts and dietary preferences for found guests
      const newGuestCountMap: Record<string, number> = { ...guestCountMap };
      const newDietaryMap: Record<string, string> = { ...dietaryMap };

      updatedSlots.forEach(s => {
        if (s.foundGuest) {
          if (!newGuestCountMap[s.foundGuest.id]) {
            newGuestCountMap[s.foundGuest.id] = 1 + (s.foundGuest.companions_count || 0);
          }
          if (newDietaryMap[s.foundGuest.id] === undefined) {
            newDietaryMap[s.foundGuest.id] = s.foundGuest.dietary_restrictions || '';
          }
        }
      });

      setGuestCountMap(newGuestCountMap);
      setDietaryMap(newDietaryMap);

    } catch (err) {
      console.error('Error verifying invitation lookup:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Check if at least one guest has been successfully found
  const foundGuestsList = guestSlots.filter(s => s.status === 'found' && s.foundGuest).map(s => s.foundGuest!);
  const hasAtLeastOneFound = foundGuestsList.length > 0;

  // Proceed to RSVP confirmation step with verified guests
  const handleProceedToRSVP = () => {
    if (!hasAtLeastOneFound) return;
    setStep('found');
  };

  const triggerConfetti = () => {
    const colors = ['#d4af37', '#e9c349', '#ffe088', '#735c00', '#faf9f6', '#ffffff'];
    const newConfetti = Array.from({ length: 80 }).map((_, i) => {
      const size = Math.random() * 9 + 4;
      return {
        id: Date.now() + i,
        style: {
          width: `${size}px`,
          height: `${size}px`,
          left: `${Math.random() * 100}%`,
          backgroundColor: colors[Math.floor(Math.random() * colors.length)],
          animationDelay: `${Math.random() * 1.5}s`,
          animationDuration: `${Math.random() * 3 + 3.5}s`,
          opacity: Math.random() * 0.7 + 0.3,
          borderRadius: Math.random() > 0.4 ? '50%' : '2px',
        } as React.CSSProperties
      };
    });
    setConfettiList(newConfetti);
  };

  // Submit RSVP Confirmation (Confirm all found guests)
  const handleConfirmAll = async () => {
    if (foundGuestsList.length === 0) return;
    setIsSubmitting(true);

    try {
      for (const guest of foundGuestsList) {
        const count = guestCountMap[guest.id] || 1;
        const companionsCount = Math.max(0, count - 1);
        const dietaryPref = dietaryMap[guest.id] || '';

        if (isSupabaseConfigured && supabase) {
          await supabase
            .from('guests')
            .update({
              status: 'confirmed',
              companions_count: companionsCount,
              dietary_restrictions: dietaryPref || undefined,
              invitation_opened: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', guest.id);

          await supabase.from('activity_logs').insert([{
            action_type: 'invitation_accepted',
            user_name: guest.full_name,
            details: `${guest.full_name} confirmó asistencia (${count} persona/s)`
          }]);

          await supabase.from('notifications').insert([{
            title: 'Nueva confirmación de asistencia',
            message: `${guest.full_name} ha confirmado asistencia con ${companionsCount} acompañante(s).`,
            type: 'success'
          }]);
        } else {
          localDB.updateGuestRSVP(guest.id, 'confirmed', companionsCount, dietaryPref);
        }

        setSessionConfirmed(prev => [
          ...prev.filter(item => item.guest.id !== guest.id),
          { guest, status: 'confirmed', companions: companionsCount, dietary: dietaryPref }
        ]);
      }

      setStep('success');
      triggerConfetti();
    } catch (err) {
      console.error('Error al actualizar confirmación:', err);
      for (const guest of foundGuestsList) {
        const count = guestCountMap[guest.id] || 1;
        const companionsCount = Math.max(0, count - 1);
        const dietaryPref = dietaryMap[guest.id] || '';
        localDB.updateGuestRSVP(guest.id, 'confirmed', companionsCount, dietaryPref);
        setSessionConfirmed(prev => [
          ...prev.filter(item => item.guest.id !== guest.id),
          { guest, status: 'confirmed', companions: companionsCount, dietary: dietaryPref }
        ]);
      }
      setStep('success');
      triggerConfetti();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit RSVP Decline for verified guests
  const handleDeclineAll = async () => {
    if (foundGuestsList.length === 0) return;
    setIsSubmitting(true);

    try {
      for (const guest of foundGuestsList) {
        if (isSupabaseConfigured && supabase) {
          await supabase
            .from('guests')
            .update({
              status: 'declined',
              invitation_opened: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', guest.id);

          await supabase.from('activity_logs').insert([{
            action_type: 'invitation_declined',
            user_name: guest.full_name,
            details: `${guest.full_name} declinó la invitación`
          }]);

          await supabase.from('notifications').insert([{
            title: 'Invitación declinada',
            message: `${guest.full_name} no podrá asistir a la boda.`,
            type: 'warning'
          }]);
        } else {
          localDB.updateGuestRSVP(guest.id, 'declined', 0);
        }

        setSessionConfirmed(prev => [
          ...prev.filter(item => item.guest.id !== guest.id),
          { guest, status: 'declined', companions: 0 }
        ]);
      }

      setStep('decline');
    } catch (err) {
      console.error('Error al guardar declinación:', err);
      for (const guest of foundGuestsList) {
        localDB.updateGuestRSVP(guest.id, 'declined', 0);
        setSessionConfirmed(prev => [
          ...prev.filter(item => item.guest.id !== guest.id),
          { guest, status: 'declined', companions: 0 }
        ]);
      }
      setStep('decline');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetSearch = () => {
    setGuestSlots([
      { id: 1, firstName: '', lastName: '', status: 'waiting', foundGuest: null, errorMessage: null }
    ]);
    setSelectedGuestCount(1);
    setGuestCountMap({});
    setDietaryMap({});
    setConfettiList([]);
    setStep('search');
  };

  return (
    <div className="shimmer-bg text-on-background font-body-md min-h-screen flex flex-col relative overflow-hidden">
      <Navbar variant="rsvp" />

      {/* Main Canvas */}
      <main className="flex-grow flex items-center justify-center pt-36 pb-24 px-4 sm:px-gutter relative overflow-hidden">
        {/* Ambient Background Circles */}
        <div className="absolute inset-0 pointer-events-none opacity-25 flex justify-center items-center">
          <div className="w-[700px] h-[700px] sm:w-[900px] sm:h-[900px] border-[0.5px] border-primary/20 rounded-full absolute animate-pulse-glow"></div>
          <div className="w-[1000px] h-[1000px] sm:w-[1200px] sm:h-[1200px] border-[0.5px] border-primary/10 rounded-full absolute"></div>
        </div>

        <div className="w-full max-w-[760px] z-10 mx-auto" id="rsvp-container">
          
          {/* Step Indicator Header */}
          <div className="flex items-center justify-center gap-3 sm:gap-6 mb-8 text-center">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-label-caps tracking-widest transition-all duration-300 ${
              step === 'search'
                ? 'bg-primary text-on-primary shadow-sm font-semibold' 
                : 'bg-surface-container-high/80 text-secondary dark:bg-surface-dim/80'
            }`}>
              <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">1</span>
              <span>VERIFICACIÓN</span>
            </div>
            
            <div className="w-6 sm:w-10 h-[1px] bg-primary/30"></div>

            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-label-caps tracking-widest transition-all duration-300 ${
              step === 'found'
                ? 'bg-primary text-on-primary shadow-sm font-semibold' 
                : 'bg-surface-container-high/80 text-secondary dark:bg-surface-dim/80'
            }`}>
              <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">2</span>
              <span>CONFIRMACIÓN</span>
            </div>

            <div className="w-6 sm:w-10 h-[1px] bg-primary/30"></div>

            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-label-caps tracking-widest transition-all duration-300 ${
              step === 'success' || step === 'decline'
                ? 'bg-primary text-on-primary shadow-sm font-semibold' 
                : 'bg-surface-container-high/80 text-secondary dark:bg-surface-dim/80'
            }`}>
              <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">3</span>
              <span>LISTO</span>
            </div>
          </div>

          {/* STEP 1: INVITATION LOOKUP SYSTEM */}
          {(step === 'search') && (
            <section className="animate-card bg-surface dark:bg-surface-dim p-8 sm:p-14 md:p-16 text-center champagne-shadow border border-primary/20 rounded-2xl relative overflow-hidden backdrop-blur-md">
              {/* Top Accent Line */}
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-primary-container/70 to-transparent"></div>
              
              <span className="material-symbols-outlined mb-6 block text-5xl sm:text-6xl text-primary/80 animate-float-y">
                local_florist
              </span>

              <h1 className="font-display-lg text-3xl sm:text-4xl md:text-5xl mb-4 text-primary dark:text-primary-fixed tracking-[0.12em] uppercase font-light">
                Verificación de Invitación
              </h1>
              
              <div className="decorative-line mb-8"></div>
              
              <p className="font-body-lg text-secondary dark:text-on-surface-variant/90 mb-8 max-w-[520px] mx-auto font-light leading-relaxed text-sm sm:text-base">
                Ingresa el nombre y apellido exactos tal como figuran en tu tarjeta de invitación para verificar la asistencia.
              </p>

              {/* Number of Guests Selector (1 to 5 Guests) */}
              <div className="mb-10 max-w-[480px] mx-auto">
                <label className="block font-label-caps text-xs text-outline dark:text-outline-variant mb-3 text-center uppercase tracking-wider font-semibold">
                  ¿Cuántas invitaciones deseas verificar?
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => handleGuestCountChange(count)}
                      className={`py-3 px-1.5 rounded-xl text-xs font-label-caps font-semibold text-center transition-all border ${
                        selectedGuestCount === count
                          ? 'bg-primary text-on-primary border-primary shadow-sm scale-[1.03]'
                          : 'border-outline-variant/40 bg-surface-container-lowest dark:bg-surface-container-highest/20 text-on-surface hover:border-primary/40'
                      }`}
                    >
                      {count} {count === 1 ? 'Invitado' : 'Invitados'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Guest Search Cards */}
              <div className="space-y-6 max-w-[500px] mx-auto mb-10 text-left">
                {guestSlots.map((slot) => (
                  <div 
                    key={slot.id} 
                    className="p-6 rounded-2xl border border-outline-variant/40 bg-surface-container-low/60 dark:bg-surface-container-highest/20 backdrop-blur-xs transition-all"
                  >
                    <div className="flex items-center justify-between mb-4 border-b border-outline-variant/20 pb-3">
                      <span className="font-label-caps text-xs text-primary dark:text-primary-fixed tracking-widest uppercase font-bold">
                        Invitado {slot.id}
                      </span>
                      
                      {/* Status Indicator Per Guest */}
                      <div className="flex items-center gap-1.5" role="status" aria-live="polite">
                        {slot.status === 'waiting' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-high text-secondary text-[11px] font-label-caps">
                            <span className="material-symbols-outlined text-sm opacity-60">hourglass_empty</span>
                            <span>Esperando</span>
                          </span>
                        )}
                        {slot.status === 'searching' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-label-caps font-semibold">
                            <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                            <span>Verificando...</span>
                          </span>
                        )}
                        {slot.status === 'found' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-label-caps font-bold border border-emerald-500/20">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            <span>Invitación Encontrada</span>
                          </span>
                        )}
                        {slot.status === 'not-found' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] font-label-caps font-bold border border-rose-500/20">
                            <span className="material-symbols-outlined text-sm">cancel</span>
                            <span>No Encontrada</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-label-caps text-secondary mb-1 uppercase tracking-wider font-semibold">
                          First Name / Nombre <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          autoComplete="off"
                          value={slot.firstName}
                          onChange={(e) => updateSlotField(slot.id, 'firstName', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                          placeholder="Ej. Sofia"
                          className="modern-input w-full bg-transparent py-2.5 px-3 font-body-md text-on-surface text-sm outline-none focus:ring-0 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-label-caps text-secondary mb-1 uppercase tracking-wider font-semibold">
                          Last Name / Apellido <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          autoComplete="off"
                          value={slot.lastName}
                          onChange={(e) => updateSlotField(slot.id, 'lastName', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                          placeholder="Ej. García"
                          className="modern-input w-full bg-transparent py-2.5 px-3 font-body-md text-on-surface text-sm outline-none focus:ring-0 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Exact Error Message Display (Strict Security Rule) */}
                    {slot.status === 'not-found' && slot.errorMessage && (
                      <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-body-md leading-relaxed flex items-start gap-2" role="alert">
                        <span className="material-symbols-outlined text-base shrink-0 mt-0.5">error_outline</span>
                        <span>{slot.errorMessage}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Security Rate Limit Alert */}
              {isRateLimited && (
                <div className="mb-6 max-w-[500px] mx-auto p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs text-center font-label-caps">
                  Demasiados intentos fallidos. Por favor espera unos segundos antes de intentar nuevamente.
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-4 max-w-[400px] mx-auto">
                <button 
                  disabled={isSearching || isRateLimited || guestSlots.every(s => !s.firstName.trim() || !s.lastName.trim())}
                  className="btn-premium btn-shine hover:scale-105 transition-all duration-300 bg-primary text-on-primary px-8 py-4 font-label-caps text-[11px] sm:text-xs tracking-[0.25em] w-full flex items-center justify-center gap-3 rounded-xl shadow-md disabled:opacity-40 font-bold" 
                  onClick={handleSearch}
                >
                  {isSearching ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                      <span>BUSCANDO INVITACIONES...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">verified</span>
                      <span>SEARCH INVITATIONS / BUSCAR INVITACIONES</span>
                    </>
                  )}
                </button>

                {/* Continue Button Enabled if at least one guest is found */}
                {hasAtLeastOneFound && (
                  <button
                    onClick={handleProceedToRSVP}
                    className="btn-premium w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 px-6 font-label-caps text-xs tracking-[0.2em] rounded-xl shadow-md font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <span>CONTINUAR CON LA ASISTENCIA ({foundGuestsList.length}) →</span>
                  </button>
                )}
              </div>

              {/* Active Session Summary */}
              {sessionConfirmed.length > 0 && (
                <div className="mt-12 pt-8 border-t border-outline-variant/20 max-w-md mx-auto text-left">
                  <p className="font-label-caps text-[11px] text-outline mb-3 tracking-widest uppercase font-semibold text-center">
                    ✓ Invitaciones procesadas en esta sesión ({sessionConfirmed.length})
                  </p>
                  <div className="space-y-2">
                    {sessionConfirmed.map(item => (
                      <div key={item.guest.id} className="flex items-center justify-between bg-surface-container-low/70 dark:bg-surface-container-highest/30 px-4 py-2.5 rounded-xl text-xs">
                        <span className="font-semibold text-primary">{item.guest.full_name}</span>
                        <span className={`px-2.5 py-0.5 rounded-full font-label-caps text-[10px] font-bold ${
                          item.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                        }`}>
                          {item.status === 'confirmed' ? `Confirmado (${item.companions + 1})` : 'Declinado'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* STEP 2: RSVP CONFIRMATION FOR VERIFIED GUESTS */}
          {(step === 'found' && hasAtLeastOneFound) && (
            <section className="animate-card bg-surface dark:bg-surface-dim p-8 sm:p-12 md:p-16 text-center champagne-shadow border border-primary/20 rounded-2xl relative backdrop-blur-md">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-primary-container/70 to-transparent"></div>

              <div className="mb-6 inline-flex p-4 rounded-full bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-5xl opacity-90">mark_email_read</span>
              </div>

              <h2 className="font-display-lg text-2xl sm:text-3xl md:text-4xl mb-3 text-primary dark:text-primary-fixed uppercase tracking-widest font-light">
                Invitación(es) Verificada(s)
              </h2>
              
              <div className="decorative-line mb-8"></div>

              {/* Cards for each verified guest */}
              <div className="space-y-6 max-w-md mx-auto mb-10 text-left">
                {foundGuestsList.map((guest) => {
                  return (
                    <div 
                      key={guest.id}
                      className="bg-surface-container-low/80 dark:bg-surface-container-highest/30 p-6 rounded-2xl border border-outline-variant/30 backdrop-blur-xs"
                    >
                      <div className="text-center">
                        <p className="font-body-lg text-secondary dark:text-on-surface-variant text-xs mb-1 uppercase tracking-wider font-label-caps font-semibold">
                          Invitado Registrado
                        </p>
                        
                        <h3 className="font-display-lg text-2xl sm:text-3xl text-primary-container dark:text-inverse-primary font-normal leading-tight">
                          {guest.full_name}
                        </h3>
                        
                        {guest.nickname && (
                          <span className="inline-block mt-1 px-3 py-0.5 bg-primary/10 text-primary text-xs font-label-caps rounded-full border border-primary/20 tracking-wider">
                            Conocido como: &quot;{guest.nickname}&quot;
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-md mx-auto">
                <button 
                  disabled={isSubmitting}
                  className="btn-premium btn-shine flex-1 bg-primary text-on-primary py-4 px-6 font-label-caps text-[11px] sm:text-xs tracking-[0.2em] rounded-xl shadow-md font-bold disabled:opacity-50 flex items-center justify-center gap-2" 
                  onClick={handleConfirmAll}
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                      <span>GUARDANDO...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">check_circle</span>
                      <span>CONFIRMAR ASISTENCIA</span>
                    </>
                  )}
                </button>
                
                <button 
                  disabled={isSubmitting}
                  className="btn-premium flex-1 border border-outline-variant/60 text-secondary hover:text-on-surface py-4 px-6 font-label-caps text-[11px] sm:text-xs tracking-[0.2em] hover:bg-surface-container-low rounded-xl font-semibold disabled:opacity-50" 
                  onClick={handleDeclineAll}
                >
                  NO PODRÉ ASISTIR
                </button>
              </div>

              <div className="mt-8">
                <button 
                  onClick={() => setStep('search')}
                  className="font-label-caps text-[11px] text-outline hover:text-primary transition-colors tracking-widest underline decoration-outline-variant/40 underline-offset-4"
                >
                  ← VERIFICAR OTRA INVITACIÓN
                </button>
              </div>
            </section>
          )}

          {/* STEP 3: SUCCESS CONFIRMATION */}
          {(step === 'success') && (
            <section className="animate-card bg-surface dark:bg-surface-dim p-8 sm:p-14 md:p-16 text-center champagne-shadow border border-primary/20 rounded-2xl relative overflow-hidden backdrop-blur-md">
              {/* Top Golden Accent */}
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-primary-container to-transparent"></div>
              
              {/* Dynamic Confetti elements */}
              {confettiList.map((c) => (
                <div key={c.id} className="confetti animate-fall" style={c.style} />
              ))}

              <div className="mb-6 inline-flex p-4 rounded-full bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-5xl animate-bounce">favorite</span>
              </div>

              <h2 className="font-display-lg text-3xl sm:text-4xl md:text-5xl mb-4 text-primary dark:text-primary-fixed leading-tight font-light uppercase tracking-tight">
                ¡Gracias por Confirmar!
              </h2>
              
              <div className="decorative-line mb-8"></div>
              
              <p className="font-body-lg text-secondary dark:text-on-surface-variant mb-10 max-w-[460px] mx-auto font-light italic text-sm sm:text-base leading-relaxed">
                &quot;Estamos inmensamente felices de que nos acompañes a celebrar el día más especial de nuestras vidas.&quot;
              </p>

              {/* Confirmation Details Card for all confirmed guests */}
              <div className="bg-surface-container-low/90 dark:bg-surface-container-highest/30 p-6 sm:p-8 text-center mx-auto max-w-[460px] mb-10 border border-outline-variant/30 rounded-2xl shadow-xs">
                <div className="flex justify-between items-center border-b border-outline-variant/30 pb-4 mb-4">
                  <p className="font-label-caps text-[11px] text-outline dark:text-outline-variant tracking-[0.3em] uppercase font-bold">
                    Resumen de Confirmación
                  </p>
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-label-caps text-[10px] font-bold rounded-full border border-emerald-500/20">
                    ✓ CONFIRMADO
                  </span>
                </div>

                <div className="space-y-4 text-xs sm:text-sm">
                  {foundGuestsList.map(guest => {
                    return (
                      <div key={guest.id} className="border-b border-outline-variant/20 pb-3 text-left">
                        <p className="font-body-md text-on-surface flex justify-between font-semibold text-primary">
                          <span>{guest.full_name}</span>
                          <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">Confirmado/a</span>
                        </p>
                      </div>
                    );
                  })}

                  <p className="font-body-md text-on-surface flex justify-between pt-1">
                    <span className="text-secondary font-light">Fecha de la Boda:</span>
                    <span className="font-semibold text-on-surface">20 de Diciembre, 2026</span>
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-4 max-w-md mx-auto mb-8">
                <button 
                  onClick={resetSearch}
                  className="btn-premium btn-shine w-full bg-primary text-on-primary py-4 px-6 font-label-caps text-xs tracking-[0.2em] rounded-xl shadow-md font-bold"
                >
                  🔍 BUSCAR OTRA INVITACIÓN / SEARCH INVITATIONS
                </button>
              </div>

              <div className="pt-4 border-t border-outline-variant/20">
                <Link 
                  href="/"
                  className="font-label-caps text-xs text-secondary hover:text-primary transition-all tracking-[0.2em] underline decoration-outline-variant/40 underline-offset-4"
                >
                  VER DETALLES DE LA BODA
                </Link>
              </div>
            </section>
          )}

          {/* STEP 3b: DECLINE SCREEN */}
          {(step === 'decline') && (
            <section className="animate-card bg-surface dark:bg-surface-dim p-8 sm:p-14 md:p-16 text-center champagne-shadow border border-outline-variant/30 rounded-2xl relative backdrop-blur-md">
              <div className="mb-6 inline-flex p-4 rounded-full bg-surface-container-high text-outline">
                <span className="material-symbols-outlined text-5xl">mail</span>
              </div>
              
              <h2 className="font-display-lg text-3xl sm:text-4xl mb-4 text-primary dark:text-primary-fixed font-light tracking-wide uppercase">
                Te Extrañaremos
              </h2>
              
              <div className="decorative-line mb-8"></div>
              
              <p className="font-body-lg text-secondary dark:text-on-surface-variant mb-10 max-w-[460px] mx-auto font-light text-sm sm:text-base leading-relaxed">
                Gracias por informarnos. Tu respuesta ha sido guardada.
              </p>
              
              <div className="space-y-4 max-w-md mx-auto">
                <button 
                  className="btn-premium w-full bg-primary text-on-primary px-8 py-4 font-label-caps text-xs tracking-[0.2em] rounded-xl font-bold shadow-md" 
                  onClick={resetSearch}
                >
                  🔍 BUSCAR OTRA INVITACIÓN / SEARCH INVITATIONS
                </button>
              </div>
            </section>
          )}

        </div>
      </main>

      <Footer variant="rsvp" />
    </div>
  );
}
