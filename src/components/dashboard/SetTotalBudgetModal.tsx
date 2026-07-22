"use client";

import React, { useState, useEffect } from 'react';
import { BudgetItem } from '@/types/database';

interface SetTotalBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget: BudgetItem[];
  totalBudgetGoal: number;
  onSetTotalBudget: (amount: number) => Promise<void>;
  onUpdateBudgetItem: (id: string, updates: Partial<BudgetItem>) => Promise<void>;
  onCreateBudgetItem: (item: { category: string; allocated: number; used: number; notes?: string }) => Promise<void>;
  onDeleteBudgetItem: (id: string) => Promise<void>;
}

interface DraftItem {
  tempId: string;
  originalId?: string;
  category: string;
  allocated: number;
  used: number;
  notes?: string;
  isNew?: boolean;
}

export function SetTotalBudgetModal({
  isOpen,
  onClose,
  budget,
  totalBudgetGoal,
  onSetTotalBudget,
  onUpdateBudgetItem,
  onCreateBudgetItem,
  onDeleteBudgetItem
}: SetTotalBudgetModalProps) {
  const [items, setItems] = useState<DraftItem[]>([]);
  const [totalGoalInput, setTotalGoalInput] = useState<number | ''>(1000000);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      const initialDrafts: DraftItem[] = budget.map(b => ({
        tempId: b.id,
        originalId: b.id,
        category: b.category,
        allocated: b.allocated || 0,
        used: b.used || 0,
        notes: b.notes || '',
        isNew: false
      }));
      setItems(initialDrafts);
      
      const sumAllocated = initialDrafts.reduce((sum, item) => sum + item.allocated, 0);
      setTotalGoalInput(totalBudgetGoal || sumAllocated || 1000000);

      setDeletedIds([]);
      setErrorMessage('');
    }
  }, [isOpen, budget, totalBudgetGoal]);

  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', maximumFractionDigits: 0 }).format(amount);
  };

  const currentGoal = typeof totalGoalInput === 'number' ? totalGoalInput : 0;
  const totalUsed = items.reduce((sum, item) => sum + (Number(item.used) || 0), 0);
  const totalRemaining = Math.max(0, currentGoal - totalUsed);

  const handleItemChange = (tempId: string, field: keyof DraftItem, value: any) => {
    setItems(prev => prev.map(item => item.tempId === tempId ? { ...item, [field]: value } : item));
  };

  const handleAddNewItem = () => {
    const newItem: DraftItem = {
      tempId: 'draft-' + Date.now() + '-' + Math.random(),
      category: '',
      allocated: 0,
      used: 0,
      notes: '',
      isNew: true
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (tempId: string) => {
    const target = items.find(i => i.tempId === tempId);
    if (target && target.originalId) {
      setDeletedIds(prev => [...prev, target.originalId!]);
    }
    setItems(prev => prev.filter(i => i.tempId !== tempId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate empty categories
    const invalidItem = items.find(i => !i.category.trim());
    if (invalidItem) {
      setErrorMessage('Por favor asigna un nombre o categoría a todos los gastos.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // 1. Set global total budget goal
      if (typeof totalGoalInput === 'number' && totalGoalInput > 0) {
        await onSetTotalBudget(totalGoalInput);
      }

      // 2. Process deletions
      for (const delId of deletedIds) {
        await onDeleteBudgetItem(delId);
      }

      // 3. Process items (create new or update existing)
      for (const item of items) {
        if (item.isNew || !item.originalId) {
          await onCreateBudgetItem({
            category: item.category.trim(),
            allocated: Number(item.allocated) || 0,
            used: Number(item.used) || 0,
            notes: item.notes?.trim() || undefined
          });
        } else {
          await onUpdateBudgetItem(item.originalId, {
            category: item.category.trim(),
            allocated: Number(item.allocated) || 0,
            used: Number(item.used) || 0,
            notes: item.notes?.trim() || undefined
          });
        }
      }

      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al actualizar el presupuesto total.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-2xl overflow-hidden z-10 p-6 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-3 border-b border-outline-variant/30">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">account_balance_wallet</span>
            <div>
              <h3 className="font-headline-sm text-lg font-bold text-on-surface">Modificar Presupuesto Total y Gastos</h3>
              <p className="text-xs text-secondary font-body-md">Moneda: Peso Dominicano (RD$)</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-error/10 text-error text-xs font-body-md border border-error/20 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* EDITABLE TOTAL BUDGET INPUT FIELD */}
          <div className="bg-primary/5 p-4 rounded-2xl border border-primary/30">
            <label className="block text-xs font-label-caps text-primary font-bold uppercase tracking-wider mb-2">
              Monto Total Presupuestado (RD$) *
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-base text-primary font-bold">RD$</span>
              <input
                type="number"
                required
                min="0"
                step="1000"
                placeholder="Ej. 1000000"
                value={totalGoalInput}
                onChange={e => setTotalGoalInput(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-primary/30 bg-surface-container-lowest text-on-surface text-lg font-bold outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <p className="text-[11px] text-secondary mt-1.5 font-body-md">
              Ingresa el dinero total disponible para tu boda. De este monto se restarán los gastos que agregues a continuación.
            </p>
          </div>

          {/* Live Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-surface-container-low/70 p-3.5 rounded-xl border border-outline-variant/40">
              <span className="text-[10px] font-label-caps text-secondary block uppercase tracking-wider mb-1">Presupuesto Total</span>
              <span className="text-lg font-display-lg font-bold text-primary block truncate">
                {formatCurrency(currentGoal)}
              </span>
            </div>

            <div className="bg-amber-500/5 p-3.5 rounded-xl border border-amber-500/20">
              <span className="text-[10px] font-label-caps text-secondary block uppercase tracking-wider mb-1">Total Gastado / Pagado</span>
              <span className="text-lg font-display-lg font-bold text-amber-700 dark:text-amber-400 block truncate">
                {formatCurrency(totalUsed)}
              </span>
            </div>

            <div className="bg-emerald-500/5 p-3.5 rounded-xl border border-emerald-500/20">
              <span className="text-[10px] font-label-caps text-secondary block uppercase tracking-wider mb-1">Saldo Disponible</span>
              <span className="text-lg font-display-lg font-bold text-emerald-700 dark:text-emerald-400 block truncate">
                {formatCurrency(totalRemaining)}
              </span>
            </div>
          </div>

          {/* List of Gastos / Partidas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-label-caps font-bold text-on-surface uppercase tracking-wider">
                Partidas de Gasto ({items.length})
              </label>
              <span className="text-[11px] text-secondary">Ajusta los gastos individuales</span>
            </div>

            <div className="max-h-[40vh] overflow-y-auto space-y-3 pr-1">
              {items.length === 0 ? (
                <div className="p-6 text-center text-secondary border border-dashed border-outline-variant/60 rounded-xl">
                  <p className="text-xs">No hay gastos añadidos aún. Haz clic abajo para agregar tu primera partida.</p>
                </div>
              ) : (
                items.map((item, idx) => (
                  <div 
                    key={item.tempId} 
                    className="p-3.5 bg-surface-container-low/60 rounded-xl border border-outline-variant/40 space-y-3 animate-in fade-in duration-150"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-secondary w-5">{idx + 1}.</span>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Catering, Fotografía, Lugar, Música..."
                        value={item.category}
                        onChange={e => handleItemChange(item.tempId, 'category', e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface text-xs font-bold focus:border-primary outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.tempId)}
                        className="p-1.5 text-outline hover:text-rose-600 transition-colors rounded-lg flex items-center justify-center"
                        title="Eliminar esta partida"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-7">
                      <div>
                        <label className="block text-[10px] font-label-caps text-secondary mb-1">Presupuestado (RD$)</label>
                        <div className="relative flex items-center">
                          <span className="absolute left-2.5 text-xs text-secondary font-bold">RD$</span>
                          <input
                            type="number"
                            min="0"
                            step="500"
                            placeholder="0"
                            value={item.allocated || ''}
                            onChange={e => handleItemChange(item.tempId, 'allocated', Number(e.target.value) || 0)}
                            className="w-full pl-10 pr-2 py-1.5 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface text-xs font-bold text-right outline-none focus:border-primary"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-label-caps text-secondary mb-1">Gastado / Pagado (RD$)</label>
                        <div className="relative flex items-center">
                          <span className="absolute left-2.5 text-xs text-secondary font-bold">RD$</span>
                          <input
                            type="number"
                            min="0"
                            step="500"
                            placeholder="0"
                            value={item.used || ''}
                            onChange={e => handleItemChange(item.tempId, 'used', Number(e.target.value) || 0)}
                            className="w-full pl-10 pr-2 py-1.5 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface text-xs font-bold text-right outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add New Expense Line Button */}
          <button
            type="button"
            onClick={handleAddNewItem}
            className="w-full py-2.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 text-primary font-label-caps text-xs font-bold hover:bg-primary/10 transition-all flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            <span>+ AGREGAR OTRA PARTIDA DE GASTO</span>
          </button>

          {/* Modal Actions */}
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
              {isSubmitting ? 'Guardando Cambios...' : 'Guardar Presupuesto Total'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
