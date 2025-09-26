import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { SectionHeading } from '@/components/section-heading';

const VALUES = [
  {
    title: 'Facile et rapide',
    description:
      "Importez votre photo, choisissez un style IA et validez. MUZO s'occupe du cadrage, de l'upscale et de la mise au format imprimeur en moins de 3 minutes.",
  },
  {
    title: 'Rendu premium',
    description:
      'Nous generons un fichier 300 DPI pret pour Printful ou Printify, avec verification automatique des couleurs et des marges de coupe.',
  },
  {
    title: 'Cadeau memorable',
    description:
      'Puzzle, poster ou mug personnalise: ajoutez un message, recevez un suivi colis et partagez un espace client pour telecharger les visuels HD.',
  },
];

export function ValuePropsSection() {
  return (
    <section id="features" className="space-y-10">
      <SectionHeading
        eyebrow="Pourquoi MUZO"
        title="Le merch personnalise qui se lance en quelques clics"
        description="Pense pour les fans, les boutiques et les cadeaux de derniere minute. Aucun abonnement, seulement des produits qui donnent envie."
        align="center"
      />
      <div className="grid gap-6 md:grid-cols-3">
        {VALUES.map((value) => (
          <Card key={value.title}>
            <CardTitle>{value.title}</CardTitle>
            <CardDescription>{value.description}</CardDescription>
          </Card>
        ))}
      </div>
    </section>
  );
}

