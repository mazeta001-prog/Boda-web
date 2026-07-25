"use client";

import React, { useMemo, useState } from 'react';
import { NotificationItem, ActivityLog } from '@/types/database';

interface InvitationIssuesPanelProps {
  notifications: NotificationItem[];
  activityLogs: ActivityLog[];
  onMarkRead?: (id: string) => void;
}

export function InvitationIssuesPanel({
  notifications = [],
  activityLogs = [],
  onMarkRead
}: InvitationIssuesPanelProps) {
  const [showHistory, setShowHistory] = useState(false);

  // Deduplicate and process reports strictly (avoiding duplicate notifications & logs)
  const { pendingReports, resolvedReports } = useMemo(() => {
    const pendingList: Array<{
      id: string;
      name: string;
      message: string;
      phone: string;
      date: string;
      read: boolean;
    }> = [];

    const resolvedList: Array<{
      id: string;
      name: string;
      message: string;
      phone: string;
      date: string;
      read: boolean;
    }> = [];

    const seenContents = new Set<string>();

    // Process Notifications (Primary source with read/unread state)
    notifications.forEach(n => {
      const isIssue =
        n.title.toLowerCase().includes('problema') ||
        n.message.toLowerCase().includes('reportó un problema') ||
        n.message.toLowerCase().includes('problema con invitación');

      if (isIssue) {
        // Extract clean key to deduplicate
        let phone = '';
        const phoneMatch = n.message.match(/WhatsApp:\s*([+\d\s()-]+)/i) || n.message.match(/Teléfono:\s*([+\d\s()-]+)/i);
        if (phoneMatch) {
          phone = phoneMatch[1].trim();
        }

        let name = 'Invitado';
        const nameMatch = n.message.match(/^([^reportó]+)\s+reportó/i);
        if (nameMatch) {
          name = nameMatch[1].trim();
        }

        const contentKey = `${name.toLowerCase()}_${phone.replace(/\D/g, '')}_${n.message.slice(0, 30).toLowerCase()}`;

        if (!seenContents.has(contentKey)) {
          seenContents.add(contentKey);

          const item = {
            id: n.id,
            name,
            message: n.message,
            phone,
            date: n.created_at,
            read: Boolean(n.read)
          };

          if (n.read) {
            resolvedList.push(item);
          } else {
            pendingList.push(item);
          }
        }
      }
    });

    // Also check Activity Logs for fallback deduplication only if not seen in notifications
    activityLogs.forEach(l => {
      if (l.details.toLowerCase().includes('reportó problema')) {
        let phone = '';
        const phoneMatch = l.details.match(/WhatsApp:\s*([+\d\s()-]+)/i);
        if (phoneMatch) phone = phoneMatch[1].trim();

        const name = l.user_name || 'Invitado';
        const contentKey = `${name.toLowerCase()}_${phone.replace(/\D/g, '')}_${l.details.slice(0, 30).toLowerCase()}`;

        if (!seenContents.has(contentKey)) {
          seenContents.add(contentKey);
          resolvedList.push({
            id: l.id,
            name,
            message: l.details,
            phone,
            date: l.created_at,
            read: true
          });
        }
      }
    });

    return { pendingReports: pendingList, resolvedReports: resolvedList };
  }, [notifications, activityLogs]);

  return (
    <div className="bg-surface dark:bg-surface-dim border border-outline-variant/30 rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden transition-all">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <span className="material-symbols-outlined text-lg">support_agent</span>
          </div>
          <div>
            <h2 className="font-headline-sm text-sm font-bold text-on-surface flex items-center gap-2">
              <span>Soporte de Invitados</span>
              {pendingReports.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-label-caps text-[10px] font-bold border border-amber-500/20">
                  {pendingReports.length} Pendiente{pendingReports.length > 1 ? 's' : ''}
                </span>
              )}
            </h2>
            <p className="text-[11px] text-secondary font-body-md">
              Consultas enviadas por invitados desde el RSVP.
            </p>
          </div>
        </div>

        {resolvedReports.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs text-secondary hover:text-primary transition-colors flex items-center gap-1 font-medium cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">history</span>
            <span className="hidden sm:inline">{showHistory ? 'Ocultar Historial' : `Historial (${resolvedReports.length})`}</span>
          </button>
        )}
      </div>

      {/* Active Pending Reports List */}
      {pendingReports.length === 0 ? (
        <div className="py-6 text-center text-secondary">
          <span className="material-symbols-outlined text-3xl mb-1 text-emerald-500/70">check_circle</span>
          <p className="text-xs font-semibold text-on-surface">No hay reportes de problemas pendientes</p>
          <p className="text-[11px] text-secondary mt-0.5">Todos los invitados han ingresado sin inconvenientes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingReports.map((report) => {
            const formattedDate = new Date(report.date).toLocaleDateString('es-DO', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            });

            const cleanPhoneDigits = report.phone.replace(/[^\d+]/g, '');

            return (
              <div
                key={report.id}
                className="p-3.5 sm:p-4 rounded-xl border border-outline-variant/30 bg-surface-container-low/40 dark:bg-surface-container-highest/20 hover:border-outline-variant/60 transition-all text-left space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <span className="font-bold text-xs sm:text-sm text-on-surface">{report.name}</span>
                    <span className="text-[10px] text-secondary font-mono">({formattedDate})</span>
                  </div>

                  {onMarkRead && (
                    <button
                      type="button"
                      onClick={() => onMarkRead(report.id)}
                      className="text-[11px] font-label-caps font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">done_all</span>
                      <span>Marcar como Resuelto</span>
                    </button>
                  )}
                </div>

                <p className="text-xs text-secondary font-body-md leading-relaxed bg-surface/70 dark:bg-surface/30 p-2.5 rounded-lg border border-outline-variant/20">
                  {report.message}
                </p>

                {report.phone && (
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-0.5">
                    <span className="text-[11px] font-mono text-secondary">
                      WhatsApp: <strong className="text-on-surface">{report.phone}</strong>
                    </span>

                    <a
                      href={`https://wa.me/${cleanPhoneDigits}?text=${encodeURIComponent(`Hola ${report.name}, recibimos tu reporte sobre la invitación. ¿En qué te podemos ayudar?`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white font-label-caps text-[10px] font-bold transition-all shadow-xs"
                    >
                      <span className="material-symbols-outlined text-sm">chat</span>
                      <span>Responder por WhatsApp</span>
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden Collapsible Resolved History Drawer */}
      {showHistory && resolvedReports.length > 0 && (
        <div className="mt-6 pt-4 border-t border-outline-variant/20 space-y-3 animate-fadeIn">
          <div className="flex items-center gap-2 text-xs text-secondary font-semibold font-label-caps uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm text-emerald-600">published_with_changes</span>
            <span>Historial de Reportes Resueltos ({resolvedReports.length})</span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {resolvedReports.map((report) => {
              const formattedDate = new Date(report.date).toLocaleDateString('es-DO', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={report.id}
                  className="p-3 rounded-lg border border-outline-variant/20 bg-surface-container-lowest text-left opacity-75 hover:opacity-100 transition-opacity"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-on-surface flex items-center gap-1">
                      <span className="material-symbols-outlined text-emerald-600 text-sm">check_circle</span>
                      <span>{report.name}</span>
                    </span>
                    <span className="text-[10px] text-secondary font-mono">{formattedDate}</span>
                  </div>
                  <p className="text-[11px] text-secondary line-clamp-2">{report.message}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
