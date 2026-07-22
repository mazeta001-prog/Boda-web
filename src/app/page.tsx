"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function Home() {
  const [timeLeft, setTimeLeft] = useState({ days: 104, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    // Reveal on Scroll
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    // Countdown Logic for December 20, 2026
    const targetDate = new Date('December 20, 2026 16:00:00').getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      if (distance < 0) {
        setIsExpired(true);
      } else {
        setTimeLeft({ days, hours, minutes, seconds });
      }
    };
    
    updateCountdown();
    const countdownInterval = setInterval(updateCountdown, 1000);

    return () => {
      observer.disconnect();
      clearInterval(countdownInterval);
    };
  }, []);

  return (
    <>
      <Navbar variant="main" />
      
      {/* Hero Section */}
      <header className="relative min-h-screen flex items-center justify-center overflow-hidden reveal active pt-20 pb-12">
        <div className="absolute inset-0 z-0">
          <img 
            alt="Fondo de boda" 
            className="w-full h-full object-cover scale-105 transition-transform duration-1000 brightness-90" 
            src="https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2000&auto=format&fit=crop" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-surface/50 via-surface/30 to-surface/80 backdrop-blur-[2px]"></div>
        </div>

        <div className="relative z-10 text-center px-6 py-12 md:px-16 md:py-16 max-w-3xl mx-4 backdrop-blur-xl rounded-3xl border border-white/60 bg-white/50 dark:bg-black/50 shadow-2xl animate-float-y">
          <span className="material-symbols-outlined text-primary text-3xl mb-2 animate-pulse">local_florist</span>
          
          <p className="font-label-caps text-xs sm:text-sm text-secondary tracking-[0.3em] uppercase mb-2 font-bold">
            ¡Nos Casamos!
          </p>

          <h1 className="font-display-lg text-4xl sm:text-6xl md:text-7xl text-primary mb-4 tracking-tight font-extrabold">
            Iván &amp; Dana
          </h1>

          <div className="flex justify-center items-center gap-4 mb-6">
            <div className="h-[1px] w-12 bg-primary/40"></div>
            <span className="material-symbols-outlined text-primary text-base">favorite</span>
            <div className="h-[1px] w-12 bg-primary/40"></div>
          </div>

          <p className="font-body-lg text-sm sm:text-base text-on-surface mb-8 max-w-xl mx-auto font-light leading-relaxed">
            Nos encantaría celebrar el día más importante de nuestras vidas acompañados de nuestros seres queridos.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link 
              className="w-full sm:w-auto font-label-caps text-xs sm:text-sm border-2 border-primary bg-primary text-on-primary px-8 py-4 rounded-full hover:bg-primary-container hover:border-primary-container transition-all duration-300 tracking-[0.2em] shadow-lg hover:scale-105 btn-shine font-bold" 
              href="/rsvp"
            >
              BUSCAR MI INVITACIÓN (RSVP)
            </Link>
            
            <Link 
              className="w-full sm:w-auto font-label-caps text-xs sm:text-sm border border-outline-variant bg-surface-container-lowest/80 text-on-surface px-8 py-4 rounded-full hover:bg-surface-container transition-all duration-300 tracking-[0.2em] font-bold" 
              href="#details"
            >
              VER DETALLES
            </Link>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce opacity-60">
          <span className="material-symbols-outlined text-3xl text-primary">keyboard_double_arrow_down</span>
        </div>
      </header>

      {/* Countdown Section */}
      <section className="py-20 bg-surface border-y border-outline-variant/30 reveal active">
        <div className="max-w-container-max mx-auto px-gutter text-center">
          <div className="inline-block border border-primary/40 rounded-full px-8 py-2.5 mb-10 bg-primary/5">
            <h2 className="font-label-caps text-xs text-primary tracking-widest font-bold">CUENTA REGRESIVA</h2>
          </div>

          {isExpired ? (
            <div id="countdown" className="flex justify-center">
              <span className="font-display-lg text-3xl text-primary font-bold">¡El gran día ha llegado!</span>
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-4 sm:gap-8 md:gap-12" id="countdown">
              <div className="flex flex-col items-center bg-surface-container-lowest border border-outline-variant/40 p-5 sm:p-6 rounded-2xl min-w-[90px] sm:min-w-[110px] shadow-xs">
                <span className="font-display-lg text-3xl sm:text-5xl text-primary font-bold">
                  {String(timeLeft.days).padStart(3, '0')}
                </span>
                <span className="font-label-caps text-[10px] tracking-[0.2em] text-secondary mt-2 border-t border-primary/20 pt-2 w-full text-center font-bold">DÍAS</span>
              </div>
              <div className="flex flex-col items-center bg-surface-container-lowest border border-outline-variant/40 p-5 sm:p-6 rounded-2xl min-w-[90px] sm:min-w-[110px] shadow-xs">
                <span className="font-display-lg text-3xl sm:text-5xl text-primary font-bold">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span className="font-label-caps text-[10px] tracking-[0.2em] text-secondary mt-2 border-t border-primary/20 pt-2 w-full text-center font-bold">HORAS</span>
              </div>
              <div className="flex flex-col items-center bg-surface-container-lowest border border-outline-variant/40 p-5 sm:p-6 rounded-2xl min-w-[90px] sm:min-w-[110px] shadow-xs">
                <span className="font-display-lg text-3xl sm:text-5xl text-primary font-bold">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span className="font-label-caps text-[10px] tracking-[0.2em] text-secondary mt-2 border-t border-primary/20 pt-2 w-full text-center font-bold">MINUTOS</span>
              </div>
              <div className="flex flex-col items-center bg-surface-container-lowest border border-outline-variant/40 p-5 sm:p-6 rounded-2xl min-w-[90px] sm:min-w-[110px] shadow-xs">
                <span className="font-display-lg text-3xl sm:text-5xl text-primary font-bold">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
                <span className="font-label-caps text-[10px] tracking-[0.2em] text-secondary mt-2 border-t border-primary/20 pt-2 w-full text-center font-bold">SEGUNDOS</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Story Section */}
      <section className="py-24 bg-surface-container-lowest reveal active" id="story">
        <div className="max-w-container-max mx-auto px-4 sm:px-gutter">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <h2 className="font-display-lg text-3xl md:text-4xl text-primary mb-6 font-bold">Nuestra Historia</h2>
              <p className="font-body-lg text-on-surface-variant mb-10 italic border-l-4 border-primary pl-6 py-2 leading-relaxed text-sm sm:text-base">
                &quot;Lo que comenzó como una coincidencia se convirtió en nuestra aventura más grande. Cada paso juntos nos ha llevado a este momento, donde decidimos entrelazar nuestros destinos para siempre.&quot;
              </p>
              <div className="space-y-10 border-l-2 border-primary/30 pl-8 ml-2">
                <div className="relative group">
                  <div className="absolute -left-[41px] top-1.5 w-4 h-4 bg-primary rounded-full ring-4 ring-surface-container-lowest group-hover:scale-125 transition-transform duration-300"></div>
                  <h3 className="font-label-caps text-xs text-primary mb-1 tracking-widest font-bold">PRIMER ENCUENTRO</h3>
                  <p className="font-body-md text-secondary text-sm">Un café compartido bajo la lluvia de primavera. El momento en que supimos que algo especial estaba por comenzar.</p>
                </div>
                <div className="relative group">
                  <div className="absolute -left-[41px] top-1.5 w-4 h-4 bg-primary rounded-full ring-4 ring-surface-container-lowest group-hover:scale-125 transition-transform duration-300"></div>
                  <h3 className="font-label-caps text-xs text-primary mb-1 tracking-widest font-bold">PRIMERA CITA</h3>
                  <p className="font-body-md text-secondary text-sm">Una cena que duró horas, llena de risas y confesiones. Descubrimos que nuestras almas hablaban el mismo idioma.</p>
                </div>
                <div className="relative group">
                  <div className="absolute -left-[41px] top-1.5 w-4 h-4 bg-primary rounded-full ring-4 ring-surface-container-lowest group-hover:scale-125 transition-transform duration-300"></div>
                  <h3 className="font-label-caps text-xs text-primary mb-1 tracking-widest font-bold">LA PROPUESTA</h3>
                  <p className="font-body-md text-secondary text-sm">Bajo un cielo estrellado inolvidable, con una promesa eterna y un &apos;sí&apos; que cambió nuestras vidas.</p>
                </div>
              </div>
            </div>

            <div className="order-1 md:order-2 grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="aspect-[3/4] overflow-hidden rounded-2xl champagne-shadow border border-outline-variant/30">
                  <img 
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" 
                    src="https://images.unsplash.com/photo-1583939003579-730e3918a45a?q=80&w=800&auto=format&fit=crop"
                    alt="Nuestra historia 1" 
                  />
                </div>
                <div className="aspect-square overflow-hidden rounded-2xl champagne-shadow border border-outline-variant/30">
                  <img 
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" 
                    src="https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?q=80&w=800&auto=format&fit=crop"
                    alt="Nuestra historia 2" 
                  />
                </div>
              </div>
              <div className="pt-8">
                <div className="aspect-[3/4] overflow-hidden rounded-2xl champagne-shadow border border-outline-variant/30">
                  <img 
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" 
                    src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800&auto=format&fit=crop"
                    alt="Nuestra historia 3" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Details Section */}
      <section className="py-24 bg-surface-container-low reveal active" id="details">
        <div className="max-w-container-max mx-auto px-4 sm:px-gutter">
          <div className="text-center mb-16">
            <h2 className="font-display-lg text-3xl md:text-4xl text-primary mb-3 font-bold">Los Detalles</h2>
            <p className="font-body-lg text-secondary text-sm">Todo lo que necesitas saber para acompañarnos.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-surface-container-lowest p-8 text-center rounded-2xl border border-outline-variant/30 group hover:-translate-y-2 hover:shadow-xl transition-all duration-300">
              <span className="material-symbols-outlined text-4xl text-primary mb-4 group-hover:scale-110 transition-transform">calendar_month</span>
              <h3 className="font-label-caps text-xs text-primary mb-3 tracking-widest font-bold">FECHA Y HORA</h3>
              <p className="font-body-lg font-bold text-on-surface mb-1">20 de Diciembre, 2026</p>
              <p className="font-body-md text-secondary text-sm">16:00 Horas</p>
            </div>

            <div className="bg-surface-container-lowest p-8 text-center rounded-2xl border border-outline-variant/30 group hover:-translate-y-2 hover:shadow-xl transition-all duration-300">
              <span className="material-symbols-outlined text-4xl text-primary mb-4 group-hover:scale-110 transition-transform">location_on</span>
              <h3 className="font-label-caps text-xs text-primary mb-3 tracking-widest font-bold">LUGAR</h3>
              <p className="font-body-lg font-bold text-on-surface mb-1">Praedium Garden</p>
              <p className="font-body-md text-primary italic text-xs mb-2">(Jardín Mediterráneo)</p>
              <p className="font-body-sm text-secondary text-xs leading-relaxed">Av. Hípica V Centenario Km. 14 Las Américas, Santo Domingo Este</p>
            </div>

            <div className="bg-surface-container-lowest p-8 text-center rounded-2xl border border-outline-variant/30 group hover:-translate-y-2 hover:shadow-xl transition-all duration-300">
              <span className="material-symbols-outlined text-4xl text-primary mb-4 group-hover:scale-110 transition-transform">checkroom</span>
              <h3 className="font-label-caps text-xs text-primary mb-3 tracking-widest font-bold">DRESS CODE</h3>
              <p className="font-body-lg font-bold text-on-surface mb-5">Formal</p>
              <Link 
                className="inline-block bg-primary text-on-primary font-label-caps text-xs px-6 py-2.5 rounded-full transition-all hover:bg-primary-container font-bold shadow-xs" 
                href="/dress-code"
              >
                VER GUÍA
              </Link>
            </div>

            <div className="bg-surface-container-lowest p-8 text-center rounded-2xl border border-outline-variant/30 group hover:-translate-y-2 hover:shadow-xl transition-all duration-300" id="registry">
              <span className="material-symbols-outlined text-4xl text-primary mb-4 group-hover:scale-110 transition-transform">redeem</span>
              <h3 className="font-label-caps text-xs text-primary mb-3 tracking-widest font-bold">REGALOS</h3>
              <p className="font-body-md text-secondary text-xs mb-5">Vuestra presencia es nuestro mejor regalo. Si queréis tener un detalle...</p>
              <Link 
                className="inline-block bg-primary text-on-primary font-label-caps text-xs px-6 py-2.5 rounded-full transition-all hover:bg-primary-container font-bold shadow-xs" 
                href="https://listaderegalos.casacuesta.com/Event/DANA-and-DANA?utm_source=share"
                target="_blank"
                rel="noopener noreferrer"
              >
                MESA DE REGALOS
              </Link>
            </div>
          </div>

          <div className="mt-12 h-[380px] w-full rounded-2xl overflow-hidden border border-outline-variant/30 shadow-md relative">
            <iframe 
              src="https://maps.google.com/maps?q=Praedium+Garden+Events,Santo+Domingo&t=&z=16&ie=UTF8&iwloc=&output=embed" 
              className="absolute inset-0 w-full h-full border-0 opacity-90"
              allowFullScreen={false}
              loading="lazy"
            ></iframe>
            <div className="absolute inset-0 bg-[#F5F5F0]/60 pointer-events-none"></div>
            <a 
              href="https://maps.app.goo.gl/HjJDVV2HS6zfYF9z5" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="absolute bottom-6 right-6 z-10 bg-white dark:bg-zinc-900 px-6 py-3 rounded-full shadow-lg flex items-center gap-2 border border-primary/30 text-primary hover:bg-primary hover:text-white transition-all font-bold text-xs font-label-caps"
            >
              <span className="material-symbols-outlined text-lg">pin_drop</span>
              <span>Abrir en Google Maps</span>
            </a>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-24 bg-surface-container-lowest reveal active" id="gallery">
        <div className="max-w-container-max mx-auto px-4 sm:px-gutter">
          <h2 className="font-display-lg text-3xl md:text-4xl text-primary text-center mb-16 font-bold">Nuestros Momentos</h2>
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            <div className="break-inside-avoid relative group overflow-hidden rounded-2xl border border-outline-variant/30 shadow-sm">
              <img 
                className="w-full transition-transform duration-700 group-hover:scale-105" 
                src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=800&auto=format&fit=crop"
                alt="Momentos 1" 
              />
            </div>
            <div className="break-inside-avoid relative group overflow-hidden rounded-2xl border border-outline-variant/30 shadow-sm">
              <img 
                className="w-full transition-transform duration-700 group-hover:scale-105" 
                src="https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?q=80&w=800&auto=format&fit=crop"
                alt="Momentos 2" 
              />
            </div>
            <div className="break-inside-avoid relative group overflow-hidden rounded-2xl border border-outline-variant/30 shadow-sm">
              <img 
                className="w-full transition-transform duration-700 group-hover:scale-105" 
                src="https://images.unsplash.com/photo-1520854221256-17451cc331bf?q=80&w=800&auto=format&fit=crop"
                alt="Momentos 3" 
              />
            </div>
            <div className="break-inside-avoid relative group overflow-hidden rounded-2xl border border-outline-variant/30 shadow-sm">
              <img 
                className="w-full transition-transform duration-700 group-hover:scale-105" 
                src="https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=800&auto=format&fit=crop"
                alt="Momentos 4" 
              />
            </div>
            <div className="break-inside-avoid relative group overflow-hidden rounded-2xl border border-outline-variant/30 shadow-sm">
              <img 
                className="w-full transition-transform duration-700 group-hover:scale-105" 
                src="https://images.unsplash.com/photo-1529636798458-92182e662485?q=80&w=800&auto=format&fit=crop"
                alt="Momentos 5" 
              />
            </div>
          </div>
        </div>
      </section>

      <Footer variant="main" />
    </>
  );
}
