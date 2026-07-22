"use client";

import React, { useState } from 'react';
import { Guest } from '@/types/database';

interface DeleteGuestModalProps {
  guest: Guest | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
}

export function DeleteGuestModal({ guest, isOpen, onClose, onConfirm }: DeleteGuestModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !guest) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMessage('');

    try {
      await onConfirm(guest.id);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al eliminar el invitado.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-2xl overflow-hidden z-10 p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4 text-rose-600 dark:text-rose-400">
          <div className="p-3 bg-rose-500/10 rounded-xl">
            <span className="material-symbols-outlined text-2xl">delete_forever</span>
          </div>
          <div>
            <h3 className="font-headline-sm text-lg font-bold text-on-surface">Eliminar Invitado</h3>
            <p className="text-xs text-secondary">Esta acción no se puede deshacer</p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-error/10 text-error text-xs font-body-md border border-error/20 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            {errorMessage}
          </div>
        )}

        <p className="text-sm text-secondary mb-6 leading-relaxed">
          ¿Estás seguro de que deseas eliminar a <strong className="text-on-surface">{guest.full_name}</strong> de la lista de invitados?
        </p>

        <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant/30">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl font-label-caps text-xs text-secondary hover:bg-surface-container transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-xl bg-rose-600 text-white font-label-caps text-xs font-bold hover:bg-rose-700 transition-all shadow-xs disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                <span>Eliminando...</span>
              </>
            ) : (
              <span>Eliminar Invitado</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
