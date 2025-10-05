import { Card } from '@/components/ui/card';
import { SectionHeading } from '@/components/section-heading';

const TESTIMONIALS = [
  {
    name: 'Clara, maman de deux enfants',
    role: 'Puzzle personnalise',
    quote:
      "J&apos;ai transforme une photo de vacances en puzzle pour l'anniversaire de mon fils. Commande realisee en 5 minutes, livraison rapide et rendu magnifique.",
  },
  {
    name: 'Omar, photographe amateur',
    role: 'Poster et mug',
    quote:
      'MUZO nettoie la photo, ajoute un style artistique et je recois un fichier imprime sans retouche a faire. Mes proches adorent les mugs personnalises.',
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="space-y-10">
      <SectionHeading
        eyebrow="Ils ont teste MUZO"
        title="Des souvenirs concrets a partir de simples photos"
        description="Clients, createurs et petites boutiques utilisent MUZO pour offrir des objets uniques sans se soucier de l impression."
        align="center"
      />
      <div className="grid gap-6 md:grid-cols-2">
        {TESTIMONIALS.map((testimonial) => (
          <Card key={testimonial.name} className="flex h-full flex-col justify-between gap-6">
            <p className="text-lg text-slate-200">&ldquo;{testimonial.quote}&rdquo;</p>
            <div className="text-sm text-slate-400">
              <p className="font-semibold text-slate-200">{testimonial.name}</p>
              <p>{testimonial.role}</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}


