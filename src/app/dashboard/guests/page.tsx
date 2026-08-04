"use client";

import { useState, useMemo, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import { useDashboardData } from '@/hooks/useDashboardData';
import { CreateGuestModal } from '@/components/dashboard/CreateGuestModal';
import { EditGuestModal } from '@/components/dashboard/EditGuestModal';
import { DeleteGuestModal } from '@/components/dashboard/DeleteGuestModal';
import { ImportGuestsModal } from '@/components/dashboard/ImportGuestsModal';
import { SettingsModal } from '@/components/dashboard/SettingsModal';
import { generateGuestExcelBuffer } from '@/lib/excelImporter';
import { Guest } from '@/types/database';
import { supabase, isSupabaseConfigured, ensureAdminSession } from '@/lib/supabaseClient';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function GuestManagement() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [activeStatusFilter, setActiveStatusFilter] = useState<'ALL' | 'confirmed' | 'pending' | 'tentative' | 'not_sent' | 'declined'>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Read initial status filter from URL if present e.g. /dashboard/guests?status=confirmed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const statusParam = params.get('status');
      if (statusParam && ['confirmed', 'pending', 'tentative', 'not_sent', 'declined'].includes(statusParam)) {
        setActiveStatusFilter(statusParam as any);
      }
    }
  }, []);

  // WhatsApp Sending & Toast State
  const [sendingGuestId, setSendingGuestId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);

  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [deletingGuest, setDeletingGuest] = useState<Guest | null>(null);

  // Multi-select & Batch Delete States
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && isSupabaseConfigured && !session) {
      router.push('/login');
    }
  }, [authLoading, session, router]);

  const {
    guests,
    loading,
    error,
    createGuest,
    createGuestsBatch,
    updateGuest,
    deleteGuest,
    deleteGuests,
    refetch
  } = useDashboardData();

  // Toast Auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // WhatsApp invitation handler
  const handleSendWhatsApp = async (guest: Guest) => {
    // Validate phone number
    const rawPhone = guest.phone || '';
    const normalizedPhone = rawPhone.replace(/[^0-9]/g, '');

    if (!normalizedPhone || normalizedPhone.trim().length < 6) {
      setToast({
        message: "This guest does not have a registered phone number.",
        type: 'error'
      });
      return;
    }

    setSendingGuestId(guest.id);

    try {
      // Generate personal unique invitation link
      const token = guest.invitation_token || btoa(guest.id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://nuestra-historia.com';
      const invitationUrl = `${baseUrl}/rsvp?token=${token}`;

      // Guest first name for personalized greeting
      const firstName = guest.full_name.trim().split(' ')[0] || guest.full_name;

      // Structured invitation message
      const message = `Hello ${firstName}!

We are excited to invite you to our wedding.

Please confirm your attendance using your personal invitation below:

${invitationUrl}

We can't wait to celebrate with you!`;

      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;

      // Try opening WhatsApp in new browser tab
      const newWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        setToast({
          message: "The browser blocked the popup. Please allow popups to open WhatsApp.",
          type: 'error'
        });
      } else {
        setToast({
          message: `Opening WhatsApp for ${guest.full_name}...`,
          type: 'success'
        });
      }

      // Logging & database update
      if (isSupabaseConfigured && supabase) {
        await ensureAdminSession();
        await supabase.from('guests').update({ invitation_sent: true, updated_at: new Date().toISOString() }).eq('id', guest.id);
        await supabase.from('activity_logs').insert([{
          action_type: 'invitation_sent',
          user_name: 'Administrador (Dana & Ivan)',
          details: `Manual WhatsApp invitation initiated for ${guest.full_name}`,
          created_at: new Date().toISOString()
        }]);
      }

      await refetch();
    } catch (err: any) {
      console.error('Error sending WhatsApp invitation:', err);
      setToast({
        message: err.message || "Error preparing WhatsApp invitation.",
        type: 'error'
      });
    } finally {
      setSendingGuestId(null);
    }
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const officialGuests = guests.filter(g => g.status !== 'tentative');
    const counts = { ALL: officialGuests.length, FAMILIA: 0, AMIGOS: 0, CONOCIDOS: 0 };
    officialGuests.forEach(g => {
      const cat = (g.category || 'AMIGOS').toUpperCase();
      if (cat.includes('FAMIL')) counts.FAMILIA++;
      else if (cat.includes('CONOCI')) counts.CONOCIDOS++;
      else counts.AMIGOS++;
    });
    return counts;
  }, [guests]);

  // Sorting state (default Alphabetical A-Z)
  const [sortOrder, setSortOrder] = useState<'name_asc' | 'name_desc' | 'category' | 'newest'>('name_asc');

  // Live filtered and sorted guests
  const filteredGuests = useMemo(() => {
    let result = guests.filter(g => {
      // Category filter
      if (activeCategory !== 'ALL') {
        const cat = (g.category || 'AMIGOS').toUpperCase();
        if (activeCategory === 'FAMILIA' && !cat.includes('FAMIL')) return false;
        if (activeCategory === 'AMIGOS' && (cat.includes('FAMIL') || cat.includes('CONOCI'))) return false;
        if (activeCategory === 'CONOCIDOS' && !cat.includes('CONOCI')) return false;
      }
      // Status filter
      if (activeStatusFilter !== 'ALL') {
        if (activeStatusFilter === 'not_sent') {
          const isNotSent = g.status === 'not_sent' || (!g.invitation_sent && g.status !== 'confirmed' && g.status !== 'declined' && g.status !== 'tentative');
          if (!isNotSent) return false;
        } else if (g.status !== activeStatusFilter) {
          return false;
        }
      }
      // Search term filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          g.full_name.toLowerCase().includes(q) ||
          (g.nickname && g.nickname.toLowerCase().includes(q)) ||
          (g.email && g.email.toLowerCase().includes(q)) ||
          g.status.toLowerCase().includes(q)
        );
      }
      return true;
    });

    // Alphabetical & Custom Sorting
    return [...result].sort((a, b) => {
      if (sortOrder === 'name_asc') {
        return a.full_name.localeCompare(b.full_name, 'es', { sensitivity: 'base' });
      }
      if (sortOrder === 'name_desc') {
        return b.full_name.localeCompare(a.full_name, 'es', { sensitivity: 'base' });
      }
      if (sortOrder === 'category') {
        return (a.category || '').localeCompare(b.category || '', 'es');
      }
      if (sortOrder === 'newest') {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      }
      return 0;
    });
  }, [guests, activeCategory, activeStatusFilter, searchTerm, sortOrder]);

  // Live status counts
  const statusCounts = useMemo(() => {
    let confirmed = 0;
    let pending = 0;
    let tentative = 0;
    let not_sent = 0;
    let declined = 0;
    guests.forEach(g => {
      if (g.status === 'confirmed') {
        confirmed++;
      } else if (g.status === 'tentative') {
        tentative++;
      } else if (g.status === 'declined') {
        declined++;
      } else if (g.status === 'not_sent' || !g.invitation_sent) {
        not_sent++;
      } else {
        pending++;
      }
    });
    return { confirmed, pending, tentative, not_sent, declined };
  }, [guests]);

  // Excel Export Handler
  const handleExportExcel = () => {
    try {
      const buffer = generateGuestExcelBuffer(guests);
      const blob = new Blob([buffer.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Lista_de_Invitados_Boda_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al exportar a Excel:', err);
    }
  };

  // Multiple guests import handler
  const handleImportGuestsSuccess = async (newGuests: Omit<Guest, 'id' | 'created_at' | 'updated_at'>[]) => {
    if (!newGuests || newGuests.length === 0) return;
    await createGuestsBatch(newGuests);
    if (isSupabaseConfigured && supabase) {
      try {
        await ensureAdminSession();
        await supabase.from('import_logs').insert([{
          filename: 'list defi.xlsx',
          records_imported: newGuests.length,
          imported_by: 'Administrador (Dana & Ivan)'
        }]);
      } catch (logErr) {
        console.warn('No se pudo guardar el registro en import_logs:', logErr);
      }
    }
    await refetch();
  };

  // Selection & Batch Delete Handlers
  const isAllSelected = useMemo(() => {
    return filteredGuests.length > 0 && filteredGuests.every(g => selectedGuestIds.includes(g.id));
  }, [filteredGuests, selectedGuestIds]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedGuestIds([]);
    } else {
      setSelectedGuestIds(filteredGuests.map(g => g.id));
    }
  };

  const handleToggleGuestSelect = (id: string) => {
    setSelectedGuestIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBatchDeleteConfirm = async () => {
    if (selectedGuestIds.length === 0) return;
    setIsBatchDeleting(true);
    try {
      await deleteGuests(selectedGuestIds);
      setToast({
        message: `Se eliminaron ${selectedGuestIds.length} invitados correctamente.`,
        type: 'success'
      });
      setSelectedGuestIds([]);
      setIsBatchDeleteModalOpen(false);
    } catch (err: any) {
      console.error('Error batch deleting guests:', err);
      setToast({
        message: err.message || 'Error al eliminar los invitados seleccionados.',
        type: 'error'
      });
    } finally {
      setIsBatchDeleting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Sidebar Navigation */}
      <Sidebar 
        variant="admin" 
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content */}
      <main className="md:ml-64 flex-1 flex flex-col relative overflow-x-hidden min-w-0">
        {/* Header */}
        <header className="min-h-[64px] bg-surface/80 backdrop-blur-md flex flex-wrap items-center justify-between px-3 sm:px-gutter border-b border-outline-variant sticky top-0 z-10 gap-2.5 py-3">
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 text-secondary hover:text-primary transition-colors bg-surface-container-low rounded-xl touch-target"
              aria-label="Abrir menú"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>
            <div>
              <h2 className="font-headline-sm text-base sm:text-headline-sm text-on-surface font-bold">Gestión de Invitados</h2>
              <p className="text-[12px] text-secondary font-body-md hidden sm:block">Organiza y administra la lista de asistentes a tu gran día.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {/* Search Input */}
            <div className="relative group hidden sm:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
              <input 
                type="text" 
                placeholder="Buscar invitado..." 
                className="pl-9 pr-4 py-1.5 bg-surface-container-low border border-outline-variant rounded-full text-xs font-body-md focus:ring-1 focus:ring-primary focus:border-primary w-48 sm:w-56 transition-all duration-300 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Batch Delete Button (Active when guests selected) */}
            {selectedGuestIds.length > 0 && (
              <button 
                onClick={() => setIsBatchDeleteModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 sm:px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-label-caps text-xs font-bold rounded-xl transition-all shadow-md animate-in fade-in duration-200 min-h-[40px]"
                title="Eliminar invitados seleccionados"
              >
                <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                <span>BORRAR ({selectedGuestIds.length})</span>
              </button>
            )}

            {/* Import Button */}
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 sm:px-4 py-2 border text-primary font-label-caps text-xs hover:bg-primary/5 transition-all duration-200 rounded-xl border-primary-container shadow-2xs font-bold min-h-[40px]"
              title="Importar archivo Excel de invitados"
            >
              <span className="material-symbols-outlined text-[18px]">upload</span>
              <span>IMPORTAR</span>
            </button>

            {/* Export Button */}
            <button 
              onClick={handleExportExcel}
              className="flex items-center space-x-1.5 px-3 sm:px-4 py-2 border text-primary font-label-caps text-xs hover:bg-primary/5 transition-all duration-200 rounded-xl border-primary-container shadow-2xs font-bold min-h-[40px]"
              title="Exportar lista actual a Excel (.xlsx)"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span className="hidden sm:inline">EXPORTAR</span>
            </button>

            {/* Add Guest Button */}
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 sm:px-5 py-2 text-on-primary font-label-caps text-xs font-bold hover:bg-primary-container transition-all duration-200 rounded-xl shadow-xs bg-primary min-h-[40px]"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>AÑADIR INVITADO</span>
            </button>

            {/* Configuración / Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 border text-secondary hover:text-on-surface border-outline-variant/60 hover:bg-surface-container-low transition-all rounded-xl touch-target"
              title="Configuración y Cerrar Sesión"
              aria-label="Configuración"
            >
              <span className="material-symbols-outlined text-[20px]">settings</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-3 sm:p-gutter flex flex-col space-y-5 sm:space-y-6">
          {/* Mobile Search Bar */}
          <div className="sm:hidden relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
            <input 
              type="text" 
              placeholder="Buscar por nombre, apodo o email..." 
              className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-body-md outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filters & Stats Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 bg-surface-container border border-outline-variant p-1 rounded-xl overflow-x-auto max-w-full no-scrollbar">
              {/* Select All Toggle Button */}
              <button 
                onClick={handleToggleSelectAll}
                className={`px-3 py-1.5 font-label-caps text-[11px] rounded-lg transition-all shrink-0 flex items-center gap-1.5 font-bold border ${
                  isAllSelected
                    ? 'bg-primary text-on-primary border-primary shadow-xs'
                    : 'bg-surface-container-lowest text-secondary hover:text-on-surface border-outline-variant/50'
                }`}
                title={isAllSelected ? 'Deseleccionar todos los invitados' : 'Seleccionar todos los invitados filtrados'}
              >
                <span className="material-symbols-outlined text-base">
                  {isAllSelected ? 'check_box' : 'check_box_outline_blank'}
                </span>
                <span>{isAllSelected ? 'DESELECCIONAR TODO' : `SELECCIONAR TODO (${filteredGuests.length})`}</span>
              </button>

              <div className="h-4 w-[1px] bg-outline-variant/60 mx-1 shrink-0"></div>

              <button 
                onClick={() => setActiveCategory('ALL')}
                className={`px-3.5 sm:px-5 py-1.5 font-label-caps text-[11px] rounded-lg transition-all shrink-0 ${
                  activeCategory === 'ALL'
                    ? 'bg-surface-container-lowest shadow-sm text-primary font-bold'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                TODOS ({categoryCounts.ALL})
              </button>
              <button 
                onClick={() => setActiveCategory('FAMILIA')}
                className={`px-3.5 sm:px-5 py-1.5 font-label-caps text-[11px] rounded-lg transition-all shrink-0 ${
                  activeCategory === 'FAMILIA'
                    ? 'bg-surface-container-lowest shadow-sm text-primary font-bold'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                FAMILIA ({categoryCounts.FAMILIA})
              </button>
              <button 
                onClick={() => setActiveCategory('AMIGOS')}
                className={`px-3.5 sm:px-5 py-1.5 font-label-caps text-[11px] rounded-lg transition-all shrink-0 ${
                  activeCategory === 'AMIGOS'
                    ? 'bg-surface-container-lowest shadow-sm text-primary font-bold'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                AMIGOS ({categoryCounts.AMIGOS})
              </button>
              <button 
                onClick={() => setActiveCategory('CONOCIDOS')}
                className={`px-3.5 sm:px-5 py-1.5 font-label-caps text-[11px] rounded-lg transition-all shrink-0 ${
                  activeCategory === 'CONOCIDOS'
                    ? 'bg-surface-container-lowest shadow-sm text-primary font-bold'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                CONOCIDOS ({categoryCounts.CONOCIDOS})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-body-md">
              {/* Alphabetical Sort Selector */}
              <div className="flex items-center gap-1.5 bg-surface-container border border-outline-variant p-1 rounded-xl shrink-0">
                <span className="material-symbols-outlined text-sm text-primary pl-2">sort_by_alpha</span>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="bg-transparent text-xs font-bold text-on-surface font-label-caps pr-3 py-1 outline-none cursor-pointer"
                  title="Organizar por Abecedario"
                >
                  <option value="name_asc">Abecedario (A → Z)</option>
                  <option value="name_desc">Abecedario (Z → A)</option>
                  <option value="category">Por Parentezco</option>
                  <option value="newest">Más Recientes</option>
                </select>
              </div>

              <div className="h-4 w-[1px] bg-outline-variant/60 hidden sm:block"></div>
              {/* Interactive Status Filter Buttons */}
              <button
                type="button"
                onClick={() => setActiveStatusFilter(prev => prev === 'confirmed' ? 'ALL' : 'confirmed')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all border cursor-pointer select-none font-bold text-xs ${
                  activeStatusFilter === 'confirmed'
                    ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/50 shadow-xs'
                    : 'border-outline-variant/40 bg-surface-container-low/50 text-secondary hover:text-on-surface hover:bg-surface-container'
                }`}
                title={activeStatusFilter === 'confirmed' ? 'Mostrar todos' : 'Filtrar solo confirmados'}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></div>
                <span>{statusCounts.confirmed} Confirmados</span>
                {activeStatusFilter === 'confirmed' && (
                  <span className="material-symbols-outlined text-sm ml-0.5 text-emerald-600">close</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveStatusFilter(prev => prev === 'pending' ? 'ALL' : 'pending')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all border cursor-pointer select-none font-bold text-xs ${
                  activeStatusFilter === 'pending'
                    ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/50 shadow-xs'
                    : 'border-outline-variant/40 bg-surface-container-low/50 text-secondary hover:text-on-surface hover:bg-surface-container'
                }`}
                title={activeStatusFilter === 'pending' ? 'Mostrar todos' : 'Filtrar solo pendientes'}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></div>
                <span>{statusCounts.pending} Pendientes</span>
                {activeStatusFilter === 'pending' && (
                  <span className="material-symbols-outlined text-sm ml-0.5 text-amber-600">close</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveStatusFilter(prev => prev === 'tentative' ? 'ALL' : 'tentative')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all border cursor-pointer select-none font-bold text-xs ${
                  activeStatusFilter === 'tentative'
                    ? 'bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/50 shadow-xs'
                    : 'border-outline-variant/40 bg-surface-container-low/50 text-secondary hover:text-on-surface hover:bg-surface-container'
                }`}
                title={activeStatusFilter === 'tentative' ? 'Mostrar todos' : 'Filtrar solo tentativos'}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0"></div>
                <span>{statusCounts.tentative} Tentativos</span>
                {activeStatusFilter === 'tentative' && (
                  <span className="material-symbols-outlined text-sm ml-0.5 text-purple-600">close</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveStatusFilter(prev => prev === 'not_sent' ? 'ALL' : 'not_sent')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all border cursor-pointer select-none font-bold text-xs ${
                  activeStatusFilter === 'not_sent'
                    ? 'bg-slate-500/15 text-slate-800 dark:text-slate-200 border-slate-500/50 shadow-xs'
                    : 'border-outline-variant/40 bg-surface-container-low/50 text-secondary hover:text-on-surface hover:bg-surface-container'
                }`}
                title={activeStatusFilter === 'not_sent' ? 'Mostrar todos' : 'Filtrar solo no enviadas'}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-slate-500 shrink-0"></div>
                <span>{statusCounts.not_sent} No enviadas</span>
                {activeStatusFilter === 'not_sent' && (
                  <span className="material-symbols-outlined text-sm ml-0.5 text-slate-600">close</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveStatusFilter(prev => prev === 'declined' ? 'ALL' : 'declined')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all border cursor-pointer select-none font-bold text-xs ${
                  activeStatusFilter === 'declined'
                    ? 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/50 shadow-xs'
                    : 'border-outline-variant/40 bg-surface-container-low/50 text-secondary hover:text-on-surface hover:bg-surface-container'
                }`}
                title={activeStatusFilter === 'declined' ? 'Mostrar todos' : 'Filtrar solo declinados'}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></div>
                <span>{statusCounts.declined} No asistirán</span>
                {activeStatusFilter === 'declined' && (
                  <span className="material-symbols-outlined text-sm ml-0.5 text-rose-600">close</span>
                )}
              </button>

              {activeStatusFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setActiveStatusFilter('ALL')}
                  className="text-[11px] text-primary hover:underline font-bold font-label-caps ml-1"
                >
                  VER TODOS
                </button>
              )}
            </div>
          </div>

          {/* Guests Container: Mobile Cards + Desktop Table */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/60 shadow-xs overflow-hidden">
            
            {/* Mobile Card List View (block md:hidden) */}
            <div className="block md:hidden divide-y divide-outline-variant/30">
              {loading ? (
                <div className="py-12 text-center text-secondary">
                  <span className="material-symbols-outlined text-3xl animate-spin text-primary mb-2">sync</span>
                  <p className="text-xs font-body-md">Cargando lista de invitados...</p>
                </div>
              ) : filteredGuests.length === 0 ? (
                <div className="py-12 text-center text-secondary p-4">
                  <span className="material-symbols-outlined text-4xl mb-2 text-outline">group_off</span>
                  <p className="text-sm font-bold text-on-surface">No se encontraron invitados</p>
                  <p className="text-xs text-secondary mt-1">Prueba a cambiar los filtros o importar un archivo Excel.</p>
                </div>
              ) : (
                filteredGuests.map((guest) => (
                  <div 
                    key={guest.id} 
                    className={`p-4 space-y-3 transition-colors ${
                      selectedGuestIds.includes(guest.id) 
                        ? 'bg-primary/5 dark:bg-primary/10' 
                        : 'hover:bg-surface-container-low/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Mobile Checkbox */}
                        <input 
                          type="checkbox"
                          checked={selectedGuestIds.includes(guest.id)}
                          onChange={() => handleToggleGuestSelect(guest.id)}
                          className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary shrink-0 cursor-pointer"
                        />
                        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                          {guest.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-headline-sm text-sm text-on-surface font-bold truncate">
                            {guest.full_name}
                          </p>
                          {guest.nickname && (
                            <span className="inline-block mt-0.5 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-label-caps rounded-md border border-primary/20 font-bold">
                              "{guest.nickname}"
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button 
                          onClick={() => setEditingGuest(guest)}
                          className="p-2 text-outline hover:text-primary transition-colors rounded-lg flex items-center justify-center"
                          title="Editar invitado"
                          aria-label="Editar invitado"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button 
                          onClick={() => setDeletingGuest(guest)}
                          className="p-2 text-outline hover:text-rose-600 transition-colors rounded-lg flex items-center justify-center"
                          title="Eliminar invitado"
                          aria-label="Eliminar invitado"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 pl-8">
                      <span className="px-2.5 py-0.5 bg-surface-container-high text-on-surface-variant text-[10px] font-label-caps font-bold rounded-lg border border-outline-variant/40 uppercase">
                        {guest.category || 'AMIGOS'}
                      </span>

                      <div className={`flex items-center space-x-1 px-2.5 py-0.5 text-[10px] font-label-caps font-bold rounded-full ${
                        guest.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : guest.status === 'tentative'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                          : guest.status === 'not_sent'
                          ? 'bg-slate-100 text-slate-800 dark:bg-slate-900/80 dark:text-slate-300'
                          : guest.status === 'declined'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        <span className="material-symbols-outlined text-[14px]">
                          {guest.status === 'confirmed' ? 'check_circle' : guest.status === 'tentative' ? 'help' : guest.status === 'not_sent' ? 'mark_email_unread' : guest.status === 'declined' ? 'cancel' : 'pending'}
                        </span>
                        <span className="capitalize">{guest.status === 'confirmed' ? 'Confirmado' : guest.status === 'tentative' ? 'Tentativo' : guest.status === 'not_sent' ? 'No enviada' : guest.status === 'declined' ? 'No asistirá' : 'Pendiente'}</span>
                      </div>

                      {guest.companions_count > 0 && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full">
                          +{guest.companions_count} acomp.
                        </span>
                      )}
                    </div>

                    {(guest.phone || guest.email || guest.dietary_restrictions) && (
                      <div className="text-[11px] text-secondary space-y-0.5 pt-1 pl-8 border-t border-outline-variant/20 font-body-md">
                        {guest.phone && <p>📱 {guest.phone}</p>}
                        {guest.email && <p>✉️ {guest.email}</p>}
                        {guest.dietary_restrictions && <p className="italic text-primary">🥗 {guest.dietary_restrictions}</p>}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-surface-container-low/50 border-b border-outline-variant/40">
                    <th className="px-4 py-3.5 w-12 text-center">
                      <input 
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
                        title={isAllSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
                      />
                    </th>
                    <th 
                      onClick={() => setSortOrder(prev => prev === 'name_asc' ? 'name_desc' : 'name_asc')}
                      className="px-6 py-3.5 font-label-caps text-[10px] text-outline tracking-widest uppercase cursor-pointer hover:text-primary transition-colors select-none"
                      title="Haz clic para ordenar por abecedario"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Invitado / Apodo</span>
                        <span className="material-symbols-outlined text-sm text-primary">
                          {sortOrder === 'name_asc' ? 'arrow_downward' : sortOrder === 'name_desc' ? 'arrow_upward' : 'sort_by_alpha'}
                        </span>
                      </div>
                    </th>
                    <th 
                      onClick={() => setSortOrder(prev => prev === 'category' ? 'name_asc' : 'category')}
                      className="px-6 py-3.5 font-label-caps text-[10px] text-outline tracking-widest uppercase cursor-pointer hover:text-primary transition-colors select-none"
                      title="Haz clic para ordenar por categoría / parentezco"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Categoría</span>
                        {sortOrder === 'category' && (
                          <span className="material-symbols-outlined text-sm text-primary">arrow_downward</span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3.5 font-label-caps text-[10px] text-outline tracking-widest uppercase">Estado</th>
                    <th className="px-6 py-3.5 font-label-caps text-[10px] text-outline tracking-widest uppercase">Requerimientos / Notas</th>
                    <th className="px-6 py-3.5 font-label-caps text-[10px] text-outline tracking-widest uppercase text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-secondary">
                        <span className="material-symbols-outlined text-3xl animate-spin text-primary mb-2">sync</span>
                        <p className="text-xs font-body-md">Cargando lista de invitados...</p>
                      </td>
                    </tr>
                  ) : filteredGuests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-secondary">
                        <span className="material-symbols-outlined text-4xl mb-2 text-outline">group_off</span>
                        <p className="text-sm font-bold text-on-surface">No se encontraron invitados</p>
                        <p className="text-xs text-secondary mt-1">Prueba a cambiar los filtros o importar un archivo Excel.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredGuests.map((guest) => (
                      <tr 
                        key={guest.id} 
                        className={`guest-row transition-colors ${
                          selectedGuestIds.includes(guest.id)
                            ? 'bg-primary/5 dark:bg-primary/10'
                            : 'hover:bg-surface-container-low/40'
                        }`}
                      >
                        {/* Checkbox Column */}
                        <td className="px-4 py-4 text-center">
                          <input 
                            type="checkbox"
                            checked={selectedGuestIds.includes(guest.id)}
                            onChange={() => handleToggleGuestSelect(guest.id)}
                            className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
                          />
                        </td>
                        {/* Guest Name & Nickname */}
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                              {guest.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-headline-sm text-sm text-on-surface font-bold truncate">
                                  {guest.full_name}
                                </p>
                                {guest.nickname && (
                                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-label-caps rounded-md border border-primary/20">
                                    "{guest.nickname}"
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-secondary font-body-md truncate">
                                {guest.phone || guest.email || (guest.companions_count > 0 ? `+${guest.companions_count} acompañante(s)` : 'Sin teléfono')}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-surface-container-high text-on-surface-variant text-[10px] font-label-caps font-bold rounded-lg border border-outline-variant/40 uppercase">
                            {guest.category || 'AMIGOS'}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="px-6 py-4">
                          <div className={`flex items-center space-x-1.5 px-2.5 py-1 text-[11px] font-label-caps font-bold rounded-full w-fit ${
                            guest.status === 'confirmed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : guest.status === 'tentative'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                              : guest.status === 'not_sent'
                              ? 'bg-slate-100 text-slate-800 dark:bg-slate-900/80 dark:text-slate-300'
                              : guest.status === 'declined'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}>
                            <span className="material-symbols-outlined text-[16px]">
                              {guest.status === 'confirmed' ? 'check_circle' : guest.status === 'tentative' ? 'help' : guest.status === 'not_sent' ? 'mark_email_unread' : guest.status === 'declined' ? 'cancel' : 'pending'}
                            </span>
                            <span className="capitalize">{guest.status === 'confirmed' ? 'Confirmado' : guest.status === 'tentative' ? 'Tentativo' : guest.status === 'not_sent' ? 'No enviada' : guest.status === 'declined' ? 'No asistirá' : 'Pendiente'}</span>
                          </div>
                        </td>

                        {/* Restrictions / Notes */}
                        <td className="px-6 py-4">
                          <p className="text-xs text-secondary font-body-md max-w-xs italic truncate">
                            {guest.dietary_restrictions || 'Sin restricciones registradas'}
                          </p>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-1 sm:space-x-2">
                            {/* Edit Button */}
                            <button 
                              onClick={() => setEditingGuest(guest)}
                              className="p-2 text-outline hover:text-primary transition-colors rounded-lg flex items-center justify-center hover:scale-105"
                              title="Editar invitado"
                              aria-label="Editar invitado"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>

                            {/* Delete Button */}
                            <button 
                              onClick={() => setDeletingGuest(guest)}
                              className="p-2 text-outline hover:text-rose-600 transition-colors rounded-lg flex items-center justify-center hover:scale-105"
                              title="Eliminar invitado"
                              aria-label="Eliminar invitado"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Stats */}
            <div className="bg-surface-container-low/30 px-4 sm:px-6 py-3 border-t border-outline-variant/40 flex flex-col sm:flex-row items-center justify-between gap-1 text-xs text-secondary font-body-md text-center sm:text-left">
              <span>Mostrando {filteredGuests.length} de {guests.filter(g => g.status !== 'tentative').length} invitados oficiales ({statusCounts.tentative} tentativos)</span>
              <span className="font-semibold text-primary">Sincronizado en tiempo real</span>
            </div>
          </div>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-body-md flex items-center gap-2.5 animate-in slide-in-from-bottom-5 duration-200 ${
            toast.type === 'error'
              ? 'bg-rose-600 text-white border-rose-700'
              : 'bg-emerald-700 text-white border-emerald-800'
          }`}>
            <span className="material-symbols-outlined text-base">
              {toast.type === 'error' ? 'error' : 'check_circle'}
            </span>
            <span className="font-medium">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-white/80 hover:text-white">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}

        {/* Footer */}
        <Footer variant="dashboard" />
      </main>

      {/* Creation Modal */}
      <CreateGuestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={async (newG) => {
          await createGuest(newG);
        }}
      />

      {/* Excel Import Modal */}
      <ImportGuestsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingGuests={guests}
        onImportSuccess={handleImportGuestsSuccess}
      />

      {/* Edit Guest Modal */}
      <EditGuestModal
        guest={editingGuest}
        isOpen={!!editingGuest}
        onClose={() => setEditingGuest(null)}
        onSubmit={async (id, updates) => {
          await updateGuest(id, updates);
          setToast({ message: 'Invitado actualizado con éxito', type: 'success' });
        }}
      />

      {/* Delete Guest Modal */}
      <DeleteGuestModal
        guest={deletingGuest}
        isOpen={!!deletingGuest}
        onClose={() => setDeletingGuest(null)}
        onConfirm={async (id) => {
          await deleteGuest(id);
          setToast({ message: 'Invitado eliminado con éxito', type: 'success' });
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Batch Delete Confirmation Modal */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/30 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="fixed inset-0" onClick={() => !isBatchDeleting && setIsBatchDeleteModalOpen(false)} />
          <div className="relative w-full max-w-md bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-2xl overflow-hidden z-10 p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <span className="material-symbols-outlined text-3xl">warning</span>
              <h3 className="font-headline-sm text-lg font-bold text-on-surface">Eliminación Múltiple</h3>
            </div>

            <p className="text-xs sm:text-sm text-secondary font-body-md mb-6 leading-relaxed">
              ¿Estás seguro de que deseas eliminar permanentemente a los <strong className="text-on-surface font-bold">{selectedGuestIds.length} invitados seleccionados</strong>? Esta acción no se puede deshacer.
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(false)}
                disabled={isBatchDeleting}
                className="px-4 py-2.5 rounded-xl font-label-caps text-xs text-secondary hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBatchDeleteConfirm}
                disabled={isBatchDeleting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-label-caps text-xs font-bold transition-all shadow-md inline-flex items-center gap-2 disabled:opacity-50"
              >
                {isBatchDeleting ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <span>Sí, Eliminar ({selectedGuestIds.length})</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
