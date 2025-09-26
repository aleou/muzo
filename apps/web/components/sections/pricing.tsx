import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionHeading } from '@/components/section-heading';

const OPTIONS = [
  {
    name: 'Commande simple',
    price: 'A partir de 19,90 EUR',
    highlight: false,
    description: "Un produit personalise (puzzle, poster ou mug). Vous payez le support et la livraison, rien de plus.",
    features: ['Rendu IA 300 DPI inclus', 'Suivi colis email', 'Espace client pour telecharger le visuel'],
    cta: 'Personnaliser',
  },
  {
    name: 'Lot duo',
    price: '2 articles -10%',
    highlight: true,
    description: "Associez deux supports (par exemple puzzle + mug) et beneficiez d'une remise automatique sur la commande.",
    features: ['Ideal pour offrir', 'Frais de port regroupes', 'Apercu 3D pour chaque produit'],
    cta: 'Composer mon lot',
  },
  {
    name: 'Pack famille',
    price: '3 articles et plus',
    highlight: false,
    description: "Vous souhaitez plusieurs exemplaires ? Contactez-nous pour un tarif dedie et un message personnalise dans le colis.",
    features: ['Support mix & match', 'Option carte cadeau', 'Equipe MUZO disponible 7j/7'],
    cta: 'Parler a MUZO',
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="space-y-10">
      <SectionHeading
        eyebrow="Tarifs a la commande"
        title="Aucun abonnement, seulement vos produits preferes"
        description="Choisissez un support, ajoutez votre visuel et reglerez uniquement l impression et la livraison."
        align="center"
      />
      <div className="grid gap-6 md:grid-cols-3">
        {OPTIONS.map((option) => (
          <Card
            key={option.name}
            className={option.highlight ? 'border-violet-500 shadow-violet-500/20' : 'border-slate-800'}
          >
            <div className="flex h-full flex-col gap-6">
              <div className="space-y-2">
                <p className="text-sm uppercase tracking-wide text-slate-400">{option.name}</p>
                <p className="text-3xl font-semibold text-slate-100">{option.price}</p>
                <p className="text-sm text-slate-300">{option.description}</p>
              </div>
              <ul className="space-y-3 text-sm text-slate-200">
                {option.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                href={option.highlight ? '/studio' : option.name === 'Pack famille' ? 'mailto:hello@muzo.app' : '/studio'}
                variant={option.highlight ? 'primary' : 'secondary'}
                className="mt-auto"
              >
                {option.cta}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

