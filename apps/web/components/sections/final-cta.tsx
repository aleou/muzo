import { Button } from '@/components/ui/button';

export function FinalCtaSection() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-violet-500/30 bg-gradient-to-r from-violet-500/20 via-violet-500/10 to-transparent p-10 text-center">
      <div className="absolute -left-20 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-violet-500/40 blur-3xl" aria-hidden />
      <div className="absolute -right-20 top-10 h-32 w-32 rounded-full bg-fuchsia-400/30 blur-3xl" aria-hidden />
      <div className="relative space-y-6">
        <h2 className="text-3xl font-semibold text-slate-100">
          Pret a transformer vos photos en objets uniques ?
        </h2>
        <p className="mx-auto max-w-2xl text-slate-200">
          Lancez-vous maintenant: creez un puzzle, un poster ou un mug personnalise, reglez en ligne et recevez votre produit sous quelques jours.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button href="/studio">Je personnalise mon produit</Button>
          <Button variant="secondary" href="mailto:hello@muzo.app">
            Besoin d&apos;aide ?
          </Button>
        </div>
      </div>
    </section>
  );
}


