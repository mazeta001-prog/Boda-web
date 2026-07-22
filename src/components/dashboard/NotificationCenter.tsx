"use client";

import React, { useState } from 'react';
import { NotificationItem } from '@/types/database';

interface NotificationCenterProps {
  notifications: NotificationItem[];
  unreadCount: number;
  isOpen: boolean;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export function NotificationCenter({
  notifications,
  unreadCount,
  isOpen,
  onClose,
  onMarkRead,
  onMarkAllRead
}: NotificationCenterProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return { icon: 'check_circle', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400' };
      case 'warning':
        return { icon: 'warning', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400' };
      case 'alert':
        return { icon: 'error', color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400' };
      default:
        return { icon: 'info', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400' };
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Ahora mismo';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      if (diffDays === 1) return 'Ayer';
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-on-surface/20 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-4 top-16 z-50 w-full max-w-md bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in slide-in-from-top-4 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-outline-variant/40 flex items-center justify-between bg-surface-container-low/50">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">notifications</span>
            <h3 className="font-headline-sm text-base font-bold text-on-surface">Notificaciones</h3>
            {unreadCount > 0 && (
              <span className="bg-primary text-on-primary text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount} nuevas
              </span>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
            aria-label="Cerrar notificaciones"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Filter Controls & Mark all read */}
        <div className="p-3 border-b border-outline-variant/30 flex items-center justify-between text-xs bg-surface-container-lowest">
          <div className="flex gap-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg font-label-caps transition-colors ${
                filter === 'all' 
                  ? 'bg-primary/10 text-primary font-bold' 
                  : 'text-secondary hover:bg-surface-container-low'
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-lg font-label-caps transition-colors ${
                filter === 'unread' 
                  ? 'bg-primary/10 text-primary font-bold' 
                  : 'text-secondary hover:bg-surface-container-low'
              }`}
            >
              Sin leer ({unreadCount})
            </button>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-primary hover:underline font-label-caps text-[11px]"
            >
              Marcar todas leídas
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2 divide-y divide-outline-variant/20">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-secondary">
              <span className="material-symbols-outlined text-4xl mb-2 text-outline">notifications_off</span>
              <p className="text-sm font-body-md">No tienes notificaciones en esta categoría.</p>
            </div>
          ) : (
            filteredNotifications.map((n) => {
              const style = getTypeIcon(n.type);
              return (
                <div
                  key={n.id}
                  onClick={() => !n.read && onMarkRead(n.id)}
                  className={`p-3 rounded-xl transition-all flex gap-3 items-start cursor-pointer pt-3 ${
                    n.read 
                      ? 'opacity-70 bg-transparent hover:bg-surface-container-low/40' 
                      : 'bg-surface-container-low/80 hover:bg-surface-container-high/60 border-l-4 border-primary'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${style.color}`}>
                    <span className="material-symbols-outlined text-lg">{style.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className={`text-sm font-body-md ${!n.read ? 'font-bold text-on-surface' : 'font-medium text-secondary'}`}>
                        {n.title}
                      </h4>
                      <span className="text-[10px] font-label-caps text-secondary shrink-0">
                        {formatTime(n.created_at)}
                      </span>
                    </div>
                    <p className="text-xs font-body-md text-secondary leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
