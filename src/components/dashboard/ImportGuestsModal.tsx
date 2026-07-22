"use client";

import React, { useState, useRef } from 'react';
import { Guest } from '@/types/database';
import { parseAndDeduplicateExcel, ImportResult } from '@/lib/excelImporter';

interface ImportGuestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingGuests: Guest[];
  onImportSuccess: (newGuests: Omit<Guest, 'id' | 'created_at' | 'updated_at'>[]) => Promise<void>;
}

export function ImportGuestsModal({
  isOpen,
  onClose,
  existingGuests,
  onImportSuccess
}: ImportGuestsModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultSummary, setResultSummary] = useState<ImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setErrorMessage('');
      setResultSummary(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        setSelectedFile(file);
        setErrorMessage('');
        setResultSummary(null);
      } else {
        setErrorMessage('Por favor selecciona un archivo Excel (.xlsx, .xls) o CSV válido.');
      }
    }
  };

  const handleProcessImport = async () => {
    if (!selectedFile) {
      setErrorMessage('Por favor selecciona un archivo Excel.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const buffer = await selectedFile.arrayBuffer();
      const result = parseAndDeduplicateExcel(buffer, existingGuests);

      if (result.addedCount === 0 && result.skippedDuplicatesCount === 0) {
        setErrorMessage('El archivo no contiene filas válidas de invitados.');
        setIsProcessing(false);
        return;
      }

      if (result.addedGuests.length > 0) {
        await onImportSuccess(result.addedGuests);
      }

      setResultSummary(result);
    } catch (err: any) {
      console.error('Error al procesar archivo Excel:', err);
      setErrorMessage(err.message || 'Ocurrió un error al leer el archivo Excel.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedFile(null);
    setResultSummary(null);
    setErrorMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={handleCloseModal} />
      <div className="relative w-full max-w-xl bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-2xl overflow-hidden z-10 p-6 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-outline-variant/30">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">upload_file</span>
            <div>
              <h3 className="font-headline-sm text-lg font-bold text-on-surface">Importar Invitados desde Excel</h3>
              <p className="text-xs text-secondary font-body-md">Lee apodos, nombres y obvia duplicados automáticamente</p>
            </div>
          </div>
          <button 
            onClick={handleCloseModal}
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

        {/* Result Summary */}
        {resultSummary ? (
          <div className="space-y-4 my-4">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-body-md">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                <span className="font-bold text-sm">¡Importación completada con éxito!</span>
              </div>
              <p>Se añadieron <strong>{resultSummary.addedCount} nuevos invitados</strong> a la lista.</p>
              {resultSummary.skippedDuplicatesCount > 0 && (
                <p className="mt-1 text-amber-700 dark:text-amber-400 font-medium">
                  ⚠️ <strong>{resultSummary.skippedDuplicatesCount} nombres repetidos fueron obviados</strong> automáticamente para evitar duplicados.
                </p>
              )}
            </div>

            {resultSummary.skippedNames.length > 0 && (
              <div className="max-h-32 overflow-y-auto p-3 rounded-xl bg-surface-container-low text-xs space-y-1">
                <span className="font-bold text-secondary block mb-1">Duplicados obviados:</span>
                {resultSummary.skippedNames.map((name, i) => (
                  <span key={i} className="inline-block bg-surface-container px-2 py-0.5 rounded text-[11px] text-secondary mr-1 mb-1">
                    {name}
                  </span>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-outline-variant/30 flex justify-end">
              <button
                onClick={handleCloseModal}
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-caps text-xs font-bold hover:bg-primary-container hover:text-on-primary-container transition-all shadow-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* File Dropzone */}
            <div 
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="p-8 border-2 border-dashed border-outline-variant/60 hover:border-primary rounded-2xl bg-surface-container-low/40 hover:bg-surface-container-low transition-all text-center cursor-pointer group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-2xl">description</span>
              </div>
              <p className="text-sm font-bold text-on-surface mb-1">
                {selectedFile ? selectedFile.name : 'Haz clic o arrastra tu archivo Excel aquí'}
              </p>
              <p className="text-xs text-secondary font-body-md">
                Formatos soportados: .xlsx, .xls, .csv
              </p>
            </div>

            {/* Excel format tips */}
            <div className="p-3.5 rounded-xl bg-surface-container-low text-xs text-secondary space-y-1.5 font-body-md border border-outline-variant/30">
              <span className="font-bold text-on-surface flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-primary">lightbulb</span>
                Formato flexible recomendado:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                <li><strong>Nombre / Nombre Completo</strong>: Ej. "Carlos Rodríguez" o "José 'Pepe' Pérez"</li>
                <li><strong>Apodo / Alias</strong>: Ej. "Pepe", "Mari" (1 a 2 apodos)</li>
                <li><strong>Categoría</strong>: Familia, Amigos, Conocidos</li>
                <li><strong>Estado</strong>: Confirmado, Pendiente, Declinado</li>
              </ul>
              <p className="text-[10px] text-primary font-medium pt-1">
                * Si un nombre ya existe en la lista, el sistema lo obviará y agregará solo los nuevos.
              </p>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-outline-variant/30 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2.5 rounded-xl font-label-caps text-xs text-secondary hover:bg-surface-container transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleProcessImport}
                disabled={!selectedFile || isProcessing}
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-caps text-xs font-bold hover:bg-primary-container hover:text-on-primary-container transition-all shadow-xs disabled:opacity-50 inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">upload</span>
                {isProcessing ? 'Procesando Excel...' : 'Importar Invitados'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
