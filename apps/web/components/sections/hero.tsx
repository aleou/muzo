import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function HeroSection() {
  return (
    <section className="grid gap-10 pb-16 pt-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
      <div className="space-y-6">
        <Badge>Merch perso instant</Badge>
        <h1 className="text-4xl font-semibold leading-tight text-slate-100 md:text-5xl">
          Transformez votre photo en puzzle, poster ou mug pret a offrir.
        </h1>
        <p className="max-w-xl text-lg text-slate-300">
          Chargez une image, l'IA MUZO nettoie le cadrage, rehausse la definition en 300 DPI puis nous imprimons sur le support de votre choix. Aucun abonnement, vous payez uniquement le produit imprime et expedie.
        </p>
        <div className="flex flex-wrap gap-4">
          <Button href="/studio">Je cree mon produit</Button>
          <Button variant="secondary" href="#catalogues">
            Voir les produits
          </Button>
        </div>
        <ul className="flex flex-wrap gap-4 text-sm text-slate-400">
          <li className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Qualite imprimeur 300 DPI garantie
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Livraison 3 a 5 jours via Printful ou Printify
          </li>
        </ul>
      </div>
      <div className="relative">
        <div className="absolute -inset-6 rounded-3xl bg-violet-500/20 blur-3xl" aria-hidden />
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 shadow-2xl">
          <Image
            src="https://images.unsplash.com/photo-1618005198919-d3d4b5a92eee?auto=format&fit=crop&w=900&q=80"
            alt="Apercu produit MUZO"
            width={900}
            height={700}
            className="h-full w-full object-cover"
            priority
          />
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl bg-slate-900/90 px-4 py-3 text-xs text-slate-200 backdrop-blur">
            <div>
              <p className="font-semibold">Puzzle photo 1000 pieces - Edition famille</p>
              <p className="text-slate-400">Preparation 2 min - Impression Europe - Retour client 4.8/5</p>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-400">Pret en 48 h</span>
          </div>
        </div>
      </div>
    </section>
  );
}
