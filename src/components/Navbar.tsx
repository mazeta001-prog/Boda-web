"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface NavbarProps {
  variant?: 'main' | 'dress-code' | 'rsvp';
}

export default function Navbar({ variant = 'main' }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav 
      className={`fixed top-0 w-full z-50 backdrop-blur-md transition-all duration-500 ease-in-out ${
        isScrolled 
          ? 'bg-surface/90 dark:bg-surface-dim/90 shadow-md py-3 border-b border-outline-variant/30' 
          : 'bg-surface/75 dark:bg-surface-dim/75 py-4 border-b border-outline-variant/10'
      }`}
    >
      <div className="flex justify-between items-center max-w-container-max mx-auto px-4 sm:px-gutter">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-display-lg text-base sm:text-lg md:text-headline-sm text-primary tracking-wider sm:tracking-[0.15em] uppercase font-bold group-hover:opacity-80 transition-opacity">
            Nuestra Historia
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex space-x-8 items-center">
          <Link className="font-label-caps text-xs text-on-surface-variant hover:text-primary transition-colors tracking-widest uppercase" href="/#story">
            Historia
          </Link>
          <Link className="font-label-caps text-xs text-on-surface-variant hover:text-primary transition-colors tracking-widest uppercase" href="/#details">
            Eventos
          </Link>
          <Link className="font-label-caps text-xs text-on-surface-variant hover:text-primary transition-colors tracking-widest uppercase" href="/dress-code">
            Dress Code
          </Link>
          <Link className={`font-label-caps text-xs tracking-widest uppercase transition-colors ${
            variant === 'rsvp' 
              ? 'text-primary font-bold border-b-2 border-primary pb-0.5' 
              : 'text-on-surface-variant hover:text-primary'
          }`} href="/rsvp">
            RSVP
          </Link>
          <Link href="/login" className="font-label-caps text-xs bg-primary/10 text-primary hover:bg-primary hover:text-on-primary px-4 py-2 rounded-xl transition-all font-bold">
            Novios
          </Link>
        </div>

        {/* Action Button & Mobile Toggle */}
        <div className="flex items-center gap-3">
          <Link 
            href="/rsvp" 
            className="hidden sm:inline-block font-label-caps text-xs bg-primary text-on-primary px-5 py-2.5 rounded-full hover:scale-105 btn-shine transition-all font-bold shadow-xs"
          >
            CONFIRMAR
          </Link>
          
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="md:hidden p-2.5 text-primary hover:bg-surface-container-low active:bg-surface-container rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Abrir menú"
          >
            <span className="material-symbols-outlined text-2xl">{isOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden bg-surface-container-lowest/95 backdrop-blur-xl border-b border-outline-variant/40 px-5 py-4 space-y-1 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <Link 
            href="/#story" 
            className="flex items-center font-label-caps text-sm text-on-surface hover:text-primary transition-colors py-3 px-3 rounded-xl hover:bg-surface-container-low active:bg-surface-container border-b border-outline-variant/10 font-medium"
            onClick={() => setIsOpen(false)}
          >
            Historia
          </Link>
          <Link 
            href="/#details" 
            className="flex items-center font-label-caps text-sm text-on-surface hover:text-primary transition-colors py-3 px-3 rounded-xl hover:bg-surface-container-low active:bg-surface-container border-b border-outline-variant/10 font-medium"
            onClick={() => setIsOpen(false)}
          >
            Eventos
          </Link>
          <Link 
            href="/dress-code" 
            className="flex items-center font-label-caps text-sm text-on-surface hover:text-primary transition-colors py-3 px-3 rounded-xl hover:bg-surface-container-low active:bg-surface-container border-b border-outline-variant/10 font-medium"
            onClick={() => setIsOpen(false)}
          >
            Dress Code
          </Link>
          <Link 
            href="/rsvp" 
            className="flex items-center justify-between font-label-caps text-sm text-primary font-bold transition-colors py-3 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 border-b border-outline-variant/10"
            onClick={() => setIsOpen(false)}
          >
            <span>RSVP (Buscar Invitación)</span>
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </Link>
          <Link 
            href="/login" 
            className="flex items-center font-label-caps text-sm text-secondary hover:text-primary transition-colors py-3 px-3 rounded-xl hover:bg-surface-container-low font-medium"
            onClick={() => setIsOpen(false)}
          >
            Acceso Novios
          </Link>
        </div>
      )}
    </nav>
  );
}
