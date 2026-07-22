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
import { supabase, isSupabaseConfigured, localDB } from '@/lib/supabaseClient';

export default function GuestManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // WhatsApp Sending & Toast State
  const [sendingGuestId, setSendingGuestId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);

  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [deletingGuest, setDeletingGuest] = useState<Guest | null>(null);

  const {
    guests,
    loading,
    error,
    createGuest,
    updateGuest,
    deleteGuest,
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
        await supabase.from('guests').update({ invitation_sent: true, updated_at: new Date().toISOString() }).eq('id', guest.id);
        await supabase.from('activity_logs').insert([{
          action_type: 'invitation_sent',
          user_name: 'Administrador (Dana & Ivan)',
          details: `Manual WhatsApp invitation initiated for ${guest.full_name}`,
          created_at: new Date().toISOString()
        }]);
      } else {
        localDB.markInvitationSent(guest.id);
        localDB.addActivityLog('invitation_sent', 'Administrador (Dana & Ivan)', `Manual WhatsApp invitation initiated for ${guest.full_name}`);
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
    const counts = { ALL: guests.length, FAMILIA: 0, AMIGOS: 0, CONOCIDOS: 0 };
    guests.forEach(g => {
      const cat = (g.category || 'AMIGOS').toUpperCase();
      if (cat.includes('FAMIL')) counts.FAMILIA++;
      else if (cat.includes('CONOCI')) counts.CONOCIDOS++;
      else counts.AMIGOS++;
    });
    return counts;
  }, [guests]);

  // Live filtered guests
  const filteredGuests = useMemo(() => {
    return guests.filter(g => {
      // Category filter
      if (activeCategory !== 'ALL') {
        const cat = (g.category || 'AMIGOS').toUpperCase();
        if (activeCategory === 'FAMILIA' && !cat.includes('FAMIL')) return false;
        if (activeCategory === 'AMIGOS' && (cat.includes('FAMIL') || cat.includes('CONOCI'))) return false;
        if (activeCategory === 'CONOCIDOS' && !cat.includes('CONOCI')) return false;
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
  }, [guests, activeCategory, searchTerm]);

  // Live status counts
  const statusCounts = useMemo(() => {
    let confirmed = 0;
    let pending = 0;
    let declined = 0;
    guests.forEach(g => {
      if (g.status === 'confirmed') confirmed++;
      else if (g.status === 'declined') declined++;
      else pending++;
    });
    return { confirmed, pending, declined };
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
    for (const g of newGuests) {
      await createGuest(g);
    }
    await refetch();
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
        <header className="h-20 bg-surface/80 backdrop-blur-md flex flex-wrap items-center justify-between px-4 sm:px-gutter border-b border-outline-variant sticky top-0 z-10 gap-3 py-2">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 text-secondary hover:text-primary transition-colors bg-surface-container-low rounded-xl"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>
            <div>
              <h2 className="font-headline-sm text-lg sm:text-headline-sm text-on-surface font-bold">Gestión de Invitados</h2>
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

            {/* Import Button */}
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 sm:px-4 py-2 border text-primary font-label-caps text-xs hover:bg-primary/5 transition-all duration-200 rounded-xl border-primary-container shadow-2xs font-bold"
              title="Importar archivo Excel de invitados"
            >
              <span className="material-symbols-outlined text-[18px]">upload</span>
              <span>IMPORTAR</span>
            </button>

            {/* Export Button */}
            <button 
              onClick={handleExportExcel}
              className="flex items-center space-x-1.5 px-3 sm:px-4 py-2 border text-primary font-label-caps text-xs hover:bg-primary/5 transition-all duration-200 rounded-xl border-primary-container shadow-2xs font-bold"
              title="Exportar lista actual a Excel (.xlsx)"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span className="hidden sm:inline">EXPORTAR</span>
            </button>

            {/* Add Guest Button */}
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 sm:px-5 py-2 text-on-primary font-label-caps text-xs font-bold hover:bg-primary-container transition-all duration-200 rounded-xl shadow-xs bg-primary"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>AÑADIR INVITADO</span>
            </button>

            {/* Configuración / Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 border text-secondary hover:text-on-surface border-outline-variant/60 hover:bg-surface-container-low transition-all rounded-xl"
              title="Configuración y Cerrar Sesión"
            >
              <span className="material-symbols-outlined text-[20px]">settings</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-4 sm:p-gutter flex flex-col space-y-6">
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
            <div className="flex flex-wrap items-center gap-1.5 bg-surface-container border border-outline-variant p-1 rounded-xl">
              <button 
                onClick={() => setActiveCategory('ALL')}
                className={`px-4 sm:px-5 py-1.5 font-label-caps text-[11px] rounded-lg transition-all ${
                  activeCategory === 'ALL'
                    ? 'bg-surface-container-lowest shadow-sm text-primary font-bold'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                TODOS ({categoryCounts.ALL})
              </button>
              <button 
                onClick={() => setActiveCategory('FAMILIA')}
                className={`px-4 sm:px-5 py-1.5 font-label-caps text-[11px] rounded-lg transition-all ${
                  activeCategory === 'FAMILIA'
                    ? 'bg-surface-container-lowest shadow-sm text-primary font-bold'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                FAMILIA ({categoryCounts.FAMILIA})
              </button>
              <button 
                onClick={() => setActiveCategory('AMIGOS')}
                className={`px-4 sm:px-5 py-1.5 font-label-caps text-[11px] rounded-lg transition-all ${
                  activeCategory === 'AMIGOS'
                    ? 'bg-surface-container-lowest shadow-sm text-primary font-bold'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                AMIGOS ({categoryCounts.AMIGOS})
              </button>
              <button 
                onClick={() => setActiveCategory('CONOCIDOS')}
                className={`px-4 sm:px-5 py-1.5 font-label-caps text-[11px] rounded-lg transition-all ${
                  activeCategory === 'CONOCIDOS'
                    ? 'bg-surface-container-lowest shadow-sm text-primary font-bold'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                CONOCIDOS ({categoryCounts.CONOCIDOS})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-body-md">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                <span className="text-secondary font-medium">{statusCounts.confirmed} Confirmados</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                <span className="text-secondary font-medium">{statusCounts.pending} Pendientes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                <span className="text-secondary font-medium">{statusCounts.declined} No asistirán</span>
              </div>
            </div>
          </div>

          {/* Guests Table Container */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/60 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-surface-container-low/50 border-b border-outline-variant/40">
                    <th className="px-6 py-3.5 font-label-caps text-[10px] text-outline tracking-widest uppercase">Invitado / Apodo</th>
                    <th className="px-6 py-3.5 font-label-caps text-[10px] text-outline tracking-widest uppercase">Categoría</th>
                    <th className="px-6 py-3.5 font-label-caps text-[10px] text-outline tracking-widest uppercase">Estado</th>
                    <th className="px-6 py-3.5 font-label-caps text-[10px] text-outline tracking-widest uppercase">Requerimientos / Notas</th>
                    <th className="px-6 py-3.5 font-label-caps text-[10px] text-outline tracking-widest uppercase text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-secondary">
                        <span className="material-symbols-outlined text-3xl animate-spin text-primary mb-2">sync</span>
                        <p className="text-xs font-body-md">Cargando lista de invitados...</p>
                      </td>
                    </tr>
                  ) : filteredGuests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-secondary">
                        <span className="material-symbols-outlined text-4xl mb-2 text-outline">group_off</span>
                        <p className="text-sm font-bold text-on-surface">No se encontraron invitados</p>
                        <p className="text-xs text-secondary mt-1">Prueba a cambiar los filtros o importar un archivo Excel.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredGuests.map((guest) => (
                      <tr key={guest.id} className="guest-row hover:bg-surface-container-low/40 transition-colors">
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
                              : guest.status === 'declined'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}>
                            <span className="material-symbols-outlined text-[16px]">
                              {guest.status === 'confirmed' ? 'check_circle' : guest.status === 'declined' ? 'cancel' : 'pending'}
                            </span>
                            <span className="capitalize">{guest.status === 'confirmed' ? 'Confirmado' : guest.status === 'declined' ? 'No asistirá' : 'Pendiente'}</span>
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
            <div className="bg-surface-container-low/30 px-6 py-3 border-t border-outline-variant/40 flex items-center justify-between text-xs text-secondary font-body-md">
              <span>Mostrando {filteredGuests.length} de {guests.length} invitados registrados</span>
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
    </div>
  );
}
