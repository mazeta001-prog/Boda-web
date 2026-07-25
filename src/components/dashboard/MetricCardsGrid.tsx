"use client";

import React from 'react';
import Link from 'next/link';
import { DashboardMetrics, BudgetItem } from '@/types/database';

interface MetricCardsGridProps {
  metrics: DashboardMetrics;
  budget?: BudgetItem[];
  onOpenCreateBudget?: () => void;
  onOpenSetTotalBudget?: () => void;
  onEditBudgetItem?: (item: BudgetItem) => void;
  onDeleteBudgetItem?: (item: BudgetItem) => void;
}

export function MetricCardsGrid({
  metrics,
  budget = [],
  onOpenCreateBudget,
  onOpenSetTotalBudget,
  onEditBudgetItem,
  onDeleteBudgetItem
}: MetricCardsGridProps) {
  // Format currency helpers (Dominican Pesos - DOP)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', maximumFractionDigits: 0 }).format(amount);
  };

  const guestConfirmationRate = metrics.totalGuests > 0 
    ? Math.round((metrics.confirmedGuests / metrics.totalGuests) * 100) 
    : 0;

  const budgetUsageRate = metrics.totalBudgetAllocated > 0 
    ? Math.round((metrics.budgetUsed / metrics.totalBudgetAllocated) * 100) 
    : 0;

  return (
    <div className="space-y-10 mb-12">
      {/* Group 1: Invitados (Guests Overview) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">group</span>
            <h2 className="font-headline-sm text-lg font-bold text-on-surface">Gestión de Invitados</h2>
          </div>
          <Link 
            href="/dashboard/guests"
            className="text-xs font-label-caps font-bold text-primary hover:underline flex items-center gap-1"
          >
            <span>Ver todos los invitados</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* 1. Total Guests */}
          <Link
            href="/dashboard/guests"
            className="bg-surface-container-lowest p-6 border border-outline-variant/40 rounded-2xl shadow-xs relative overflow-hidden group hover:border-primary/50 hover:shadow-md transition-all cursor-pointer block"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-6xl text-primary">groups</span>
            </div>
            <div className="relative z-10">
              <span className="font-label-caps text-xs text-secondary uppercase tracking-widest block mb-2">Total Invitados</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-display-lg font-bold text-on-surface">{metrics.totalGuests}</span>
                <span className="text-xs font-body-md text-secondary">personas</span>
              </div>
              <p className="mt-3 text-xs text-primary font-bold flex items-center gap-1 group-hover:underline">
                <span>Ver lista completa</span>
                <span className="material-symbols-outlined text-xs">chevron_right</span>
              </p>
            </div>
          </Link>

          {/* 2. Confirmed Guests */}
          <Link
            href="/dashboard/guests?status=confirmed"
            className="bg-surface-container-lowest p-6 border border-outline-variant/40 rounded-2xl shadow-xs relative overflow-hidden group hover:border-emerald-500/60 hover:shadow-md transition-all cursor-pointer block"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-6xl text-emerald-600">check_circle</span>
            </div>
            <div className="relative z-10">
              <span className="font-label-caps text-xs text-secondary uppercase tracking-widest block mb-2">Confirmados</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-display-lg font-bold text-emerald-700 dark:text-emerald-400">{metrics.confirmedGuests}</span>
                <span className="text-xs font-body-md text-emerald-600 dark:text-emerald-400 font-semibold">{guestConfirmationRate}% del total</span>
              </div>
              <div className="w-full bg-surface-variant h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${guestConfirmationRate}%` }}></div>
              </div>
              <p className="mt-2 text-[11px] text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1 group-hover:underline">
                <span>Ver invitados confirmados</span>
                <span className="material-symbols-outlined text-xs">chevron_right</span>
              </p>
            </div>
          </Link>

          {/* 3. Pending Guests */}
          <Link
            href="/dashboard/guests?status=pending"
            className="bg-surface-container-lowest p-6 border border-outline-variant/40 rounded-2xl shadow-xs relative overflow-hidden group hover:border-amber-500/60 hover:shadow-md transition-all cursor-pointer block"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-6xl text-amber-600">pending</span>
            </div>
            <div className="relative z-10">
              <span className="font-label-caps text-xs text-secondary uppercase tracking-widest block mb-2">Pendientes</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-display-lg font-bold text-amber-700 dark:text-amber-400">{metrics.pendingGuests}</span>
                <span className="text-xs font-body-md text-amber-600">Por responder</span>
              </div>
              <p className="mt-3 text-xs text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1 group-hover:underline">
                <span>Ver invitados pendientes</span>
                <span className="material-symbols-outlined text-xs">chevron_right</span>
              </p>
            </div>
          </Link>

          {/* 4. Declined Guests */}
          <Link
            href="/dashboard/guests?status=declined"
            className="bg-surface-container-lowest p-6 border border-outline-variant/40 rounded-2xl shadow-xs relative overflow-hidden group hover:border-rose-500/60 hover:shadow-md transition-all cursor-pointer block"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-6xl text-rose-600">cancel</span>
            </div>
            <div className="relative z-10">
              <span className="font-label-caps text-xs text-secondary uppercase tracking-widest block mb-2">Declinados</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-display-lg font-bold text-rose-700 dark:text-rose-400">{metrics.declinedGuests}</span>
                <span className="text-xs font-body-md text-rose-600">No asistirán</span>
              </div>
              <p className="mt-3 text-xs text-rose-700 dark:text-rose-300 font-bold flex items-center gap-1 group-hover:underline">
                <span>Ver quienes declinaron</span>
                <span className="material-symbols-outlined text-xs">chevron_right</span>
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Group 2: Presupuesto del Evento */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">payments</span>
            <h2 className="font-headline-sm text-lg font-bold text-on-surface">Presupuesto del Evento</h2>
          </div>

          {onOpenCreateBudget && (
            <button
              onClick={onOpenCreateBudget}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary font-label-caps text-xs font-bold hover:bg-primary-container hover:text-on-primary-container transition-all shadow-xs shrink-0 self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-base">add_card</span>
              <span>+ AÑADIR GASTO</span>
            </button>
          )}
        </div>

        {/* Global Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
          {/* Total Budget */}
          <div className="bg-surface-container-lowest p-6 border border-outline-variant/40 rounded-2xl shadow-xs relative overflow-hidden group hover:border-primary/50 transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="font-label-caps text-xs text-secondary uppercase tracking-widest block">Presupuesto Total</span>
              {onOpenSetTotalBudget && (
                <button
                  onClick={onOpenSetTotalBudget}
                  className="p-1.5 text-outline hover:text-primary transition-colors rounded-lg flex items-center gap-1 bg-surface-container-low hover:bg-surface-container text-[11px] font-bold"
                  title="Modificar presupuesto total"
                  aria-label="Modificar presupuesto total"
                >
                  <span className="material-symbols-outlined text-[15px]">edit</span>
                  <span>Modificar</span>
                </button>
              )}
            </div>
            <div className="text-3xl font-display-lg font-bold text-on-surface mb-2">{formatCurrency(metrics.totalBudgetAllocated)}</div>
            <p className="text-xs text-secondary font-body-md">Monto total contemplado para la boda (RD$)</p>
          </div>

          {/* Presupuesto Ejecutado */}
          <div className="bg-surface-container-lowest p-6 border border-outline-variant/40 rounded-2xl shadow-xs relative overflow-hidden group">
            <div className="flex justify-between items-start mb-2">
              <span className="font-label-caps text-xs text-secondary uppercase tracking-widest block">Presupuesto Ejecutado</span>
              <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full">{budgetUsageRate}% ejecutado</span>
            </div>
            <div className="text-3xl font-display-lg font-bold text-on-surface mb-2">{formatCurrency(metrics.budgetUsed)}</div>
            <div className="w-full bg-surface-variant h-2 rounded-full overflow-hidden mb-2">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${budgetUsageRate > 100 ? 'bg-rose-600' : 'bg-primary'}`} 
                style={{ width: `${Math.min(100, budgetUsageRate)}%` }}
              ></div>
            </div>
            <p className="text-xs text-secondary font-body-md">Pagado de los {formatCurrency(metrics.totalBudgetAllocated)} presupuestados</p>
          </div>

          {/* Presupuesto Restante */}
          <div className="bg-surface-container-lowest p-6 border border-outline-variant/40 rounded-2xl shadow-xs relative overflow-hidden group sm:col-span-2 lg:col-span-1">
            <span className="font-label-caps text-xs text-secondary uppercase tracking-widest block mb-2">Presupuesto Restante</span>
            <div className="text-3xl font-display-lg font-bold text-emerald-700 dark:text-emerald-400 mb-2">{formatCurrency(metrics.budgetRemaining)}</div>
            <p className="text-xs text-secondary font-body-md">Monto restante disponible para la boda</p>
          </div>
        </div>

        {/* Detailed Category Breakdown Table */}
        <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-lg">receipt_long</span>
              <h3 className="font-body-md text-sm font-bold text-on-surface">Desglose de Gastos y Partidas Presupuestarias</h3>
            </div>
            <span className="text-xs text-secondary font-body-md">{budget.length} {budget.length === 1 ? 'partida' : 'partidas'}</span>
          </div>

          {budget.length === 0 ? (
            <div className="p-8 text-center text-secondary">
              <span className="material-symbols-outlined text-4xl mb-2 text-outline">price_change</span>
              <p className="text-sm font-body-md">No hay partidas presupuestarias registradas aún.</p>
              {onOpenCreateBudget && (
                <button
                  onClick={onOpenCreateBudget}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/10 text-primary font-label-caps text-xs font-bold hover:bg-primary/20 transition-all"
                >
                  + Añadir primera partida
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/20">
              {budget.map((item) => {
                const percent = item.allocated > 0 ? Math.round((item.used / item.allocated) * 100) : 0;
                const isOverBudget = item.used > item.allocated;

                return (
                  <div key={item.id} className="p-4 sm:p-5 hover:bg-surface-container-low/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                        <span className="font-body-md font-bold text-on-surface text-sm">{item.category}</span>
                        {isOverBudget ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                            Excedido ({percent}%)
                          </span>
                        ) : percent === 100 ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Pagado 100%
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            {percent}% ejecutado
                          </span>
                        )}

                        {item.payments && item.payments.length > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-0.5" title="Historial de abonos registrados">
                            <span className="material-symbols-outlined text-xs">history</span>
                            {item.payments.length} {item.payments.length === 1 ? 'abono' : 'abonos'}
                          </span>
                        )}

                        {item.image_url && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5" title="Comprobante adjunto">
                            <span className="material-symbols-outlined text-xs">receipt_long</span>
                            Comprobante
                          </span>
                        )}
                      </div>
                      {item.notes && (
                        <p className="text-xs text-secondary font-body-md italic truncate mb-2">{item.notes}</p>
                      )}

                      {/* Mini Progress Bar */}
                      <div className="w-full max-w-md bg-surface-variant h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            isOverBudget ? 'bg-rose-600' : percent === 100 ? 'bg-emerald-600' : 'bg-primary'
                          }`}
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-bold text-on-surface">
                          {formatCurrency(item.used)}
                        </div>
                        <div className="text-xs text-secondary">
                          de {formatCurrency(item.allocated)}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center space-x-1">
                        {onEditBudgetItem && (
                          <button
                            onClick={() => onEditBudgetItem(item)}
                            className="p-2 text-outline hover:text-primary transition-colors rounded-lg flex items-center justify-center hover:scale-105"
                            title="Editar partida"
                            aria-label="Editar partida"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                        )}
                        {onDeleteBudgetItem && (
                          <button
                            onClick={() => onDeleteBudgetItem(item)}
                            className="p-2 text-outline hover:text-rose-600 transition-colors rounded-lg flex items-center justify-center hover:scale-105"
                            title="Eliminar partida"
                            aria-label="Eliminar partida"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
