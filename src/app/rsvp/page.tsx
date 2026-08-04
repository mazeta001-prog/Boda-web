"use client";

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase, isSupabaseConfigured, normalizeString } from '@/lib/supabaseClient';
import { Guest } from '@/types/database';
import RSVPCountdown from '@/components/RSVPCountdown';
import { getFormattedGuestDisplayName, matchGuestSearch } from '@/lib/guestUtils';

type StepType = 'search' | 'found' | 'success' | 'decline';
type SlotStatus = 'waiting' | 'searching' | 'found' | 'ambiguous' | 'not-found';

interface GuestSearchSlot {
  id: number;
  firstName: string;
  lastName: string;
  status: SlotStatus;
  foundGuest: Guest | null;
  candidateGuests?: Guest[];
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
  const [isRSVPExpired, setIsRSVPExpired] = useState(false);
  
  // Dynamic Guest Search Slots (up to 5)
  const [guestSlots, setGuestSlots] = useState<GuestSearchSlot[]>([
    { id: 1, firstName: '', lastName: '', status: 'waiting', foundGuest: null, candidateGuests: [], errorMessage: null }
  ]);

  const [allDbGuests, setAllDbGuests] = useState<Guest[]>([]);
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

  // Issue Report Modal States
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [issueName, setIssueName] = useState('');
  const [issuePhone, setIssuePhone] = useState('');
  const [issueComment, setIssueComment] = useState('');
  const [isIssueSubmitting, setIsIssueSubmitting] = useState(false);
  const [isIssueSuccess, setIsIssueSuccess] = useState(false);

