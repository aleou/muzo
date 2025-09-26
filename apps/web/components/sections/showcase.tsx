import Image from 'next/image';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { SectionHeading } from '@/components/section-heading';

const PRODUCTS = [
  {
    name: 'Puzzle 1000 pieces',
    blurb: 'Carton premium, sachet cadeau et message personnalise',
    price: '49,90 EUR',
    image: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Poster satine 50x70',
    blurb: 'Impression HD, options cadre noir ou bois clair',
    price: '34,90 EUR',
    image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Mug emaille',
    blurb: 'Passe au lave-vaisselle, ideal pour les souvenirs de voyage',
    price: '19,90 EUR',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
  },
];

export function ShowcaseSection() {
  return (
    <section id="catalogues" className="space-y-10">
      <SectionHeading
        eyebrow="Produits disponibles"
        title="Choisissez votre support prefere"
        description="Chaque produit est gere par MUZO du rendu IA a la production. Vous ne payez que l'article commande."
      />
      <div className="grid gap-6 md:grid-cols-3">
        {PRODUCTS.map((product) => (
          <Card key={product.name} className="overflow-hidden p-0">
            <div className="relative h-56 w-full">
              <Image src={product.image} alt={product.name} fill className="object-cover" />
            </div>
            <div className="p-6 space-y-2">
              <CardTitle>{product.name}</CardTitle>
              <CardDescription>{product.blurb}</CardDescription>
              <p className="text-sm font-semibold text-slate-200">{product.price}</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

