"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function DressCode() {
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

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Navbar variant="dress-code" />

      {/* Hero Section */}
      <header className="pt-[160px] pb-12 text-center px-gutter max-w-4xl mx-auto reveal">
        <span className="font-label-caps text-xs text-primary tracking-[0.3em] mb-4 block uppercase font-bold">DRESS CODE</span>
        <h1 className="font-display-lg text-4xl sm:text-6xl text-primary mb-6 font-bold">Código de Vestimenta</h1>
        <div className="w-12 h-[1px] bg-primary/30 mx-auto mb-8"></div>
        <p className="font-body-lg text-sm sm:text-base text-on-surface-variant leading-relaxed max-w-2xl mx-auto font-light">
          Colores vivos e intensos que transmiten alegría, celebración y energía. Ideales para una boda tropical al aire libre.
        </p>
      </header>

      {/* Color Palette Section */}
      <section className="max-w-container-max mx-auto px-gutter mb-20 text-center reveal">
        <h3 className="font-label-caps text-xs text-secondary mb-10 tracking-[0.2em] uppercase font-bold">Paleta de Colores</h3>
        <div className="flex flex-wrap justify-center gap-6 md:gap-12">
          <div className="flex flex-col items-center group">
            <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-wedding-fucsia shadow-lg transition-transform group-hover:scale-110 mb-3 border border-white/20"></div>
            <span className="font-label-caps text-[10px] tracking-widest text-on-surface-variant font-bold">FUCSIA</span>
          </div>
          <div className="flex flex-col items-center group">
            <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-wedding-coral shadow-lg transition-transform group-hover:scale-110 mb-3 border border-white/20"></div>
            <span className="font-label-caps text-[10px] tracking-widest text-on-surface-variant font-bold">CORAL</span>
          </div>
          <div className="flex flex-col items-center group">
            <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-wedding-amarillo shadow-lg transition-transform group-hover:scale-110 mb-3 border border-white/20"></div>
            <span className="font-label-caps text-[10px] tracking-widest text-on-surface-variant font-bold">AMARILLO</span>
          </div>
          <div className="flex flex-col items-center group">
            <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-wedding-verde shadow-lg transition-transform group-hover:scale-110 mb-3 border border-white/20"></div>
            <span className="font-label-caps text-[10px] tracking-widest text-on-surface-variant font-bold">VERDE LIMÓN</span>
          </div>
          <div className="flex flex-col items-center group">
            <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-wedding-turquesa shadow-lg transition-transform group-hover:scale-110 mb-3 border border-white/20"></div>
            <span className="font-label-caps text-[10px] tracking-widest text-on-surface-variant font-bold">TURQUESA</span>
          </div>
          <div className="flex flex-col items-center group">
            <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-wedding-azul shadow-lg transition-transform group-hover:scale-110 mb-3 border border-white/20"></div>
            <span className="font-label-caps text-[10px] tracking-widest text-on-surface-variant font-bold">AZUL COBALTO</span>
          </div>
        </div>
      </section>

      {/* Dress Code Sections (Bento-inspired Grid) */}
      <main className="max-w-container-max mx-auto px-gutter mb-section-padding-desktop">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-stretch">
          {/* Para Ellos */}
          <section className="flex flex-col reveal">
            <div className="flex-grow flex flex-col justify-center px-4 text-center md:text-left mb-8">
              <h3 className="font-display-lg text-2xl md:text-3xl text-primary mb-4 font-bold">Para Ellos</h3>
              <p className="font-body-md text-sm sm:text-base text-on-surface-variant leading-relaxed mb-6">
                Los hombres pueden usar trajes en tonos claros con sacos (blazers) o chacabanas blancas con detalles sutiles de la paleta de colores, acompañadas de camisas blancas, siguiendo un estilo sofisticado y tropical.
              </p>
              <div className="flex items-center justify-center md:justify-start space-x-2 text-primary/60">
                <span className="material-symbols-outlined text-[18px]">male</span>
                <span className="font-label-caps text-[10px] tracking-widest uppercase font-bold">Elegancia Tropical</span>
              </div>
            </div>
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl shadow-2xl group bg-surface-container-low">
              <img 
                className="w-full h-full object-cover object-top transition-transform duration-1000 group-hover:scale-105" 
                src="/hombres.png" 
                alt="Etiqueta masculina" 
              />
              <div className="absolute inset-0 border-[12px] border-surface/10 pointer-events-none"></div>
            </div>
          </section>

          {/* Para Ellas */}
          <section className="flex flex-col reveal">
            <div className="flex-grow flex flex-col justify-center px-4 text-center md:text-left mb-8">
              <h3 className="font-display-lg text-2xl md:text-3xl text-primary mb-4 font-bold">Para Ellas</h3>
              <p className="font-body-md text-sm sm:text-base text-on-surface-variant leading-relaxed mb-6">
                Las mujeres pueden usar vestidos largos o midi, en telas fluidas y frescas, priorizando los colores alegres e intensos.
              </p>
              <div className="flex items-center justify-center md:justify-start space-x-2 text-primary/60">
                <span className="material-symbols-outlined text-[18px]">female</span>
                <span className="font-label-caps text-[10px] tracking-widest uppercase font-bold">Sofisticación Etérea</span>
              </div>
            </div>
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl shadow-2xl group bg-surface-container-low">
              <img 
                className="w-full h-full object-cover object-center transition-transform duration-1000 group-hover:scale-105" 
                src="/mujeres.jpg" 
                alt="Etiqueta femenina" 
              />
              <div className="absolute inset-0 border-[12px] border-surface/10 pointer-events-none"></div>
            </div>
          </section>
        </div>
      </main>

      {/* Key Advice Section */}
      <section className="bg-surface-container-low py-section-padding-desktop reveal">
        <div className="max-w-container-max mx-auto px-gutter">
          <div className="text-center mb-16">
            <h3 className="font-display-lg text-3xl md:text-4xl text-primary mb-4 font-bold">Consejos Clave</h3>
            <p className="font-body-md text-on-surface-variant text-sm sm:text-base">Detalles para que luzcas espectacular y en armonía con el gran día.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="flex flex-col items-center text-center p-8 bg-surface rounded-2xl shadow-sm border border-outline-variant/30">
              <div className="w-12 h-12 flex items-center justify-center text-wedding-fucsia mb-6">
                <span className="material-symbols-outlined text-[32px]">favorite</span>
              </div>
              <p className="font-body-md text-on-surface text-sm font-bold">¡Entre más color, mejor! La clave está en los tonos vivos y alegres.</p>
            </div>

            <div className="flex flex-col items-center text-center p-8 bg-surface rounded-2xl shadow-sm border border-outline-variant/30">
              <div className="w-12 h-12 flex items-center justify-center text-wedding-turquesa mb-6">
                <span className="material-symbols-outlined text-[32px]">block</span>
              </div>
              <p className="font-body-md text-on-surface text-sm font-bold">Evitar blanco total (reservado para la novia) y negro.</p>
            </div>

            <div className="flex flex-col items-center text-center p-8 bg-surface rounded-2xl shadow-sm border border-outline-variant/30">
              <div className="w-12 h-12 flex items-center justify-center text-wedding-verde mb-6">
                <span className="material-symbols-outlined text-[32px]">eco</span>
              </div>
              <p className="font-body-md text-on-surface text-sm font-bold">Los estampados tropicales y florales son bienvenidos.</p>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-16 max-w-4xl mx-auto border-t border-outline-variant/30 pt-16">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full border border-outline-variant flex items-center justify-center mb-6 text-primary">
                <span className="material-symbols-outlined text-[32px]">park</span>
              </div>
              <h4 className="font-label-caps text-xs text-on-surface mb-3 uppercase tracking-[0.1em] font-bold">El Terreno</h4>
              <p className="font-body-md text-xs sm:text-sm text-on-surface-variant max-w-xs text-center leading-relaxed">
                Nuestra ceremonia tendrá lugar en un jardín. Os recomendamos evitar tacones finos; las bases anchas o cuñas serán vuestras aliadas.
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full border border-outline-variant flex items-center justify-center mb-6 text-primary">
                <span className="material-symbols-outlined text-[32px]">ac_unit</span>
              </div>
              <h4 className="font-label-caps text-xs text-on-surface mb-3 uppercase tracking-[0.1em] font-bold">El Clima</h4>
              <p className="font-body-md text-xs sm:text-sm text-on-surface-variant max-w-xs text-center leading-relaxed">
                Al caer la noche puede refrescar. Sugerimos traer un chal o prenda ligera para disfrutar cómodamente.
              </p>
            </div>
          </div>

          {/* Back Button */}
          <div className="mt-20 text-center">
            <Link href="/" className="inline-flex items-center space-x-3 group">
              <span className="material-symbols-outlined text-primary group-hover:-translate-x-1 transition-transform">arrow_back</span>
              <span className="font-label-caps text-xs text-primary border-b border-primary/20 pb-1 group-hover:border-primary/60 transition-all font-bold tracking-wider">Volver al Inicio</span>
            </Link>
          </div>
        </div>
      </section>

      <Footer variant="dress-code" />
    </>
  );
}
