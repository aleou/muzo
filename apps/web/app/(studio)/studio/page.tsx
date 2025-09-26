import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const styles = [
  {
    id: 'concept-animal',
    name: 'Concept Animal',
    description: 'Couleurs vibrantes, accent sur les détails du pelage et arrière-plan pastel.',
  },
  {
    id: 'portrait-rendu',
    name: 'Portrait Rendu',
    description: 'Style studio, lumière douce et finition réaliste prête pour tirage fine art.',
  },
  {
    id: 'fantasy-scene',
    name: 'Fantasy Scene',
    description: 'Ambiance cinématique, effets lumineux atmosphériques, idéal pour posters.',
  },
];

export default function StudioPage() {
  return (
    <section className="space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-violet-300">Projet MUZO</p>
          <h1 className="text-3xl font-semibold text-slate-100">Studio Créatif</h1>
          <p className="text-sm text-slate-400">
            Créez un projet, générez vos visuels puis déclenchez l&apos;impression en quelques minutes.
          </p>
        </div>
        <Link href="/" className="text-sm text-violet-300 hover:text-violet-200">
          ← Retour à la page d&apos;accueil
        </Link>
      </div>
      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-8">
          <Card>
            <CardTitle>1. Téléverser la photo</CardTitle>
            <CardDescription>
              MUZO génère une URL pré-signée S3, vérifie la résolution et propose un upscale si nécessaire.
            </CardDescription>
            <div className="mt-6 space-y-4">
              <div className="rounded-md border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center">
                <p className="text-sm text-slate-300">Glissez-déposez ou cliquez pour sélectionner un fichier.</p>
                <p className="mt-2 text-xs text-slate-500">PNG ou JPG — 25 Mo max — minimum 2048px.</p>
                <Button className="mt-4" type="button">
                  Importer un visuel
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="project-title">Titre du projet</Label>
                  <Input id="project-title" placeholder="Collection Famille - Léon" />
                </div>
                <div>
                  <Label htmlFor="product">Produit cible</Label>
                  <Input id="product" placeholder="Puzzle 1000 pièces" />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle>2. Sélectionner un style</CardTitle>
            <CardDescription>
              Les styles MUZO incluent prompt + negative prompt + paramètres RunPod calibrés pour votre catalogue.
            </CardDescription>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {styles.map((style) => (
                <label
                  key={style.id}
                  className="flex cursor-pointer flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 hover:border-violet-500/60"
                >
                  <input type="radio" name="style" value={style.id} className="sr-only" defaultChecked={style.id === 'concept-animal'} />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-100">{style.name}</p>
                    <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-1 text-[10px] uppercase tracking-wide text-violet-200">
                      Préféré
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-400">{style.description}</p>
                </label>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>3. Rédiger le prompt</CardTitle>
            <CardDescription>
              Inspirez-vous de la fiche style. MUZO stocke vos itérations pour versionner chaque rendu.
            </CardDescription>
            <div className="mt-6 space-y-4">
              <div>
                <Label htmlFor="prompt">Prompt principal</Label>
                <Textarea
                  id="prompt"
                  placeholder="Un golden retriever courant sur la plage au coucher du soleil, style illustration pastel, ambiance joyeuse"
                />
              </div>
              <div>
                <Label htmlFor="negative">Prompt négatif</Label>
                <Textarea id="negative" placeholder="Flou, artefacts, couleurs saturées" />
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle>4. Lancer la génération</CardTitle>
            <CardDescription>
              Un job BullMQ est créé et traité par le worker MUZO. Vous recevez un rendu optimisé pour l’impression.
            </CardDescription>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Button type="button">Générer les visuels</Button>
              <p className="text-xs text-slate-400">
                Temps estimé : 50 secondes • Upscale automatique activé • 3 variations incluses
              </p>
            </div>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardTitle>Résumé du panier</CardTitle>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="flex justify-between">
                <span>Puzzle 1000 pièces</span>
                <span>32,00 €</span>
              </div>
              <div className="flex justify-between">
                <span>Frais impression (Printful)</span>
                <span>14,80 €</span>
              </div>
              <div className="flex justify-between">
                <span>Marge MUZO</span>
                <span>17,20 €</span>
              </div>
              <hr className="border-slate-800" />
              <div className="flex justify-between font-semibold text-slate-100">
                <span>Total facturé</span>
                <span>49,20 €</span>
              </div>
            </div>
            <Button className="mt-6 w-full" type="button">
              Passer en caisse (Stripe)
            </Button>
            <p className="mt-2 text-center text-[11px] text-slate-500">
              Paiement sécurisé. Le fulfilment est déclenché automatiquement une fois la transaction validée.
            </p>
          </Card>

          <Card>
            <CardTitle>Webhooks en attente</CardTitle>
            <ul className="mt-4 space-y-3 text-xs text-slate-400">
              <li className="flex justify-between">
                <span>Stripe • payment_intent.succeeded</span>
                <span className="text-emerald-400">Ready</span>
              </li>
              <li className="flex justify-between">
                <span>Printful • order.created</span>
                <span>Waiting</span>
              </li>
              <li className="flex justify-between">
                <span>Printify • order.shipped</span>
                <span>Pending</span>
              </li>
            </ul>
          </Card>
        </aside>
      </div>
    </section>
  );
}
