"use client";

import React, { useState } from 'react';
import { GiftStatus } from '@/types/database';

interface CreateGiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (gift: {
    title: string;
    price: number;
    status: GiftStatus;
    category?: string;
  }) => Promise<void>;
}

export function CreateGiftModal({ isOpen, onClose, onSubmit }: CreateGiftModalProps) {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState<number>(100);
  const [category, setCategory] = useState('Hogar');
  const [status, setStatus] = useState<GiftStatus>('available');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Por favor introduce el nombre del regalo.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await onSubmit({
        title: title.trim(),
        price: Number(price) || 0,
        category: category.trim() || 'General',
        status
      });
      setTitle('');
      setPrice(100);
      setCategory('Hogar');
      setStatus('available');
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar el regalo.');
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
            <span className="material-symbols-outlined text-primary text-2xl">card_giftcard</span>
            <h3 className="font-headline-sm text-lg font-bold text-on-surface">Añadir Regalo a la Lista</h3>
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
            <label className="block text-xs font-label-caps text-secondary mb-1">Título del Regalo *</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej. Cafetera Espresso Barista / Juego de Maletas"
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-low text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-label-caps text-secondary mb-1">Precio Estimado (RD$) *</label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={price}
                onChange={e => setPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-low text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-label-caps text-secondary mb-1">Categoría</label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="Viaje, Hogar, Tecnología..."
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-low text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-label-caps text-secondary mb-1">Estado del Regalo</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as GiftStatus)}
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-low text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            >
              <option value="available">Disponible</option>
              <option value="reserved">Reservado</option>
              <option value="purchased">Comprado / Abonado</option>
            </select>
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
              {isSubmitting ? 'Guardando...' : 'Añadir Regalo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
