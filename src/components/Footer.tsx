import Link from 'next/link';

interface FooterProps {
  variant?: 'main' | 'dress-code' | 'rsvp' | 'dashboard';
}

export default function Footer({ variant = 'main' }: FooterProps) {
  if (variant === 'dashboard') {
    return (
      <footer className="mt-auto border-t border-outline-variant bg-surface-container-low py-8 px-gutter w-full">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 max-w-7xl mx-auto">
          <div className="flex items-center space-x-6">
            <h4 className="font-display-lg text-headline-sm text-primary-container">NUESTRA HISTORIA</h4>
            <p className="text-[12px] text-secondary font-body-md">© 2026 Nuestra Historia. Forever &amp; Always.</p>
          </div>
          <div className="flex space-x-6">
            <Link className="text-[12px] font-label-caps text-secondary hover:text-primary transition-colors" href="#">
              POLÍTICA DE PRIVACIDAD
            </Link>
            <Link className="text-[12px] font-label-caps text-secondary hover:text-primary transition-colors" href="#">
              SOPORTE TÉCNICO
            </Link>
          </div>
        </div>
      </footer>
    );
  }

  if (variant === 'rsvp') {
    return (
      <footer className="w-full py-20 bg-surface-container-low border-t border-outline-variant/10">
        <div className="flex flex-col items-center justify-center space-y-8 text-center w-full px-gutter max-w-container-max mx-auto">
          <span className="font-display-lg text-headline-sm text-primary tracking-[0.3em] uppercase opacity-80">
            Nuestra Historia
          </span>
          <p className="font-body-md text-[13px] text-secondary font-light tracking-widest uppercase">
            © 2026 Nuestra Historia • Forever &amp; Always
          </p>
          <div className="flex space-x-12 mt-12 border-t border-outline-variant/20 pt-10 w-full max-w-[340px] justify-center opacity-60">
            <Link className="font-label-caps text-[9px] text-secondary hover:text-primary tracking-[0.2em] uppercase transition-colors" href="#">
              Privacy
            </Link>
            <Link className="font-label-caps text-[9px] text-secondary hover:text-primary tracking-[0.2em] uppercase transition-colors" href="#">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    );
  }

  if (variant === 'dress-code') {
    return (
      <footer className="w-full py-section-padding-desktop bg-surface-container-low border-t border-outline-variant">
        <div className="flex flex-col items-center justify-center space-y-unit text-center w-full px-gutter">
          <h2 className="font-display-lg text-headline-md text-primary mb-4">Nuestra Historia</h2>
          <div className="flex space-x-8 mb-8">
            <Link href="#" className="font-body-md text-secondary hover:text-primary transition-opacity underline decoration-primary/30 underline-offset-4">
              Privacy Policy
            </Link>
            <Link href="#" className="font-body-md text-secondary hover:text-primary transition-opacity underline decoration-primary/30 underline-offset-4">
              Contact Us
            </Link>
          </div>
        </div>
      </footer>
    );
  }

  // Default / Main (Landing principal) footer
  return (
    <footer className="w-full py-16 bg-surface-container-lowest border-t border-outline-variant/30 reveal active">
      <div className="flex flex-col items-center justify-center space-y-6 text-center w-full px-gutter">
        <div className="w-16 h-16 rounded-full border border-primary/30 flex items-center justify-center mb-6">
          <span className="font-display-lg text-headline-sm text-primary">D&amp;I</span>
        </div>
        <span className="font-display-lg text-headline-md text-primary dark:text-primary-fixed">
          Dana &amp; Ivan
        </span>
        <div className="flex gap-8 my-6">
          <Link className="font-label-caps text-[10px] text-on-surface-variant hover:text-primary transition-colors tracking-widest" href="#">
            PRIVACY POLICY
          </Link>
          <Link className="font-label-caps text-[10px] text-on-surface-variant hover:text-primary transition-colors tracking-widest" href="#">
            CONTACT US
          </Link>
        </div>
        <p className="font-body-md text-sm text-on-surface-variant/70 italic">
          © 2026 Nuestra Historia. Forever &amp; Always.
        </p>
      </div>
    </footer>
  );
}
