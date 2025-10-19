import type { Metadata } from 'next';
import './globals.css';
// TODO(observability): Instrument Sentry/Telemetry for the web app layout once shared client is available.
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  title: 'MUZO Studio',
  description: 'Personnalisez un puzzle, un poster ou un mug a partir de vos photos en quelques minutes.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <footer className="mt-16 flex flex-col gap-4 border-t border-slate-800/60 pt-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
            {/* TODO(legal): Add links to CGV, privacy, export/delete data flows once compliance pages are ready. */}
            <p>(c) {new Date().getFullYear()} MUZO. Tous droits reserves.</p>
            <div className="flex flex-wrap gap-4">
              <a href="mailto:hello@muzo.app" className="hover:text-slate-300">
                Contact
              </a>
              <a href="/dashboard" className="hover:text-slate-300">
                Mes commandes
              </a>
              <a href="#pricing" className="hover:text-slate-300">
                Tarifs
              </a>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
