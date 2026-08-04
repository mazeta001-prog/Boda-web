import type { Metadata } from "next";
import { Montserrat, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["300", "400", "600", "700"],
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Nuestra Historia | Boda de Dana e Ivan",
  description: "Acompáñanos a celebrar nuestro amor el 20 de diciembre de 2026. Confirma tu asistencia, consulta detalles de vestimenta y más.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${montserrat.variable} ${playfairDisplay.variable} bg-surface text-on-surface font-body-md antialiased min-h-screen selection:bg-primary-fixed selection:text-on-primary-fixed`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
