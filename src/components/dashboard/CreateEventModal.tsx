"use client";

import React, { useState } from 'react';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (eventItem: {
    title: string;
    date: string;
    location: string;
    max_capacity: number;
  }) => Promise<void>;
}

export function CreateEventModal({ isOpen, onClose, onSubmit }: CreateEventModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [maxCapacity, setMaxCapacity] = useState<number>(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !location.trim()) {
      setErrorMessage('Por favor completa el título y la ubicación.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await onSubmit({
        title: title.trim(),
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        location: location.trim(),
        max_capacity: maxCapacity
      });
      setTitle('');
      setDate('');
      setLocation('');
      setMaxCapacity(100);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al crear el evento.');
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
            <span className="material-symbols-outlined text-primary text-2xl">event</span>
            <h3 className="font-headline-sm text-lg font-bold text-on-surface">Crear Nuevo Evento</h3>
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
            <label className="block text-xs font-label-caps text-secondary mb-1">Nombre del Evento *</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej. Cóctel de Bienvenida / Ceremonia Principal"
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-low text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-label-caps text-secondary mb-1">Fecha y Hora</label>
              <input
                type="datetime-local"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-low text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-label-caps text-secondary mb-1">Aforo Máximo</label>
              <input
                type="number"
                min="10"
                max="1000"
                value={maxCapacity}
                onChange={e => setMaxCapacity(parseInt(e.target.value) || 100)}
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-low text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-label-caps text-secondary mb-1">Lugar / Ubicación *</label>
            <input
              type="text"
              required
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Ej. Finca El Olivar, Salón Principal"
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
              {isSubmitting ? 'Creando...' : 'Crear Evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
