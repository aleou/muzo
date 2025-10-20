import type { Metadata } from 'next';
import './globals.css';
// TODO(observability): Instrument Sentry/Telemetry for the web app layout once shared client is available.
import { auth } from '@/auth';
import { ConditionalHeader } from '@/components/conditional-header';

export const metadata: Metadata = {
  title: 'MUZO Studio',
  description: 'Personnalisez un puzzle, un poster ou un mug a partir de vos photos en quelques minutes.',
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  const session = await auth();

  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
          <ConditionalHeader session={session} />
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
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
