import { SectionHeading } from '@/components/section-heading';

const STEPS = [
  {
    step: '1',
    title: 'Chargez votre photo',
    description:
      'Glissez votre image ou selectionnez-la depuis votre bibliotheque. Nous detectons automatiquement le cadrage ideal et les zones a ameliorer.',
  },
  {
    step: '2',
    title: 'Choisissez un style IA',
    description:
      'Portrait artistique, ambiance pop ou collage retro: appliquez un traitement IA calibre pour conserver les details et les couleurs.',
  },
  {
    step: '3',
    title: 'Validez le visuel',
    description:
      'Apercu 3D instantane, choix du support (puzzle, poster, mug) et personnalisation du texte ou du packaging avant paiement.',
  },
  {
    step: '4',
    title: 'Nous imprimons et envoyons',
    description:
      'Production sous 48 h, suivi colis partageable et espace client pour recuperer le visuel HD a tout moment.',
  },
];

export function ProcessSection() {
  return (
    <section id="process" className="space-y-12">
      <SectionHeading
        eyebrow="Comment ca marche"
        title="De la photo au produit fini en quatre etapes"
        description="Aucune competence design requise: l IA ajuste le rendu et nous gerons l impression ainsi que l expedition."
      />
      <ol className="grid gap-6 md:grid-cols-2">
        {STEPS.map((step) => (
          <li
            key={step.title}
            className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition duration-300 hover:border-violet-500/60 hover:bg-slate-900"
          >
            <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/20 text-sm font-semibold text-violet-200">
              Etape {step.step}
            </span>
            <h3 className="text-lg font-semibold text-slate-100">{step.title}</h3>
            <p className="mt-2 text-sm text-slate-300">{step.description}</p>
            <div className="absolute inset-0 -z-10 opacity-0 blur-2xl transition duration-300 group-hover:opacity-100" aria-hidden>
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-violet-400/5 to-transparent" />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

