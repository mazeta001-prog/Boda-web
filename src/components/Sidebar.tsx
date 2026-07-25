"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SettingsModal } from '@/components/dashboard/SettingsModal';

interface SidebarProps {
  variant?: 'novios' | 'admin';
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ variant = 'novios', isOpenMobile = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const menuItems = [
    {
      name: 'Panel de Control',
      icon: 'dashboard',
      href: '/dashboard',
    },
    {
      name: 'Invitados',
      icon: 'group',
      href: '/dashboard/guests',
    },
    {
      name: 'Configuración',
      icon: 'settings',
      href: '#',
    },
  ];

  const content = (
    <div className="flex flex-col h-full bg-surface-container-lowest border-r border-outline-variant/50">
      <div className="p-6 md:p-8 flex items-center justify-between">
        <h1 className="font-display-lg text-lg md:text-headline-sm tracking-widest text-primary-container font-bold">
          NUESTRA HISTORIA
        </h1>
        {onCloseMobile && (
          <button 
            onClick={onCloseMobile}
            className="md:hidden p-2 text-secondary hover:text-on-surface rounded-xl hover:bg-surface-container-low transition-colors touch-target"
            aria-label="Cerrar menú"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        )}
      </div>
      <nav className="flex-1 px-4 space-y-2 mt-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const isConfig = item.name === 'Configuración';
          
          if (isConfig) {
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => {
                  setIsSettingsOpen(true);
                  if (onCloseMobile) onCloseMobile();
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-secondary hover:bg-surface-container-low hover:text-on-surface text-left"
              >
                <span className="material-symbols-outlined text-xl">
                  {item.icon}
                </span>
                <span className="font-label-caps text-xs tracking-wider">{item.name}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-secondary hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              <span 
                className="material-symbols-outlined text-xl"
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : undefined }}
              >
                {item.icon}
              </span>
              <span className="font-label-caps text-xs tracking-wider">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-6 border-t border-outline-variant/40">
        {variant === 'novios' ? (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-tertiary-fixed border border-outline-variant/60 flex items-center justify-center overflow-hidden shrink-0">
              <span className="material-symbols-outlined text-primary">person</span>
            </div>
            <div className="overflow-hidden">
              <p className="font-body-md text-sm font-semibold truncate text-on-surface">Carlos &amp; Elena</p>
              <p className="font-body-md text-xs text-secondary truncate">carloselena@wedding.com</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-primary-fixed-dim flex items-center justify-center text-on-primary-fixed font-bold">
              A
            </div>
            <div>
              <p className="text-on-surface font-label-caps text-[10px]">ADMINISTRADOR</p>
              <p className="text-secondary text-[12px] font-body-md">Adriana &amp; Mateo</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex w-64 fixed left-0 top-0 h-full z-20">
        {content}
      </aside>

      {/* Mobile Sidebar Overlay Drawer */}
      {isOpenMobile && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-on-surface/30 backdrop-blur-xs" 
            onClick={onCloseMobile}
          />
          <aside className="relative w-64 max-w-[80vw] h-full z-10 animate-in slide-in-from-left duration-200">
            {content}
          </aside>
        </div>
      )}
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </>
  );
}
