import type { Metadata } from 'next';
import { Geist, Geist_Mono, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import { STORAGE_KEYS } from '@/lib/constants';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const notoDevanagari = Noto_Sans_Devanagari({
  variable: '--font-noto-devanagari',
  subsets: ['devanagari'],
  weight: ['500'],
});

export const metadata: Metadata = {
  title: 'SaafHawa — Clean Air Assistant',
  description:
    'Calm, evidence-based winter smog defense and low-emission daily routines for families and communities.',
};

const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('${STORAGE_KEYS.THEME}') || 'light';
    var isDark = stored === 'dark' || (stored === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-user-theme', stored);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${notoDevanagari.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
