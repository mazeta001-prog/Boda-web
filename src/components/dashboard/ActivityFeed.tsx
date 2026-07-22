"use client";

import React from 'react';
import { ActivityLog, ActivityActionType } from '@/types/database';

interface ActivityFeedProps {
  logs: ActivityLog[];
  onViewAll?: () => void;
}

export function ActivityFeed({ logs, onViewAll }: ActivityFeedProps) {
  const getActionConfig = (type: ActivityActionType) => {
    switch (type) {
      case 'guest_created':
        return { icon: 'person_add', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', label: 'Invitado Creado' };
      case 'guest_edited':
        return { icon: 'edit_note', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', label: 'Invitado Editado' };
      case 'invitation_sent':
        return { icon: 'forward_to_inbox', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400', label: 'Invitación Enviada' };
      case 'invitation_accepted':
        return { icon: 'how_to_reg', color: 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400', label: 'Invitación Aceptada' };
      case 'invitation_declined':
        return { icon: 'event_busy', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', label: 'Invitación Declinada' };
      case 'gift_reserved':
        return { icon: 'bookmark_add', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', label: 'Regalo Reservado' };
      case 'gift_purchased':
        return { icon: 'card_giftcard', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', label: 'Regalo Comprado' };
      case 'event_created':
        return { icon: 'calendar_add_on', color: 'bg-primary/10 text-primary', label: 'Evento Creado' };
      case 'gallery_upload':
        return { icon: 'add_a_photo', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400', label: 'Galería Actualizada' };
      case 'settings_changed':
        return { icon: 'settings', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400', label: 'Ajustes Cambiados' };
      default:
        return { icon: 'notifications', color: 'bg-primary/10 text-primary', label: 'Actividad' };
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Ahora mismo';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
      if (diffDays === 1) return 'Ayer';
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return isoString;
    }
  };

  const displayLogs = logs.slice(0, 6);

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-xs p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-outline-variant/30">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">history</span>
          <h2 className="font-headline-sm text-lg font-bold text-on-surface">Registro de Actividad</h2>
        </div>
        <span className="text-xs font-label-caps text-secondary font-semibold bg-surface-container-low px-2.5 py-1 rounded-full">
          Auditoría en vivo
        </span>
      </div>

      {displayLogs.length === 0 ? (
        <div className="py-12 text-center text-secondary flex-1 flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-4xl mb-2 text-outline">history_toggle_off</span>
          <p className="text-sm font-body-md">No hay actividades recientes registradas.</p>
        </div>
      ) : (
        <div className="space-y-3 flex-1">
          {displayLogs.map((log) => {
            const config = getActionConfig(log.action_type);
            return (
              <div 
                key={log.id}
                className="p-3.5 rounded-xl hover:bg-surface-container-low/70 transition-colors flex gap-4 items-start border border-transparent hover:border-outline-variant/30"
              >
                <div className={`p-2.5 rounded-full shrink-0 ${config.color}`}>
                  <span className="material-symbols-outlined text-lg">{config.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-on-surface truncate">
                      {log.user_name}
                    </span>
                    <span className="text-[10px] font-label-caps text-secondary uppercase shrink-0">
                      {formatRelativeTime(log.created_at)}
                    </span>
                  </div>
                  <p className="text-sm font-body-md text-on-surface/90 leading-tight">
                    {log.details}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {onViewAll && logs.length > 0 && (
        <div className="pt-4 mt-4 border-t border-outline-variant/30 text-center">
          <button
            onClick={onViewAll}
            className="text-xs font-label-caps text-primary font-bold hover:underline underline-offset-4 inline-flex items-center gap-1"
          >
            Ver historial completo ({logs.length})
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      )}
    </div>
  );
}
