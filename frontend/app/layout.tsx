import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import BBot from '@/components/bBot';

export const metadata: Metadata = {
  title: 'BizMind - AI Business Location Decision Support',
  description: 'Analyze competitors, understand customer sentiment, evaluate demand, and discover the best strategy for your next business.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light">
      <head>
        {/*
          Inter — body / UI copy
          Served via Google Fonts
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />

        {/*
          Tiempos Headline — display / headings
          Licensed from Commercial Type. If you have an Adobe Fonts / self-hosted
          license, replace the @font-face src in globals.css with the actual URL.
          The Google Fonts fallback below uses an equivalent high-quality serif:
        */}
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap"
          rel="stylesheet"
        />

        {/* Material Symbols */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background-light text-text-main min-h-screen antialiased">
        <AuthProvider>
          <Navbar />
          {children}
          <BBot />
        </AuthProvider>
      </body>
    </html>
  );
}
