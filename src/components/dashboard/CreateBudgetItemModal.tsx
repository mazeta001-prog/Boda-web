"use client";

import React, { useState, useEffect } from 'react';
import { BudgetItem, BudgetPayment } from '@/types/database';

interface CreateBudgetItemModalProps {
  itemToEdit?: BudgetItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: {
    category: string;
    allocated: number;
    used: number;
    notes?: string;
    image_url?: string;
    payments?: BudgetPayment[];
  }) => Promise<void>;
}

export function CreateBudgetItemModal({ itemToEdit, isOpen, onClose, onSubmit }: CreateBudgetItemModalProps) {
  const [category, setCategory] = useState('');
  const [allocated, setAllocated] = useState<number | ''>('');
  const [used, setUsed] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [payments, setPayments] = useState<BudgetPayment[]>([]);

  // New Payment state
  const [newPaymentAmount, setNewPaymentAmount] = useState<number | ''>('');
  const [newPaymentDate, setNewPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newPaymentNote, setNewPaymentNote] = useState<string>('');
  const [showAddPayment, setShowAddPayment] = useState(false);

  // Image full preview modal
  const [showFullImage, setShowFullImage] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (itemToEdit) {
      setCategory(itemToEdit.category || '');
      setAllocated(itemToEdit.allocated || 0);
      setUsed(itemToEdit.used || 0);
      setNotes(itemToEdit.notes || '');
      setImageUrl(itemToEdit.image_url || '');
      setPayments(itemToEdit.payments || []);
      setErrorMessage('');
    } else {
      setCategory('');
      setAllocated('');
      setUsed(0);
      setNotes('');
      setImageUrl('');
      setPayments([]);
      setErrorMessage('');
    }
    setShowAddPayment(false);
    setNewPaymentAmount('');
    setNewPaymentDate(new Date().toISOString().split('T')[0]);
    setNewPaymentNote('');
  }, [itemToEdit, isOpen]);

  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', maximumFractionDigits: 0 }).format(amount);
  };

  const currentAllocated = Number(allocated) || 0;
  const currentUsed = Number(used) || 0;
  const pendingAmount = Math.max(0, currentAllocated - currentUsed);
  const isFullyPaid = currentAllocated > 0 && currentUsed >= currentAllocated;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setErrorMessage('La imagen es demasiado grande (máximo 8MB).');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPayment = () => {
    if (!newPaymentAmount || Number(newPaymentAmount) <= 0) {
      setErrorMessage('Ingresa un monto válido para el abono.');
      return;
    }
    if (!newPaymentDate) {
      setErrorMessage('Selecciona una fecha para el abono.');
      return;
    }

    const amt = Number(newPaymentAmount);
    const newPayment: BudgetPayment = {
      id: 'pay-' + Date.now(),
      amount: amt,
      date: newPaymentDate,
      note: newPaymentNote.trim() || undefined
    };

    setPayments(prev => [newPayment, ...prev]);
    setUsed(prev => prev + amt);
    
    // Reset payment fields
    setNewPaymentAmount('');
    setNewPaymentNote('');
    setShowAddPayment(false);
    setErrorMessage('');
  };

  const handleRemovePayment = (paymentId: string) => {
    const paymentToRemove = payments.find(p => p.id === paymentId);
    if (paymentToRemove) {
      setPayments(prev => prev.filter(p => p.id !== paymentId));
      setUsed(prev => Math.max(0, prev - paymentToRemove.amount));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category.trim()) {
      setErrorMessage('Por favor ingresa la categoría o concepto del gasto.');
      return;
    }
    if (allocated === '' || Number(allocated) < 0) {
      setErrorMessage('Por favor ingresa un presupuesto asignado válido.');
      return;
    }

    let finalPayments = [...payments];
    let finalUsed = Number(used) || 0;

    // Si hay un abono rellenado en el formulario inline sin haberle dado a "Confirmar Abono", procesarlo automáticamente
    if (showAddPayment && newPaymentAmount && Number(newPaymentAmount) > 0) {
      if (!newPaymentDate) {
        setErrorMessage('Selecciona una fecha para el abono.');
        return;
      }
      const amt = Number(newPaymentAmount);
      const autoPayment: BudgetPayment = {
        id: 'pay-' + Date.now(),
        amount: amt,
        date: newPaymentDate,
        note: newPaymentNote.trim() || undefined
      };
      finalPayments = [autoPayment, ...finalPayments];
      finalUsed += amt;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await onSubmit({
        category: category.trim(),
        allocated: Number(allocated),
        used: finalUsed,
        notes: notes.trim() || undefined,
        image_url: imageUrl || undefined,
        payments: finalPayments.length > 0 ? finalPayments : undefined
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar la partida presupuestaria.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-2xl overflow-hidden z-10 p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-outline-variant/30 shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">payments</span>
            <div>
              <h3 className="font-headline-sm text-lg font-bold text-on-surface">
                {itemToEdit ? 'Editar Partida Presupuestaria' : 'Añadir Nueva Partida'}
              </h3>
              <p className="text-xs text-secondary">Control de abonos, fechas y comprobantes (RD$)</p>
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
          <div className="mb-4 p-3 rounded-xl bg-error/10 text-error text-xs font-body-md border border-error/20 flex items-center gap-2 shrink-0">
            <span className="material-symbols-outlined text-sm">error</span>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto pr-1 flex-1">
          
          {/* Categoría y Presupuesto Asignado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-label-caps text-secondary mb-1">Categoría / Concepto *</label>
              <input
                type="text"
                required
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="Ej. Catering, Fotografía, Música..."
                className="w-full px-3.5 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-low text-on-surface text-xs font-bold focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-label-caps text-secondary mb-1">Presupuesto Asignado (RD$) *</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-bold text-secondary">RD$</span>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={allocated}
                  onChange={e => setAllocated(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="100000"
                  className="w-full pl-10 pr-3 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-low text-on-surface text-xs font-bold focus:border-primary outline-none"
                />
              </div>
            </div>
          </div>

          {/* Estado de Pagos & Resumen de Abonos */}
          <div className="p-4 rounded-xl bg-surface-container-low/70 border border-outline-variant/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-label-caps text-secondary uppercase block">Monto Abonado / Ejecutado Total</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(currentUsed)}</span>
                <span className="text-xs text-secondary"> de {formatCurrency(currentAllocated)}</span>
              </div>

              {isFullyPaid ? (
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Saldado por Completo
                </span>
              ) : (
                <span className="px-3 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-full text-xs font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">pending</span>
                  Pendiente: {formatCurrency(pendingAmount)}
                </span>
              )}
            </div>

            {/* Botón para Añadir Nuevo Abono con Fecha */}
            {!isFullyPaid && !showAddPayment && (
              <button
                type="button"
                onClick={() => setShowAddPayment(true)}
                className="w-full py-2 px-3 rounded-lg border border-dashed border-primary/50 bg-primary/5 text-primary text-xs font-bold hover:bg-primary/10 transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">add_circle</span>
                <span>+ AÑADIR ABONO CON FECHA</span>
              </button>
            )}

            {/* Formulario Inline para Registrar Abono */}
            {showAddPayment && (
              <div className="p-3 bg-surface-container-lowest rounded-xl border border-primary/30 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">edit_calendar</span>
                    Registrar Nuevo Abono
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddPayment(false)}
                    className="text-secondary hover:text-on-surface"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-label-caps text-secondary mb-1">Monto del Abono (RD$) *</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-xs text-secondary font-bold">RD$</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Ej. 15000"
                        value={newPaymentAmount}
                        onChange={e => setNewPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full pl-9 pr-2 py-1.5 text-xs font-bold rounded-lg border border-outline-variant/60 outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-label-caps text-secondary mb-1">Fecha del Abono *</label>
                    <input
                      type="date"
                      value={newPaymentDate}
                      onChange={e => setNewPaymentDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-outline-variant/60 outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-label-caps text-secondary mb-1">Nota / Concepto del Abono</label>
                  <input
                    type="text"
                    placeholder="Ej. Segundo abono 30%, Pago de reserva"
                    value={newPaymentNote}
                    onChange={e => setNewPaymentNote(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-outline-variant/60 outline-none focus:border-primary"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddPayment(false)}
                    className="px-3 py-1 text-xs text-secondary hover:bg-surface-container rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAddPayment}
                    className="px-3.5 py-1 text-xs font-bold bg-primary text-on-primary rounded-lg hover:bg-primary-container hover:text-on-primary-container"
                  >
                    Confirmar Abono
                  </button>
                </div>
              </div>
            )}

            {/* Historial de Abonos Registrados */}
            {payments.length > 0 && (
              <div className="pt-2 border-t border-outline-variant/30 space-y-2">
                <span className="text-[11px] font-label-caps text-secondary block">Historial de Abonos ({payments.length}):</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-xs p-2 bg-surface-container-lowest rounded-lg border border-outline-variant/30">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-on-surface">{formatCurrency(p.amount)}</span>
                          <span className="text-[11px] text-secondary bg-surface-container px-2 py-0.5 rounded-md font-mono">{p.date}</span>
                        </div>
                        {p.note && <p className="text-[11px] text-secondary truncate">{p.note}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePayment(p.id)}
                        className="text-outline hover:text-rose-600 p-1 rounded-md transition-colors"
                        title="Eliminar este abono"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* APARTADO PARA SUBIR IMAGEN / COMPROBANTE */}
          <div className="space-y-2">
            <label className="block text-xs font-label-caps text-secondary">
              Comprobante / Recibo de Pago (Imagen)
            </label>
            
            {imageUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-outline-variant/60 bg-surface-container-low p-2 flex items-center justify-between gap-3">
                <div 
                  className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
                  onClick={() => setShowFullImage(true)}
                >
                  <img 
                    src={imageUrl} 
                    alt="Comprobante" 
                    className="w-14 h-14 object-cover rounded-lg border border-outline-variant/40 group-hover:opacity-90 transition-opacity" 
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-on-surface block truncate">Comprobante Adjunto</span>
                    <span className="text-[11px] text-primary group-hover:underline flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      Haz clic para ver completo
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="p-1.5 rounded-lg text-secondary hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                  title="Eliminar comprobante"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-outline-variant/60 rounded-xl bg-surface-container-low/50 hover:bg-surface-container-low hover:border-primary/50 cursor-pointer transition-all">
                <span className="material-symbols-outlined text-2xl text-primary mb-1">cloud_upload</span>
                <span className="text-xs font-bold text-on-surface">Subir Recibo / Comprobante de Pago</span>
                <span className="text-[11px] text-secondary mt-0.5">PNG, JPG, WEBP o GIF (Máx. 8MB)</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  className="hidden" 
                />
              </label>
            )}
          </div>

          {/* Notas Adicionales */}
          <div>
            <label className="block text-xs font-label-caps text-secondary mb-1">Notas / Observaciones Generales</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej. Proveedor contactado por WhatsApp, pendiente factura oficial"
              className="w-full px-3.5 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-low text-on-surface text-xs font-bold focus:border-primary outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-outline-variant/30 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-label-caps text-xs text-secondary hover:bg-surface-container transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-primary text-on-primary font-label-caps text-xs font-bold hover:bg-primary-container hover:text-on-primary-container transition-all shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : (itemToEdit ? 'Guardar Cambios' : 'Añadir Partida')}
            </button>
          </div>
        </form>

        {/* Modal de Imagen a Pantalla Completa */}
        {showFullImage && imageUrl && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setShowFullImage(false)}>
            <div className="relative max-w-3xl max-h-[90vh] bg-surface-container-lowest p-2 rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center p-3 border-b border-outline-variant/30">
                <span className="text-xs font-bold text-on-surface">Comprobante de Pago</span>
                <button onClick={() => setShowFullImage(false)} className="p-1 text-secondary hover:text-on-surface">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-2 flex items-center justify-center overflow-auto max-h-[75vh]">
                <img src={imageUrl} alt="Comprobante Completo" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
