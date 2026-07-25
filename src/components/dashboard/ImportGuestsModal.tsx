"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Guest } from '@/types/database';
import { parseAndDeduplicateExcel, ImportResult, DuplicateGuestInfo } from '@/lib/excelImporter';

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
  const [previewAnalysis, setPreviewAnalysis] = useState<ImportResult | null>(null);
  const [resultSummary, setResultSummary] = useState<{ importedCount: number; importedDuplicatesCount: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Duplicates Review State
  const [selectedDuplicateIndexes, setSelectedDuplicateIndexes] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'new' | 'duplicates'>('new');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewAnalysis(null);
      setSelectedDuplicateIndexes(new Set());
      setActiveTab('new');
      return;
    }

    let isMounted = true;
    const processPreview = async () => {
      try {
        const buffer = await selectedFile.arrayBuffer();
        const analysis = parseAndDeduplicateExcel(buffer, existingGuests);
        if (isMounted) {
          setPreviewAnalysis(analysis);
          setSelectedDuplicateIndexes(new Set());
          
          if (analysis.addedCount === 0 && analysis.duplicateGuests.length > 0) {
            setActiveTab('duplicates');
          } else {
            setActiveTab('new');
          }

          if (analysis.addedCount === 0 && analysis.duplicateGuests.length === 0) {
            setErrorMessage('El archivo no contiene filas válidas de invitados.');
          } else {
            setErrorMessage('');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Error al analizar archivo:', err);
          setErrorMessage(err.message || 'Error al analizar el contenido del archivo.');
          setPreviewAnalysis(null);
        }
      }
    };

    processPreview();
    return () => { isMounted = false; };
  }, [selectedFile, existingGuests]);

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

  const handleToggleDuplicate = (index: number) => {
    setSelectedDuplicateIndexes(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSelectAllDuplicates = () => {
    if (!previewAnalysis) return;
    const allIndexes = new Set(previewAnalysis.duplicateGuests.map((_, i) => i));
    setSelectedDuplicateIndexes(allIndexes);
  };

  const handleDeselectAllDuplicates = () => {
    setSelectedDuplicateIndexes(new Set());
  };

  const handleConfirmImport = async () => {
    if (!previewAnalysis) return;

    const newGuests = previewAnalysis.addedGuests || [];
    const chosenDuplicates = previewAnalysis.duplicateGuests
      .filter((_, idx) => selectedDuplicateIndexes.has(idx))
      .map(d => d.guest);

    const totalToImport = [...newGuests, ...chosenDuplicates];

    if (totalToImport.length === 0) {
      setErrorMessage('No has seleccionado ningún invitado para importar.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      await onImportSuccess(totalToImport);
      setResultSummary({
        importedCount: totalToImport.length,
        importedDuplicatesCount: chosenDuplicates.length
      });
    } catch (err: any) {
      console.error('Error al importar invitados:', err);
      setErrorMessage(err.message || 'Ocurrió un error al guardar los invitados.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedFile(null);
    setPreviewAnalysis(null);
    setResultSummary(null);
    setSelectedDuplicateIndexes(new Set());
    setActiveTab('new');
    setErrorMessage('');
    onClose();
  };

  const selectedDuplicatesCount = selectedDuplicateIndexes.size;
  const totalGuestsToImport = (previewAnalysis?.addedGuests.length || 0) + selectedDuplicatesCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={handleCloseModal} />
      <div className="relative w-full max-w-3xl bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-2xl overflow-hidden z-10 p-4 sm:p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-outline-variant/30 shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">auto_awesome</span>
            <div>
              <h3 className="font-headline-sm text-lg font-bold text-on-surface">Importación Inteligente con Detección Automática</h3>
              <p className="text-xs text-secondary font-body-md">Detecta columnas, apodos y gestión interactiva de duplicados</p>
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
          <div className="mb-4 p-3 rounded-xl bg-error/10 text-error text-xs font-body-md border border-error/20 flex items-center gap-2 shrink-0">
            <span className="material-symbols-outlined text-sm">error</span>
            {errorMessage}
          </div>
        )}

        {/* Result Summary */}
        {resultSummary ? (
          <div className="space-y-4 my-4 overflow-y-auto pr-1">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-body-md">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                <span className="font-bold text-sm">¡Importación completada con éxito!</span>
              </div>
              <p>Se añadieron <strong>{resultSummary.importedCount} invitados</strong> a tu lista.</p>
              {resultSummary.importedDuplicatesCount > 0 && (
                <p className="mt-1.5 text-emerald-700 dark:text-emerald-300 font-medium">
                  ✓ Incluyendo <strong>{resultSummary.importedDuplicatesCount} invitados duplicados aceptados</strong> por ti.
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-outline-variant/30 flex justify-end shrink-0">
              <button
                onClick={handleCloseModal}
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-caps text-xs font-bold hover:bg-primary-container hover:text-on-primary-container transition-all shadow-xs"
              >
                Entendido
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            {/* File Dropzone */}
            <div 
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="p-4 border-2 border-dashed border-outline-variant/60 hover:border-primary rounded-2xl bg-surface-container-low/40 hover:bg-surface-container-low transition-all text-center cursor-pointer group shrink-0"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-1.5 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-xl">file_upload</span>
              </div>
              <p className="text-xs font-bold text-on-surface mb-0.5">
                {selectedFile ? selectedFile.name : 'Haz clic o arrastra tu archivo Excel o CSV aquí'}
              </p>
              <p className="text-[11px] text-secondary font-body-md">
                Formatos soportados: .xlsx, .xls, .csv
              </p>
            </div>

            {/* Live Auto-Detection Preview */}
            {previewAnalysis && (
              <div className="space-y-4 animate-in fade-in duration-200">
                
                {/* Header Detection Badges */}
                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">psychology</span>
                      Mapeo Automático de Casillas:
                    </span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      ✓ Detectado al 100%
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {previewAnalysis.detectedMappings.map((m) => (
                      <div key={m.fieldKey} className="inline-flex items-center gap-1 bg-surface-container-lowest border border-outline-variant/50 px-2 py-0.5 rounded text-[10px]">
                        <span className="font-bold text-on-surface">{m.fieldLabel}:</span>
                        <span className="text-primary font-mono bg-primary/10 px-1 rounded font-semibold">{m.detectedHeader}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tabs Header: Nuevos vs Duplicados */}
                <div className="flex items-center justify-between border-b border-outline-variant/40 pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('new')}
                      className={`px-3 py-1.5 rounded-xl font-label-caps text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activeTab === 'new'
                          ? 'bg-primary text-on-primary shadow-xs'
                          : 'bg-surface-container-low text-secondary hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">person_add</span>
                      <span>Nuevos Invitados ({previewAnalysis.addedGuests.length})</span>
                    </button>

                    {previewAnalysis.duplicateGuests.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('duplicates')}
                        className={`px-3 py-1.5 rounded-xl font-label-caps text-xs font-bold transition-all flex items-center gap-1.5 ${
                          activeTab === 'duplicates'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">warning</span>
                        <span>Duplicados Detectados ({previewAnalysis.duplicateGuests.length})</span>
                        {selectedDuplicatesCount > 0 && (
                          <span className="bg-white text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                            +{selectedDuplicatesCount} aceptados
                          </span>
                        )}
                      </button>
                    )}
                  </div>

                  {activeTab === 'duplicates' && previewAnalysis.duplicateGuests.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectedDuplicatesCount === previewAnalysis.duplicateGuests.length ? handleDeselectAllDuplicates : handleSelectAllDuplicates}
                        className="text-[11px] font-label-caps font-bold text-primary hover:underline"
                      >
                        {selectedDuplicatesCount === previewAnalysis.duplicateGuests.length ? 'Deseleccionar Todos' : 'Aceptar Todos los Duplicados'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Tab Content 1: Nuevos Invitados */}
                {activeTab === 'new' && (
                  <div>
                    {previewAnalysis.addedGuests.length === 0 ? (
                      <div className="py-8 text-center text-secondary bg-surface-container-low/40 rounded-xl p-4">
                        <span className="material-symbols-outlined text-3xl mb-1 text-outline">group_off</span>
                        <p className="text-xs font-bold text-on-surface">No se encontraron nuevos invitados sin duplicar</p>
                        <p className="text-[11px] text-secondary mt-1">
                          Revisa la pestaña de <strong>Duplicados Detectados ({previewAnalysis.duplicateGuests.length})</strong> para seleccionarlos si deseas importarlos.
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-52 overflow-y-auto border border-outline-variant/40 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-surface-container-low text-secondary font-label-caps text-[10px] uppercase sticky top-0 border-b border-outline-variant/40">
                            <tr>
                              <th className="p-2 pl-3">Nombre</th>
                              <th className="p-2">Apodo</th>
                              <th className="p-2">Categoría</th>
                              <th className="p-2">Email</th>
                              <th className="p-2">Teléfono</th>
                              <th className="p-2">Estado</th>
                              <th className="p-2 pr-3 text-right">Extra</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/20 bg-surface-container-lowest">
                            {previewAnalysis.addedGuests.map((g, idx) => (
                              <tr key={idx} className="hover:bg-surface-container-low/40">
                                <td className="p-2 pl-3 font-bold text-on-surface truncate max-w-[120px]">{g.full_name}</td>
                                <td className="p-2 text-secondary">{g.nickname || '-'}</td>
                                <td className="p-2 font-medium">{g.category}</td>
                                <td className="p-2 text-secondary truncate max-w-[110px]">{g.email || '-'}</td>
                                <td className="p-2 text-secondary font-mono">{g.phone || '-'}</td>
                                <td className="p-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    g.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                                    g.status === 'declined' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                                    'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                  }`}>
                                    {g.status === 'confirmed' ? 'Confirmado' : g.status === 'declined' ? 'Declinado' : 'Pendiente'}
                                  </span>
                                </td>
                                <td className="p-2 pr-3 font-bold text-right text-primary">+{g.companions_count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab Content 2: Duplicados Detectados con opción de Aceptar */}
                {activeTab === 'duplicates' && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-body-md">
                      <p className="font-bold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-amber-600">info</span>
                        Gestión Interactiva de Duplicados ({previewAnalysis.duplicateGuests.length})
                      </p>
                      <p className="text-[11px] mt-0.5 leading-relaxed">
                        Los siguientes invitados ya coinciden por nombre o correo con registros existentes. Marca los que deseas <strong>aceptar e importar de todos modos</strong> a tu lista.
                      </p>
                    </div>

                    <div className="max-h-56 overflow-y-auto border border-outline-variant/40 rounded-xl overflow-hidden divide-y divide-outline-variant/20 bg-surface-container-lowest">
                      {previewAnalysis.duplicateGuests.map((dup, idx) => {
                        const isSelected = selectedDuplicateIndexes.has(idx);
                        return (
                          <div 
                            key={idx}
                            onClick={() => handleToggleDuplicate(idx)}
                            className={`p-3 flex items-start gap-3 transition-colors cursor-pointer ${
                              isSelected ? 'bg-amber-500/10 dark:bg-amber-950/40' : 'hover:bg-surface-container-low/40'
                            }`}
                          >
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleDuplicate(idx)}
                              onClick={e => e.stopPropagation()}
                              className="mt-0.5 w-4 h-4 rounded border-outline-variant text-amber-600 focus:ring-amber-500 shrink-0 cursor-pointer"
                            />
                            
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-xs text-on-surface">
                                  {dup.guest.full_name}
                                  {dup.guest.nickname && (
                                    <span className="ml-1.5 text-primary text-[10px] font-normal bg-primary/10 px-1.5 py-0.2 rounded font-mono">
                                      "{dup.guest.nickname}"
                                    </span>
                                  )}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isSelected
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-surface-container-high text-secondary'
                                }`}>
                                  {isSelected ? '✓ Aceptado para Importar' : 'Omiso'}
                                </span>
                              </div>

                              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                                ⚠️ {dup.reason}
                              </p>

                              <div className="flex flex-wrap items-center gap-3 text-[10px] text-secondary font-mono pt-0.5">
                                {dup.guest.category && <span>🏷️ {dup.guest.category}</span>}
                                {dup.guest.phone && <span>📱 {dup.guest.phone}</span>}
                                {dup.guest.email && <span>✉️ {dup.guest.email}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Format guidance when no file selected */}
            {!selectedFile && (
              <div className="p-3.5 rounded-xl bg-surface-container-low text-xs text-secondary space-y-1.5 font-body-md border border-outline-variant/30">
                <span className="font-bold text-on-surface flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-primary">lightbulb</span>
                  Detección Inteligente & Control de Duplicados:
                </span>
                <p className="text-[11px]">
                  El sistema reconoce automáticamente todos los formatos y campos. Si tu archivo contiene personas repetidas o existentes, el sistema te permitirá <strong>verlas y decidir de forma interactiva si deseas aceptarlas o ignorarlas</strong>.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 border-t border-outline-variant/30 flex items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-secondary font-body-md">
                {previewAnalysis && (
                  <span>
                    Total a importar: <strong className="text-primary font-bold">{totalGuestsToImport}</strong>
                    {selectedDuplicatesCount > 0 && ` (${selectedDuplicatesCount} duplicados incluidos)`}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2.5 rounded-xl font-label-caps text-xs text-secondary hover:bg-surface-container transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={!selectedFile || !previewAnalysis || totalGuestsToImport === 0 || isProcessing}
                  className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-caps text-xs font-bold hover:bg-primary-container hover:text-on-primary-container transition-all shadow-xs disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">download_done</span>
                  {isProcessing ? 'Guardando en la lista...' : `Confirmar e Importar (${totalGuestsToImport})`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

