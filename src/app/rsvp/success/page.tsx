"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';

export default function RSVPSuccess() {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimate(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-surface text-on-surface font-body-md antialiased min-h-screen flex flex-col">
      {/* Top Navigation is intentionally omitted here as this is a transactional success screen */}
      
      {/* Main Content Canvas */}
      <main className="flex-grow flex items-center justify-center px-gutter py-section-padding-desktop">
        <div className={`max-w-[800px] w-full text-center transition-all duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          
          {/* Logo & Brand Header */}
          <div className="mb-12 flex flex-col items-center">
            <img 
              alt="Nuestra Historia Logo" 
              className="w-32 h-32 object-contain mb-8" 
              src="https://lh3.googleusercontent.com/aida/AP1WRLuako6cstzAWsHNS7fPUs4CQgGYpd7M7f6ow5oVU_tfCTKJHzh1__HaWoljvI_xIyq4pS0U5baFU0HrHM49KNyGyNeu8l__g-rUQLT6umdh6dopo7FaYKcZk3r_M7dzI4oLaNaadSdZZ0oJvWA48vkDNkFGQw3FhlVvD-7XfGnbdVnXgyiR0x2Y03kBnrlD77zFcd89KTppQgIcu-7Q0fjzIZVOpQr9lBkqCuYjwa3kJr9E1sGNx-MyriEW" 
            />
            <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary-container mb-4 font-headline-md tracking-widest">
              Confirmación Exitosa
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
              ¡Estamos muy emocionados de compartir este día tan especial con ustedes! Gracias por hacérnoslo saber.
            </p>
          </div>

          {/* RSVP Summary Card */}
          <div className="bg-surface-container-lowest border border-tertiary-fixed champagne-shadow rounded-DEFAULT p-8 md:p-12 mb-12 mx-auto max-w-xl">
            <h2 className="font-headline-sm text-headline-sm text-primary mb-8 border-b border-primary/20 pb-4 inline-block px-8">
              Your Selection
            </h2>
            <div className="space-y-6 text-left max-w-sm mx-auto">
              <div className="flex justify-between items-center border-b border-surface-variant pb-2">
                <span className="font-label-caps text-label-caps text-on-surface-variant">Status</span>
                <span className="font-body-md text-body-md text-primary flex items-center">
                  <span className="material-symbols-outlined mr-2" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                  Attending
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8">
            <Link 
              className="inline-block bg-primary-container text-on-primary px-8 py-4 font-label-caps text-label-caps tracking-widest transition-opacity hover:opacity-90 w-full sm:w-auto text-center rounded-DEFAULT" 
              href="/"
            >
              Back to Home
            </Link>
            <a 
              className="inline-flex items-center justify-center border border-primary-container text-primary-container px-8 py-4 font-label-caps text-label-caps tracking-widest transition-colors hover:bg-primary-container/5 w-full sm:w-auto text-center rounded-DEFAULT" 
              href="#"
            >
              <span className="material-symbols-outlined mr-2">calendar_today</span>
              Add to Calendar
            </a>
          </div>
        </div>
      </main>

      <Footer variant="rsvp" />
    </div>
  );
}
