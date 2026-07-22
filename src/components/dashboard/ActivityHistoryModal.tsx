"use client";

import React, { useState } from 'react';
import { ActivityLog } from '@/types/database';

interface ActivityHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ActivityLog[];
}

export function ActivityHistoryModal({ isOpen, onClose, logs }: ActivityHistoryModalProps) {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  if (!isOpen) return null;

  const filteredLogs = logs.filter(log => {
    if (filterType !== 'all' && log.action_type !== filterType) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        log.user_name.toLowerCase().includes(term) ||
        log.details.toLowerCase().includes(term) ||
        log.action_type.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-2xl overflow-hidden z-10 p-6 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-outline-variant/30">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">history</span>
            <div>
              <h3 className="font-headline-sm text-lg font-bold text-on-surface">Historial de Auditoría</h3>
              <p className="text-xs text-secondary font-body-md">Registro cronológico de todas las acciones del sistema</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            placeholder="Buscar por usuario o detalle..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-low text-on-surface text-xs outline-none focus:border-primary"
          />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-4 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-low text-on-surface text-xs outline-none focus:border-primary"
          >
            <option value="all">Todas las acciones ({logs.length})</option>
            <option value="guest_created">Invitados Creados</option>
            <option value="invitation_accepted">Invitaciones Aceptadas</option>
            <option value="invitation_declined">Invitaciones Declinadas</option>
            <option value="gift_reserved">Regalos Reservados</option>
            <option value="event_created">Eventos Creados</option>
          </select>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-outline-variant/20">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-secondary">
              <span className="material-symbols-outlined text-4xl mb-2 text-outline">history_toggle_off</span>
              <p className="text-sm font-body-md">No se encontraron registros con este filtro.</p>
            </div>
          ) : (
            filteredLogs.map(log => (
              <div key={log.id} className="pt-3 pb-2 flex gap-4 items-start">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                  <span className="material-symbols-outlined text-base">history</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-on-surface">{log.user_name}</span>
                    <span className="text-[10px] text-secondary font-mono">{new Date(log.created_at).toLocaleString('es-ES')}</span>
                  </div>
                  <p className="text-xs text-secondary font-body-md leading-relaxed">{log.details}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