  // Submit issue report to Novios' Dashboard & notifications
  const handleReportIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueName.trim() || !issuePhone.trim() || !issueComment.trim()) return;

    setIsIssueSubmitting(true);

    try {
      if (isSupabaseConfigured && supabase) {
        await Promise.allSettled([
          supabase.from('notifications').insert([{
            title: '⚠️ Soporte de Invitados',
            message: `${issueName.trim()} reportó un problema: "${issueComment.trim()}". Contacto WhatsApp: ${issuePhone.trim()}`,
            type: 'warning'
          }]),
          supabase.from('activity_logs').insert([{
            action_type: 'invitation_declined',
            user_name: issueName.trim(),
            details: `Reportó problema con su invitación: "${issueComment.trim()}" (WhatsApp: ${issuePhone.trim()})`
          }])
        ]);
      }

      setIsIssueSuccess(true);
    } catch (err) {
      console.error('Error reporting issue:', err);
      setIsIssueSuccess(true);
    } finally {
      setIsIssueSubmitting(false);
    }
  };

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
          newSlots.push({ id: i, firstName: '', lastName: '', status: 'waiting', foundGuest: null, candidateGuests: [], errorMessage: null });
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
          status: (slot.status === 'not-found' || slot.status === 'ambiguous') ? 'waiting' : slot.status,
          candidateGuests: [],
          errorMessage: null
        };
      }
      return slot;
    }));
  };

  // Handler when user selects their nickname from candidate options
  const handleSelectCandidate = (slotId: number, guest: Guest) => {
    const displayName = getFormattedGuestDisplayName(guest, allDbGuests);
    const nameParts = displayName.trim().split(' ');
    const autoFirstName = nameParts[0] || guest.full_name;
    const autoLastName = nameParts.slice(1).join(' ') || '';

    setGuestSlots(prev => prev.map(s => {
      if (s.id === slotId) {
        return {
          ...s,
          firstName: autoFirstName,
          lastName: autoLastName,
          status: 'found',
          foundGuest: guest,
          candidateGuests: [],
          errorMessage: null
        };
      }
      return s;
    }));

    setGuestCountMap(prev => ({
      ...prev,
      [guest.id]: prev[guest.id] || 1 + (guest.companions_count || 0)
    }));

    setDietaryMap(prev => ({
      ...prev,
      [guest.id]: prev[guest.id] !== undefined ? prev[guest.id] : (guest.dietary_restrictions || '')
    }));
  };

  // Execute search for guest slots (Exact match -> Flexible token match -> Ambiguous Candidate Selection)
  const handleSearch = async () => {
    if (isRateLimited) return;

    if (failedSearchAttempts >= 10) {
      setIsRateLimited(true);
      setTimeout(() => {
        setIsRateLimited(false);
        setFailedSearchAttempts(0);
      }, 15000);
      return;
    }

    const validSlotsToSearch = guestSlots.filter(s => s.firstName.trim() || s.lastName.trim());
    if (validSlotsToSearch.length === 0) return;

    setIsSearching(true);

    setGuestSlots(prev => prev.map(s => {
      if (s.firstName.trim() || s.lastName.trim()) {
        return { ...s, status: 'searching', errorMessage: null, candidateGuests: [] };
      }
      return s;
    }));

    try {
      let dbGuests: Guest[] = [];

      if (isSupabaseConfigured && supabase) {
        const { data, error: fetchErr } = await supabase.from('guests').select('*');
        if (fetchErr) {
          console.error('Error fetching guests from Supabase:', fetchErr.message);
        } else if (data) {
          dbGuests = data as Guest[];
          setAllDbGuests(dbGuests);
        }
      }

      let totalFailedInThisSearch = 0;

      const updatedSlots = await Promise.all(guestSlots.map(async (slot) => {
        const fName = slot.firstName.trim();
        const lName = slot.lastName.trim();
        const fullQuery = `${fName} ${lName}`.trim();

        if (!fullQuery) {
          totalFailedInThisSearch++;
          return {
            ...slot,
            status: 'not-found' as SlotStatus,
            foundGuest: null,
            candidateGuests: [],
            errorMessage: 'Por favor ingresa tu nombre o apellido para verificar tu invitación.'
          };
        }

        // 1. Flexible & Token-based Name matching logic
        const allMatches = dbGuests.filter(g => matchGuestSearch(g, fName, lName));

        // 2. Candidate disambiguation logic (excluding tentative & not_sent / unsent guests)
        const validRSVPGuests = allMatches.filter(g => g.status !== 'tentative' && g.status !== 'not_sent');

        // Case A: No valid RSVP matches at all
        if (validRSVPGuests.length === 0) {
          totalFailedInThisSearch++;
          return {
            ...slot,
            status: 'not-found' as SlotStatus,
            foundGuest: null,
            candidateGuests: [],
            errorMessage: `No encontramos una invitación para "${fullQuery}". Por favor verifica la ortografía.`
          };
        }

        const unclaimed = validRSVPGuests.filter(g => g.status === 'pending');
        // Prioritize pending (unclaimed) invitations, or fallback to all matching valid invitations
        const activeMatches = unclaimed.length > 0 ? unclaimed : validRSVPGuests;

        // Case B: Exactly 1 candidate remaining -> Auto-select!
        if (activeMatches.length === 1) {
          const matchedGuest = activeMatches[0];
          const displayName = getFormattedGuestDisplayName(matchedGuest, dbGuests);
          const nameParts = displayName.trim().split(' ');
          return {
            ...slot,
            firstName: nameParts[0] || matchedGuest.full_name,
            lastName: nameParts.slice(1).join(' ') || '',
            status: 'found' as SlotStatus,
            foundGuest: matchedGuest,
            candidateGuests: [],
            errorMessage: null
          };
        }

        // Case C: Multiple matching candidates (e.g. 2+ guests with exact same name or same first name/apodo)
        // Show apodo options so the user can identify themselves with ¡SOY YO!
        return {
          ...slot,
          status: 'ambiguous' as SlotStatus,
          foundGuest: null,
          candidateGuests: activeMatches,
          errorMessage: null
        };
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
          const { error: updateErr } = await supabase
            .from('guests')
            .update({
              status: 'confirmed',
              companions_count: companionsCount,
              dietary_restrictions: dietaryPref || undefined,
              invitation_opened: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', guest.id);

          if (updateErr) throw updateErr;

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
        }

        setSessionConfirmed(prev => [
          ...prev.filter(item => item.guest.id !== guest.id),
          { guest, status: 'confirmed', companions: companionsCount, dietary: dietaryPref }
        ]);
      }

      setStep('success');
      triggerConfetti();
    } catch (err: any) {
      console.error('Error al actualizar confirmación en Supabase:', err);
      alert(err.message || 'Ocurrió un error al guardar la confirmación en Supabase. Inténtalo nuevamente.');
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
          const { error: updateErr } = await supabase
            .from('guests')
            .update({
              status: 'declined',
              invitation_opened: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', guest.id);

          if (updateErr) throw updateErr;

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
        }

        setSessionConfirmed(prev => [
          ...prev.filter(item => item.guest.id !== guest.id),
          { guest, status: 'declined', companions: 0 }
        ]);
      }

      setStep('decline');
    } catch (err: any) {
      console.error('Error al guardar declinación en Supabase:', err);
      alert(err.message || 'Ocurrió un error al guardar la respuesta en Supabase. Inténtalo nuevamente.');
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
          <div className="flex items-center justify-center gap-1.5 sm:gap-6 mb-6 sm:mb-8 text-center">
            <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-label-caps tracking-wider sm:tracking-widest transition-all duration-300 ${
              step === 'search'
                ? 'bg-primary text-on-primary shadow-sm font-semibold' 
                : 'bg-surface-container-high/80 text-secondary dark:bg-surface-dim/80'
            }`}>
              <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-current flex items-center justify-center text-[9px] sm:text-[10px]">1</span>
              <span>VERIFICACIÓN</span>
            </div>
            
            <div className="w-3 sm:w-10 h-[1px] bg-primary/30"></div>

            <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-label-caps tracking-wider sm:tracking-widest transition-all duration-300 ${
              step === 'found'
                ? 'bg-primary text-on-primary shadow-sm font-semibold' 
                : 'bg-surface-container-high/80 text-secondary dark:bg-surface-dim/80'
            }`}>
              <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-current flex items-center justify-center text-[9px] sm:text-[10px]">2</span>
              <span>CONFIRMACIÓN</span>
            </div>

            <div className="w-3 sm:w-10 h-[1px] bg-primary/30"></div>

            <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-label-caps tracking-wider sm:tracking-widest transition-all duration-300 ${
              step === 'success' || step === 'decline'
                ? 'bg-primary text-on-primary shadow-sm font-semibold' 
                : 'bg-surface-container-high/80 text-secondary dark:bg-surface-dim/80'
            }`}>
              <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-current flex items-center justify-center text-[9px] sm:text-[10px]">3</span>
              <span>LISTO</span>
            </div>
          </div>

          {/* STEP 1: INVITATION LOOKUP SYSTEM */}
          {(step === 'search') && (
            <section className="animate-card bg-surface dark:bg-surface-dim p-5 sm:p-14 md:p-16 text-center champagne-shadow border border-primary/20 rounded-2xl relative overflow-hidden backdrop-blur-md">
              {/* Top Accent Line */}
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-primary-container/70 to-transparent"></div>
              
              <span className="material-symbols-outlined mb-4 sm:mb-6 block text-4xl sm:text-6xl text-primary/80 animate-float-y">
                local_florist
              </span>

              <h1 className="font-display-lg text-2xl sm:text-4xl md:text-5xl mb-3 sm:mb-4 text-primary dark:text-primary-fixed tracking-[0.08em] sm:tracking-[0.12em] uppercase font-light">
                Verificación de Invitación
              </h1>
              
              <div className="decorative-line mb-6 sm:mb-8"></div>
              
              <p className="font-body-lg text-secondary dark:text-on-surface-variant/90 mb-4 sm:mb-6 max-w-[520px] mx-auto font-light leading-relaxed text-xs sm:text-base">
                Ingresa tu nombre y tu apellido para encontrar tu invitación. Esta invitación es válida únicamente para 1 persona (no se aceptan invitados adicionales).
              </p>

              {/* RSVP Countdown Timer from settings table */}
              <div className="max-w-[520px] mx-auto mb-6 sm:mb-8">
                <RSVPCountdown onExpiredChange={setIsRSVPExpired} />
              </div>

              {/* Number of Guests Selector (1 to 5 Guests) */}
              <div className="mb-8 sm:mb-10 max-w-[480px] mx-auto">
                <label className="block font-label-caps text-[11px] sm:text-xs text-outline dark:text-outline-variant mb-3 text-center uppercase tracking-wider font-semibold">
                  ¿Cuántas invitaciones deseas verificar?
                </label>
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {[1, 2, 3, 4, 5].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => handleGuestCountChange(count)}
                      className={`py-2.5 sm:py-3 px-1 rounded-xl text-xs font-label-caps font-semibold text-center transition-all border flex flex-col items-center justify-center ${
                        selectedGuestCount === count
                          ? 'bg-primary text-on-primary border-primary shadow-sm scale-[1.03]'
                          : 'border-outline-variant/40 bg-surface-container-lowest dark:bg-surface-container-highest/20 text-on-surface hover:border-primary/40'
                      }`}
                    >
                      <span className="text-sm sm:text-base font-bold">{count}</span>
                      <span className="text-[9px] font-normal leading-none hidden sm:inline">{count === 1 ? 'Invitado' : 'Invitados'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Guest Search Cards */}
              <div className="space-y-6 max-w-[500px] mx-auto mb-8 sm:mb-10 text-left">
                {guestSlots.map((slot) => (
                  <div 
                    key={slot.id} 
                    className="p-4 sm:p-6 rounded-2xl border border-outline-variant/40 bg-surface-container-low/60 dark:bg-surface-container-highest/20 backdrop-blur-xs transition-all"
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
                        {slot.status === 'ambiguous' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-label-caps font-bold border border-amber-500/30 animate-pulse">
                            <span className="material-symbols-outlined text-sm">psychology</span>
                            <span>¿Cuál eres tú?</span>
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
                          Nombre <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          autoComplete="off"
                          value={slot.firstName}
                          onChange={(e) => updateSlotField(slot.id, 'firstName', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                          placeholder="Nombre"
                          className="modern-input w-full bg-transparent py-2.5 px-3 font-body-md text-on-surface text-sm outline-none focus:ring-0 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-label-caps text-secondary mb-1 uppercase tracking-wider font-semibold">
                          Apellido <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          autoComplete="off"
                          value={slot.lastName}
                          onChange={(e) => updateSlotField(slot.id, 'lastName', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                          placeholder="Apellido"
                          className="modern-input w-full bg-transparent py-2.5 px-3 font-body-md text-on-surface text-sm outline-none focus:ring-0 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Ambiguous Candidates Selection UI (Nicknames / Apodos) */}
                    {slot.status === 'ambiguous' && slot.candidateGuests && slot.candidateGuests.length > 0 && (
                      <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                          <span className="material-symbols-outlined text-base shrink-0">badge</span>
                          <span>Encontramos varias invitaciones coincidentes. Selecciona tu apodo para identificarte:</span>
                        </div>

                        <div className="space-y-2">
                          {slot.candidateGuests.map((candidate) => (
                            <button
                              key={candidate.id}
                              type="button"
                              onClick={() => handleSelectCandidate(slot.id, candidate)}
                              className="w-full p-3 rounded-xl bg-surface dark:bg-surface-dim border border-outline-variant/40 hover:border-primary hover:bg-primary/5 transition-all text-left flex items-center justify-between group cursor-pointer"
                            >
                              <div className="space-y-1">
                                <p className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">
                                  {getFormattedGuestDisplayName(candidate, allDbGuests.length > 0 ? allDbGuests : (slot.candidateGuests || []))}
                                </p>
                                {candidate.nickname && (
                                  <p className="text-xs text-amber-700 dark:text-amber-300 italic">
                                    Apodo: &quot;{candidate.nickname}&quot;
                                  </p>
                                )}
                                {candidate.category && (
                                  <div className="flex items-center gap-2 flex-wrap text-xs">
                                    <span className="text-secondary text-xs font-medium">
                                      • {candidate.category}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-label-caps text-[10px] font-bold group-hover:scale-105 transition-transform shrink-0 shadow-xs">
                                ¡SOY YO!
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Exact Error Message Display */}
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
                  disabled={isSearching || isRateLimited || isRSVPExpired || guestSlots.every(s => !s.firstName.trim() && !s.lastName.trim())}
                  className="btn-premium btn-shine hover:scale-105 transition-all duration-300 bg-primary text-on-primary px-6 py-4 font-label-caps text-xs tracking-wider sm:tracking-[0.2em] w-full flex items-center justify-center gap-2 sm:gap-3 rounded-xl shadow-md disabled:opacity-40 font-bold" 
                  onClick={handleSearch}
                >
                  {isSearching ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                      <span>VERIFICANDO INVITACIÓN...</span>
                    </>
                  ) : isRSVPExpired ? (
                    <>
                      <span className="material-symbols-outlined text-lg">timer_off</span>
                      <span>CONFIRMACIÓN FINALIZADA</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">verified</span>
                      <span>BUSCAR MI INVITACIÓN</span>
                    </>
                  ) }
                </button>

                {/* Continue Button Enabled if at least one guest is found */}
                {hasAtLeastOneFound && (
                  <button
                    onClick={handleProceedToRSVP}
                    className="btn-premium w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 px-6 font-label-caps text-xs tracking-wider rounded-xl shadow-md font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <span>CONTINUAR CON LA ASISTENCIA ({foundGuestsList.length}) →</span>
                  </button>
                )}

                {/* Report Issue Trigger Button */}
                <div className="pt-3 border-t border-outline-variant/20">
                  <button
                    type="button"
                    onClick={() => {
                      setIsIssueModalOpen(true);
                      setIsIssueSuccess(false);
                    }}
                    className="text-xs text-secondary hover:text-primary transition-colors flex items-center justify-center gap-1.5 mx-auto font-medium cursor-pointer py-1 group"
                  >
                    <span className="material-symbols-outlined text-base text-amber-500 group-hover:scale-110 transition-transform">help_outline</span>
                    <span className="underline decoration-dotted underline-offset-4">¿Tienes problemas con tu invitación? Escríbenos aquí</span>
                  </button>
                </div>
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
                        <span className="font-semibold text-primary">{getFormattedGuestDisplayName(item.guest, allDbGuests)}</span>
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
            <section className="animate-card bg-surface dark:bg-surface-dim p-5 sm:p-12 md:p-16 text-center champagne-shadow border border-primary/20 rounded-2xl relative backdrop-blur-md">
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
                      className="bg-surface-container-low/80 dark:bg-surface-container-highest/30 p-5 sm:p-6 rounded-2xl border border-outline-variant/30 backdrop-blur-xs"
                    >
                      <div className="text-center">
                        <p className="font-body-lg text-secondary dark:text-on-surface-variant text-xs mb-1 uppercase tracking-wider font-label-caps font-semibold">
                          Invitado Registrado
                        </p>
                        
                        <h3 className="font-display-lg text-xl sm:text-3xl text-primary-container dark:text-inverse-primary font-normal leading-tight">
                          {getFormattedGuestDisplayName(guest, allDbGuests)}
                        </h3>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 max-w-md mx-auto">
                <button 
                  disabled={isSubmitting}
                  className="btn-premium btn-shine flex-1 bg-primary text-on-primary py-4 px-6 font-label-caps text-[11px] sm:text-xs tracking-wider sm:tracking-[0.2em] rounded-xl shadow-md font-bold disabled:opacity-50 flex items-center justify-center gap-2" 
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
                  className="btn-premium flex-1 border border-outline-variant/60 text-secondary hover:text-on-surface py-4 px-6 font-label-caps text-[11px] sm:text-xs tracking-wider sm:tracking-[0.2em] hover:bg-surface-container-low rounded-xl font-semibold disabled:opacity-50" 
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
            <section className="animate-card bg-surface dark:bg-surface-dim p-5 sm:p-14 md:p-16 text-center champagne-shadow border border-primary/20 rounded-2xl relative overflow-hidden backdrop-blur-md">
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
                          <span>{getFormattedGuestDisplayName(guest, allDbGuests)}</span>
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

      {/* Report Issue Modal Overlay */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface dark:bg-surface-dim border border-outline-variant/60 rounded-3xl p-5 sm:p-8 max-w-md w-full shadow-2xl relative overflow-hidden text-left animate-card max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                setIsIssueModalOpen(false);
                setIsIssueSuccess(false);
              }}
              className="absolute top-4 right-4 p-2 text-secondary hover:text-on-surface rounded-full transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            {!isIssueSuccess ? (
              <form onSubmit={handleReportIssue} className="space-y-4">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-2xl">support_agent</span>
                  </div>
                  <h3 className="font-display-lg text-xl text-primary font-bold uppercase tracking-wide">
                    ¿Tienes problemas con tu invitación?
                  </h3>
                  <p className="text-xs text-secondary mt-1">
                    Escríbenos tu nombre y lo que sucede. Tu mensaje llegará directamente al equipo de la boda.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-label-caps text-secondary mb-1 uppercase tracking-wider font-semibold">
                    Tu Nombre Completo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={issueName}
                    onChange={(e) => setIssueName(e.target.value)}
                    placeholder="Ej. Sofía García"
                    className="modern-input w-full bg-transparent py-2.5 px-3 font-body-md text-on-surface text-sm outline-none rounded-xl border border-outline-variant/40 focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-label-caps text-secondary mb-1 uppercase tracking-wider font-semibold">
                    Tu Teléfono / WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={issuePhone}
                    onChange={(e) => setIssuePhone(e.target.value)}
                    placeholder="Ej. +1 (829) 669-3870"
                    className="modern-input w-full bg-transparent py-2.5 px-3 font-body-md text-on-surface text-sm outline-none rounded-xl border border-outline-variant/40 focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-label-caps text-secondary mb-1 uppercase tracking-wider font-semibold">
                    Comentario / Detalle del problema <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={issueComment}
                    onChange={(e) => setIssueComment(e.target.value)}
                    placeholder="Explícanos brevemente el problema (ej. no encuentro mi pase, se escribió mal mi apellido...)"
                    className="modern-input w-full bg-transparent py-2.5 px-3 font-body-md text-on-surface text-sm outline-none rounded-xl border border-outline-variant/40 focus:border-primary transition-colors resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isIssueSubmitting || !issueName.trim() || !issuePhone.trim() || !issueComment.trim()}
                    className="btn-premium w-full bg-primary text-on-primary py-3.5 px-6 font-label-caps text-xs tracking-widest rounded-xl font-bold shadow-md disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {isIssueSubmitting ? (
                      <>
                        <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                        <span>ENVIANDO REPORTE...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">send</span>
                        <span>ENVIAR REPORTAR A LOS NOVIOS</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="py-4 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-4xl">check_circle</span>
                </div>
                <h3 className="font-display-lg text-xl text-primary font-bold uppercase tracking-wide">
                  ¡Reporte Enviado!
                </h3>
                <p className="text-xs sm:text-sm text-secondary max-w-xs mx-auto leading-relaxed">
                  Gracias por tu mensaje. Tu reporte ha sido enviado a los novios. Te daremos respuesta en un plazo de <strong className="text-on-surface font-bold">24 a 48 horas</strong>.
                </p>

                <div className="pt-4 border-t border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => {
                      setIsIssueModalOpen(false);
                      setIsIssueSuccess(false);
                    }}
                    className="btn-premium w-full bg-primary text-on-primary py-3.5 px-6 rounded-xl font-bold text-xs font-label-caps tracking-wider cursor-pointer shadow-md"
                  >
                    Entendido / Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Footer variant="rsvp" />
    </div>
  );
}
