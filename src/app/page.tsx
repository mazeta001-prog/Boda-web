"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function Home() {
  const [timeLeft, setTimeLeft] = useState({ days: 104, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    // Reveal on Scroll System
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { 
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px'
    });

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
      <header className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-12 reveal">
        <div className="absolute inset-0 z-0">
          <img 
            alt="Ivan y Dana" 
            className="w-full h-full object-cover scale-105 transition-transform duration-1000 brightness-75 object-[40%_40%]" 
            src="/fotos/foto1.jpg" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-surface/60 via-surface/40 to-surface/90 backdrop-blur-[1px]"></div>
        </div>

        <div className="relative z-10 text-center px-4 py-6 sm:px-10 sm:py-12 md:px-16 md:py-16 max-w-3xl mx-3 sm:mx-4 backdrop-blur-xl rounded-3xl border border-white/60 bg-white/50 dark:bg-black/50 shadow-2xl animate-float-y">
          <span className="material-symbols-outlined text-primary text-2xl sm:text-3xl mb-1.5 sm:mb-2 animate-pulse">local_florist</span>
          
          <p className="font-label-caps text-xs sm:text-sm text-secondary tracking-[0.15em] sm:tracking-[0.3em] uppercase mb-1.5 sm:mb-2 font-bold">
            ¡Nos Casamos!
          </p>

          <h1 className="font-display-lg text-3xl sm:text-6xl md:text-7xl text-primary mb-3 sm:mb-4 tracking-tight font-extrabold">
            Ivan &amp; Dana
          </h1>

          <div className="flex justify-center items-center gap-3 sm:gap-4 mb-5 sm:mb-6">
            <div className="h-[1px] w-8 sm:w-12 bg-primary/40"></div>
            <span className="material-symbols-outlined text-primary text-sm sm:text-base">favorite</span>
            <div className="h-[1px] w-8 sm:w-12 bg-primary/40"></div>
          </div>

          <p className="font-body-lg text-xs sm:text-base text-on-surface mb-6 sm:mb-8 max-w-xl mx-auto font-light leading-relaxed">
            Nos encantaría celebrar el día más importante de nuestras vidas acompañados de nuestros seres queridos.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-2.5 sm:gap-4 w-full">
            <Link 
              className="w-full sm:w-auto font-label-caps text-[11px] sm:text-sm border-2 border-primary bg-primary text-on-primary px-5 sm:px-8 py-3 sm:py-4 rounded-full hover:bg-primary-container hover:border-primary-container transition-all duration-300 tracking-[0.12em] sm:tracking-[0.2em] shadow-lg hover:scale-105 btn-shine font-bold text-center" 
              href="/rsvp"
            >
              BUSCAR MI INVITACIÓN (RSVP)
            </Link>
            
            <Link 
              className="w-full sm:w-auto font-label-caps text-[11px] sm:text-sm border border-outline-variant bg-surface-container-lowest/80 text-on-surface px-5 sm:px-8 py-3 sm:py-4 rounded-full hover:bg-surface-container transition-all duration-300 tracking-[0.12em] sm:tracking-[0.2em] font-bold text-center hover:scale-105 btn-shine" 
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
      <section className="py-8 sm:py-16 bg-surface border-y border-outline-variant/30 reveal">
        <div className="max-w-container-max mx-auto px-4 sm:px-gutter text-center">
          <div className="inline-block border border-primary/40 rounded-full px-5 sm:px-8 py-1.5 sm:py-2.5 mb-6 sm:mb-10 bg-primary/5 reveal stagger-1">
            <h2 className="font-label-caps text-[11px] sm:text-xs text-primary tracking-widest font-bold">CUENTA REGRESIVA</h2>
          </div>

          {isExpired ? (
            <div id="countdown" className="flex justify-center reveal stagger-2">
              <span className="font-display-lg text-2xl sm:text-3xl text-primary font-bold">¡El gran día ha llegado!</span>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5 sm:gap-6 md:gap-10 max-w-2xl mx-auto reveal stagger-2" id="countdown">
              <div className="flex flex-col items-center justify-center bg-surface-container-lowest border border-outline-variant/40 p-2 sm:p-5 md:p-6 rounded-2xl shadow-xs w-full">
                <span className="font-display-lg text-xl sm:text-4xl md:text-5xl text-primary font-bold">
                  {String(timeLeft.days).padStart(3, '0')}
                </span>
                <span className="font-label-caps text-[8px] sm:text-[10px] tracking-wider sm:tracking-[0.2em] text-secondary mt-1 sm:mt-2 border-t border-primary/20 pt-1 sm:pt-2 w-full text-center font-bold">DÍAS</span>
              </div>
              <div className="flex flex-col items-center justify-center bg-surface-container-lowest border border-outline-variant/40 p-2 sm:p-5 md:p-6 rounded-2xl shadow-xs w-full">
                <span className="font-display-lg text-xl sm:text-4xl md:text-5xl text-primary font-bold">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span className="font-label-caps text-[8px] sm:text-[10px] tracking-wider sm:tracking-[0.2em] text-secondary mt-1 sm:mt-2 border-t border-primary/20 pt-1 sm:pt-2 w-full text-center font-bold">HORAS</span>
              </div>
              <div className="flex flex-col items-center justify-center bg-surface-container-lowest border border-outline-variant/40 p-2 sm:p-5 md:p-6 rounded-2xl shadow-xs w-full">
                <span className="font-display-lg text-xl sm:text-4xl md:text-5xl text-primary font-bold">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span className="font-label-caps text-[8px] sm:text-[10px] tracking-wider sm:tracking-[0.2em] text-secondary mt-1 sm:mt-2 border-t border-primary/20 pt-1 sm:pt-2 w-full text-center font-bold">MINUTOS</span>
              </div>
              <div className="flex flex-col items-center justify-center bg-surface-container-lowest border border-outline-variant/40 p-2 sm:p-5 md:p-6 rounded-2xl shadow-xs w-full">
                <span className="font-display-lg text-xl sm:text-4xl md:text-5xl text-primary font-bold">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
                <span className="font-label-caps text-[8px] sm:text-[10px] tracking-wider sm:tracking-[0.2em] text-secondary mt-1 sm:mt-2 border-t border-primary/20 pt-1 sm:pt-2 w-full text-center font-bold">SEGUNDOS</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Story Section */}
      <section className="py-12 sm:py-20 md:py-24 bg-surface-container-lowest reveal" id="story">
        <div className="max-w-container-max mx-auto px-4 sm:px-gutter">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="order-2 md:order-1">
              <h2 className="font-display-lg text-2xl sm:text-3xl md:text-4xl text-primary mb-4 sm:mb-6 font-bold reveal stagger-1">Nuestra Historia</h2>
              <p className="font-body-lg text-on-surface-variant mb-8 sm:mb-10 italic border-l-4 border-primary pl-4 sm:pl-6 py-2 leading-relaxed text-xs sm:text-base reveal stagger-2">
                De un grupo de amigos que surgió en un retiro de la iglesia en el 2015, Dios comenzó a trabajar nuestros corazones y prepararlos para la bendición con la que hoy contamos. Siendo amigos y guardando nuestros corazones el uno para el otro. El resto, es una historia que Dios sigue escribiendo.
              </p>
              <div className="space-y-8 sm:space-y-10 border-l-2 border-primary/30 pl-6 sm:pl-8 ml-1 sm:ml-2">
                <div className="relative group reveal stagger-3">
                  <div className="absolute -left-[33px] sm:-left-[41px] top-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-primary rounded-full ring-4 ring-surface-container-lowest group-hover:scale-125 transition-transform duration-300"></div>
                  <h3 className="font-label-caps text-[11px] sm:text-xs text-primary mb-1 tracking-widest font-bold">PRIMER ENCUENTRO</h3>
                  <p className="font-body-md text-secondary text-xs sm:text-sm leading-relaxed">El salón del Segundo piso de la iglesia en ese entonces de 11-12 años, fue el lugar donde hace años, nuestra historia se empezó a escribir sin que nos diéramos cuenta.</p>
                </div>
                <div className="relative group reveal stagger-4">
                  <div className="absolute -left-[33px] sm:-left-[41px] top-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-primary rounded-full ring-4 ring-surface-container-lowest group-hover:scale-125 transition-transform duration-300"></div>
                  <h3 className="font-label-caps text-[11px] sm:text-xs text-primary mb-1 tracking-widest font-bold">PRIMERA CITA</h3>
                  <p className="font-body-md text-secondary text-xs sm:text-sm leading-relaxed">En pleno verano un 24 de agosto del 2021 fuimos nada más y nada menos que al zoológico. Entre risas nerviosas y el inicio de una nueva aventura, caminar y coger calor, nunca fue tan lindo.</p>
                </div>
                <div className="relative group reveal stagger-5">
                  <div className="absolute -left-[33px] sm:-left-[41px] top-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-primary rounded-full ring-4 ring-surface-container-lowest group-hover:scale-125 transition-transform duration-300"></div>
                  <h3 className="font-label-caps text-[11px] sm:text-xs text-primary mb-1 tracking-widest font-bold">LA PROPUESTA</h3>
                  <p className="font-body-md text-secondary text-xs sm:text-sm leading-relaxed">Lo que era la grabación de un video promocional en una cocina, en lo que nos gusta, resultó ser el plop twist más lindo que hemos recibido.</p>
                </div>
              </div>
            </div>

            <div className="order-1 md:order-2 grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-3 sm:space-y-4">
                <div className="aspect-[3/4] overflow-hidden rounded-2xl champagne-shadow border border-outline-variant/30 reveal stagger-1">
                  <img 
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" 
                    src="/fotos/foto7.jpg"
                    alt="Nuestra historia - Ivan y Dana 1" 
                  />
                </div>
                <div className="aspect-square overflow-hidden rounded-2xl champagne-shadow border border-outline-variant/30 reveal stagger-2">
                  <img 
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" 
                    src="/fotos/foto3.jpg"
                    alt="Nuestra historia - Ivan y Dana 2" 
                  />
                </div>
              </div>
              <div className="pt-6 sm:pt-8">
                <div className="aspect-[3/4] overflow-hidden rounded-2xl champagne-shadow border border-outline-variant/30 reveal stagger-3">
                  <img 
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" 
                    src="/fotos/foto6.jpg"
                    alt="Nuestra historia - Ivan y Dana 3" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gift Registry Section (Ver Mesa de Regalo) */}
      <section className="relative py-12 sm:py-20 md:py-24 overflow-hidden reveal" id="registry">
        <div className="absolute inset-0 z-0">
          <img 
            alt="Mesa de Regalo Background" 
            className="w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVDXXfOvK4ab0Y8hDYKvEb-tpVdGVPaNEcoUClG6WuLLYpcfHq-4E1cTM2FY5gAg6BJS2GcUDfe6sYXAyvurx06MJlgosGmCetystrJIAR0WQAiLvH-WNEbSSfbkfjMpzn2Mw0ANLXMv3eyfYQs5WXBc4xRVJq90zJIK90tcvmW1IbxWgM6oOPK-aGbyc9goOrixDjIbtLCSih5Eaa1GPCWxIAG8cpl7_3zNw3Xlb59FWW2dXg5J9eH0W2LGVbuyQsqxI"
          />
          <div className="absolute inset-0 bg-surface/30 backdrop-blur-md bg-black/20"></div>
        </div>
        <div className="relative z-10 max-w-container-max mx-auto px-4 sm:px-gutter reveal stagger-1">
          <div className="backdrop-blur-xl p-8 sm:p-10 md:p-16 rounded-2xl champagne-shadow border border-white/40 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 bg-surface/80 dark:bg-black/60">
            <div className="max-w-2xl reveal stagger-2">
              <div className="flex items-center gap-4 mb-3 sm:mb-4">
                <span className="material-symbols-outlined text-primary text-2xl sm:text-3xl">card_giftcard</span>
                <div className="h-[1px] w-12 bg-primary/40"></div>
              </div>
              <h2 className="font-display-lg text-2xl sm:text-3xl md:text-4xl text-primary mb-3 sm:mb-4 font-bold shadow-xs">Mesa de Regalo</h2>
              <p className="font-body-lg text-on-surface-variant text-xs sm:text-base leading-relaxed font-bold">
                Su presencia es nuestro mayor regalo, pero si desean tener un detalle con nosotros, pueden visitar nuestra mesa de regalos.
              </p>
            </div>
            <div className="flex-shrink-0 reveal stagger-3 w-full sm:w-auto text-center">
              <a 
                className="inline-block font-label-caps text-xs sm:text-sm bg-primary text-on-primary px-8 sm:px-12 py-3.5 sm:py-4 rounded-full hover:scale-105 btn-shine transition-all tracking-[0.15em] sm:tracking-[0.2em] font-bold shadow-xl text-center w-full sm:w-auto" 
                href="https://listaderegalos.casacuesta.com/Event/DANA-and-DANA?utm_source=share"
                target="_blank"
                rel="noopener noreferrer"
              >
                VER MESA DE REGALOS
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Details Section */}
      <section className="py-12 sm:py-20 md:py-24 bg-surface-container-low reveal" id="details">
        <div className="max-w-container-max mx-auto px-4 sm:px-gutter">
          <div className="text-center mb-10 sm:mb-16 reveal stagger-1">
            <h2 className="font-display-lg text-2xl sm:text-3xl md:text-4xl text-primary mb-2 sm:mb-3 font-bold">Los Detalles</h2>
            <p className="font-body-lg text-secondary text-xs sm:text-sm">Todo lo que necesitas saber para acompañarnos.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="bg-surface-container-lowest p-6 sm:p-10 text-center rounded-2xl champagne-shadow border border-outline-variant/30 group hover:-translate-y-4 hover:shadow-xl transition-all duration-500 reveal stagger-2">
              <span className="material-symbols-outlined text-3xl sm:text-4xl text-primary mb-4 sm:mb-6 group-hover:scale-110 transition-transform">calendar_month</span>
              <h3 className="font-label-caps text-xs text-primary mb-3 sm:mb-4 tracking-widest font-bold">FECHA Y HORA</h3>
              <p className="font-body-lg font-bold text-on-surface mb-1 sm:mb-2 text-sm sm:text-base">20 de Diciembre, 2026</p>
              <p className="font-body-md text-secondary text-xs sm:text-sm">16:00 Horas</p>
            </div>

            <div className="bg-surface-container-lowest p-6 sm:p-10 text-center rounded-2xl champagne-shadow border border-outline-variant/30 group hover:-translate-y-4 hover:shadow-xl transition-all duration-500 reveal stagger-3">
              <span className="material-symbols-outlined text-3xl sm:text-4xl text-primary mb-4 sm:mb-6 group-hover:scale-110 transition-transform">location_on</span>
              <h3 className="font-label-caps text-xs text-primary mb-3 sm:mb-4 tracking-widest font-bold">LUGAR</h3>
              <p className="font-body-lg font-bold text-on-surface mb-1 text-sm sm:text-base">Praedium Garden</p>
              <p className="font-body-md text-primary italic text-xs mb-2">(Jardín Mediterráneo)</p>
              <p className="font-body-sm text-secondary text-xs leading-relaxed">Av. Hípica V Centenario Km. 14 Las Américas, Santo Domingo Este</p>
            </div>

            <div className="bg-surface-container-lowest p-6 sm:p-10 text-center rounded-2xl champagne-shadow border border-outline-variant/30 group hover:-translate-y-4 hover:shadow-xl transition-all duration-500 reveal stagger-4">
              <span className="material-symbols-outlined text-3xl sm:text-4xl text-primary mb-4 sm:mb-6 group-hover:scale-110 transition-transform">checkroom</span>
              <h3 className="font-label-caps text-xs text-primary mb-3 sm:mb-4 tracking-widest font-bold">DRESS CODE</h3>
              <p className="font-body-lg font-bold text-on-surface mb-4 sm:mb-5 text-sm sm:text-base">Formal de Jardín</p>
              <Link 
                className="inline-block bg-primary text-on-primary font-label-caps text-xs px-6 py-2.5 rounded-full transition-all hover:bg-primary-container hover:scale-105 btn-shine font-bold shadow-xs tracking-widest" 
                href="/dress-code"
              >
                VER GUÍA
              </Link>
            </div>
          </div>

          <div className="mt-8 sm:mt-12 h-[300px] sm:h-[380px] w-full rounded-2xl overflow-hidden border border-outline-variant/30 shadow-md relative">
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
              className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-10 bg-white dark:bg-zinc-900 px-5 py-3 rounded-full shadow-lg flex items-center justify-center gap-2 border border-primary/30 text-primary hover:bg-primary hover:text-white transition-all font-bold text-xs font-label-caps"
            >
              <span className="material-symbols-outlined text-lg">pin_drop</span>
              <span>Abrir en Google Maps</span>
            </a>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-12 sm:py-20 md:py-24 bg-surface-container-lowest reveal" id="gallery">
        <div className="max-w-container-max mx-auto px-4 sm:px-gutter">
          <h2 className="font-display-lg text-2xl sm:text-3xl md:text-4xl text-primary text-center mb-10 sm:mb-16 font-bold reveal stagger-1">Nuestros Momentos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="relative group overflow-hidden rounded-2xl champagne-shadow border border-outline-variant/30 shadow-sm aspect-[3/4] reveal stagger-1">
              <img 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                src="/fotos/foto2.jpg"
                alt="Ivan & Dana - Momento 1" 
              />
            </div>
            <div className="relative group overflow-hidden rounded-2xl champagne-shadow border border-outline-variant/30 shadow-sm aspect-[3/4] reveal stagger-2">
              <img 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                src="/fotos/foto4.jpg"
                alt="Ivan & Dana - Momento 2" 
              />
            </div>
            <div className="relative group overflow-hidden rounded-2xl champagne-shadow border border-outline-variant/30 shadow-sm aspect-[3/4] reveal stagger-3">
              <img 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                src="/fotos/foto5.jpg"
                alt="Ivan & Dana - Momento 3" 
              />
            </div>
          </div>
        </div>
      </section>

      <Footer variant="main" />
    </>
  );
}

