"use client";

import React, { useState, useEffect, useRef } from 'react';
import { SearchResults } from '@/types/database';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => SearchResults;
}

export function GlobalSearchModal({ isOpen, onClose, onSearch }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        isOpen ? onClose() : null;
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const results = onSearch(query);
  const totalResults = results.guests.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-on-surface/30 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="fixed inset-0"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] z-10 animate-in zoom-in-95 duration-150">
        {/* Search Bar Input */}
        <div className="p-4 border-b border-outline-variant/40 flex items-center gap-3 bg-surface-container-low/50">
          <span className="material-symbols-outlined text-primary text-2xl">search</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar invitados por nombre o email..."
            className="flex-1 bg-transparent border-none outline-none text-on-surface placeholder:text-secondary font-body-md text-base focus:ring-0"
          />
          {query && (
            <button 
              onClick={() => setQuery('')} 
              className="p-1 rounded-full text-secondary hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-lg">cancel</span>
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-1 text-[10px] font-mono font-semibold text-secondary bg-surface-container-high border border-outline-variant/40 rounded-md">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {!query.trim() ? (
            <div className="py-12 text-center text-secondary">
              <span className="material-symbols-outlined text-4xl mb-2 text-outline">search_check</span>
              <p className="text-sm font-body-md">Escribe para buscar en la lista de invitados.</p>
              <p className="text-xs text-secondary/70 mt-1">Busca por nombre, apellidos, email o estado de confirmación.</p>
            </div>
          ) : totalResults === 0 ? (
            <div className="py-12 text-center text-secondary">
              <span className="material-symbols-outlined text-4xl mb-2 text-outline">search_off</span>
              <p className="text-sm font-body-md font-semibold text-on-surface">No se encontraron invitados</p>
              <p className="text-xs text-secondary mt-1">Intenta buscar con otros términos para "{query}".</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-outline-variant/30">
                <span className="font-label-caps text-xs text-primary font-bold tracking-wider uppercase flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">group</span>
                  Invitados ({results.guests.length})
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {results.guests.map(guest => (
                  <div key={guest.id} className="p-3 rounded-xl bg-surface-container-low/60 hover:bg-surface-container transition-colors flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-on-surface">{guest.full_name}</p>
                      <p className="text-xs text-secondary">{guest.email || 'Sin correo registrado'}</p>
                    </div>
                    <span className={`text-[10px] font-label-caps px-2.5 py-1 rounded-full uppercase font-bold ${
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
                      {guest.status === 'confirmed' ? 'Confirmado' : guest.status === 'tentative' ? 'Tentativo' : guest.status === 'not_sent' ? 'No enviada' : guest.status === 'declined' ? 'No asistirá' : 'Pendiente'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
