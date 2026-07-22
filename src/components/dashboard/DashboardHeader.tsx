"use client";

import React, { useState, useEffect } from 'react';

interface DashboardHeaderProps {
  unreadNotificationsCount: number;
  onOpenNotifications: () => void;
  onOpenSearch: () => void;
  onOpenCreateGuest: () => void;
  onOpenMobileSidebar?: () => void;
}

export function DashboardHeader({
  unreadNotificationsCount,
  onOpenNotifications,
  onOpenSearch,
  onOpenCreateGuest,
  onOpenMobileSidebar
}: DashboardHeaderProps) {
  const [darkMode, setDarkMode] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark');
      setDarkMode(isDark);
    }
  }, []);

  const toggleDarkMode = () => {
    if (typeof window !== 'undefined') {
      const newMode = !darkMode;
      setDarkMode(newMode);
      if (newMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-surface/85 backdrop-blur-md border-b border-outline-variant/40 px-4 sm:px-6 py-3.5 flex items-center justify-between transition-colors">
      {/* Mobile Menu & Branding */}
      <div className="flex items-center gap-3 md:hidden">
        {onOpenMobileSidebar && (
          <button 
            onClick={onOpenMobileSidebar}
            className="p-2 text-secondary hover:text-primary transition-colors bg-surface-container-low rounded-xl"
            aria-label="Abrir menú"
          >
            <span className="material-symbols-outlined text-[20px]">menu</span>
          </button>
        )}
        <div className="font-display-lg text-base sm:text-lg font-bold text-primary tracking-widest uppercase">
          NUESTRA HISTORIA
        </div>
      </div>

      {/* Quick Search Button / Trigger */}
      <div className="hidden md:flex items-center">
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-3 bg-surface-container-low/70 hover:bg-surface-container px-4 py-2 rounded-xl border border-outline-variant/40 text-secondary hover:text-on-surface transition-all w-72 text-xs font-body-md shadow-2xs"
        >
          <span className="material-symbols-outlined text-lg text-primary">search</span>
          <span>Buscar invitados...</span>
          <kbd className="ml-auto px-1.5 py-0.5 text-[10px] font-mono bg-surface-container-high rounded border border-outline-variant/30 text-secondary">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Search Icon */}
        <button
          onClick={onOpenSearch}
          className="md:hidden p-2 text-secondary hover:text-primary transition-colors bg-surface-container-low rounded-xl"
          aria-label="Buscar"
        >
          <span className="material-symbols-outlined text-[20px]">search</span>
        </button>

        {/* Quick Add Guest Button */}
        <button
          onClick={onOpenCreateGuest}
          className="inline-flex items-center gap-1.5 bg-primary text-on-primary px-3 sm:px-3.5 py-2 rounded-xl text-xs font-label-caps font-bold hover:bg-primary-container hover:text-on-primary-container transition-all shadow-xs"
        >
          <span className="material-symbols-outlined text-base">person_add</span>
          <span className="hidden sm:inline">Invitado</span>
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 text-secondary hover:text-primary transition-colors bg-surface-container-low rounded-xl"
          title={darkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
          aria-label="Modo Oscuro"
        >
          <span className="material-symbols-outlined text-[20px]">
            {darkMode ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 text-secondary hover:text-primary transition-colors bg-surface-container-low rounded-xl"
          aria-label="Notificaciones"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-error text-on-error text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-surface animate-pulse">
              {unreadNotificationsCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
