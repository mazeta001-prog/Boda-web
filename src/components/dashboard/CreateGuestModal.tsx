"use client";

import React, { useState } from 'react';
import { GuestStatus } from '@/types/database';

interface CreateGuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (guest: {
    full_name: string;
    category?: string;
    email: string;
    phone?: string;
    status: GuestStatus;
    companions_count: number;
    dietary_restrictions?: string;
    invitation_sent: boolean;
    invitation_opened: boolean;
  }) => Promise<void>;
}

export function CreateGuestModal({ isOpen, onClose, onSubmit }: CreateGuestModalProps) {
  const [fullName, setFullName] = useState('');
  const [category, setCategory] = useState('Amigos');
  const [status, setStatus] = useState<GuestStatus>('not_sent');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dietary, setDietary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMessage('Por favor ingresa el nombre completo.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await onSubmit({
        full_name: fullName.trim(),
        category,
        email: email.trim(),
        phone: phone.trim() || undefined,
        status,
        companions_count: 0,
        dietary_restrictions: dietary.trim() || undefined,
        invitation_sent: status !== 'not_sent',
        invitation_opened: false
      });
      // Reset form
      setFullName('');
      setCategory('Amigos');
      setStatus('not_sent');
      setEmail('');
      setPhone('');
      setDietary('');
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar el invitado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-2xl overflow-hidden z-10 p-4 sm:p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-outline-variant/30 shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">person_add</span>
            <h3 className="font-headline-sm text-lg font-bold text-on-surface">Añadir Nuevo Invitado</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-error/10 text-error text-xs font-body-md border border-error/20 flex items-center gap-2 shrink-0">
            <span className="material-symbols-outlined text-sm">error</span>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-label-caps text-secondary mb-1">Nombre Completo *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Ej. Sofía García"
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-low text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-label-caps text-secondary mb-1">Parentesco / Categoría *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-low text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              >
                <option value="Familia">Familia</option>
                <option value="Amigos">Amigos</option>
                <option value="Conocidos">Conocidos</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-label-caps text-secondary mb-1">Estado Inicial *</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as GuestStatus)}
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-low text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              >
                <option value="not_sent">Invitación no enviada</option>
                <option value="pending">Pendiente</option>
                <option value="tentative">Tentativo</option>
                <option value="confirmed">Confirmado</option>
                <option value="declined">No asistirá</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-label-caps text-secondary mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="sofia@ejemplo.com"
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-low text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-label-caps text-secondary mb-1">Teléfono</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+34 600 000 000"
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-low text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-label-caps text-secondary mb-1">Alergias o Preferencias de Menú</label>
            <input
              type="text"
              value={dietary}
              onChange={e => setDietary(e.target.value)}
              placeholder="Ej. Vegetariano, Intolerante a la lactosa"
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-low text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            />
          </div>

          <div className="pt-4 border-t border-outline-variant/30 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-label-caps text-xs text-secondary hover:bg-surface-container transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-caps text-xs font-bold hover:bg-primary-container hover:text-on-primary-container transition-all shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Invitado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
