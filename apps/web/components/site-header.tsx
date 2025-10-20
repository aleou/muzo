import Link from 'next/link';
import type { Session } from 'next-auth';
import { Button } from '@/components/ui/button';
import { handleSignOut } from '@/lib/auth/actions';

const navItems = [
  { label: 'Produits', href: '#catalogues' },
  { label: 'Process', href: '#process' },
  { label: 'Avis', href: '#testimonials' },
  { label: 'Tarifs', href: '#pricing' },
];

type SiteHeaderProps = {
  showLandingNav?: boolean;
  session: Session | null;
};

export function SiteHeader({ showLandingNav = false, session }: SiteHeaderProps) {
  const isAuthenticated = Boolean(session?.user);

  return (
    <header className="flex items-center justify-between border-b border-slate-800/60 pb-6">
      <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-slate-100">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-violet-500 text-white">MZ</span>
        MUZO Studio
      </Link>
      {showLandingNav && (
        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
      )}
      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <Button variant="ghost" href="/dashboard" className="hidden md:inline-flex">
            Mes commandes
          </Button>
        ) : (
          <Button variant="ghost" href="/auth/sign-in" className="hidden md:inline-flex">
            Se connecter
          </Button>
        )}
        <Button href="/studio">Creer un produit</Button>
        {isAuthenticated ? (
          <form action={handleSignOut}>
            <Button type="submit" variant="secondary">
              Se deconnecter
            </Button>
          </form>
        ) : null}
      </div>
    </header>
  );
}
