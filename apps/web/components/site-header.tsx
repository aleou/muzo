import Link from 'next/link';
import { Button } from '@/components/ui/button';

const navItems = [
  { label: 'Produits', href: '#catalogues' },
  { label: 'Process', href: '#process' },
  { label: 'Avis', href: '#testimonials' },
  { label: 'Tarifs', href: '#pricing' },
];

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between border-b border-slate-800/60 pb-6">
      <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-slate-100">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-violet-500 text-white">MZ</span>
        MUZO Studio
      </Link>
      <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="hover:text-white">
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        <Button variant="ghost" href="/dashboard" className="hidden md:inline-flex">
          Mes commandes
        </Button>
        <Button href="/studio">Creer un produit</Button>
      </div>
    </header>
  );
}

