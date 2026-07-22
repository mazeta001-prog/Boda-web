"use client";

import React from 'react';
import Link from 'next/link';

interface QuickActionsBentoProps {
  onOpenCreateGuest: () => void;
}

export function QuickActionsBento({ onOpenCreateGuest }: QuickActionsBentoProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-xl">bolt</span>
        <h2 className="font-headline-sm text-lg font-bold text-on-surface">Acciones Rápidas</h2>
      </div>

      {/* Reorganized Modern Card Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Action 1: Añadir Invitado */}
        <button
          onClick={onOpenCreateGuest}
          className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/40 hover:border-primary transition-all text-left shadow-xs group flex flex-col justify-between h-52 relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3.5 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
              <span className="material-symbols-outlined text-3xl">person_add</span>
            </div>
            <span className="p-2 rounded-full bg-surface-container-low text-secondary group-hover:translate-x-1 transition-transform">
              <span className="material-symbols-outlined text-lg">add</span>
            </span>
          </div>
          <div>
            <span className="text-[10px] font-label-caps uppercase text-primary tracking-widest font-bold block mb-1">
              Registro Rápido
            </span>
            <h3 className="font-bold text-on-surface text-xl mb-1">Añadir Nuevo Invitado</h3>
            <p className="text-xs text-secondary font-body-md">
              Registra una persona o familia a la lista oficial con preferencias de menú y acompañantes.
            </p>
          </div>
        </button>

        {/* Action 2: Abrir Invitados Banner */}
        <Link 
          href="/dashboard/guests"
          className="relative h-52 rounded-2xl overflow-hidden group shadow-xs flex flex-col justify-end p-6 border border-outline-variant/30"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 z-10"></div>
          <img 
            alt="Lista de Invitados" 
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
            src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80"
          />
          <div className="relative z-20 flex justify-between items-end">
            <div>
              <span className="text-[10px] font-label-caps uppercase text-white/80 tracking-widest block mb-1">
                Módulo Directo
              </span>
              <h3 className="font-display-lg text-xl text-white font-bold">Abrir Gestión de Invitados</h3>
              <p className="text-xs text-white/80 font-body-md">
                Administra confirmaciones, pases, dietas e itinerarios individuales.
              </p>
            </div>
            <span className="bg-white/20 backdrop-blur-md text-white p-3 rounded-xl group-hover:bg-primary group-hover:text-on-primary transition-colors shrink-0">
              <span className="material-symbols-outlined text-xl">arrow_forward</span>
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
