import Image from 'next/image';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ArrowRight, Eye } from 'lucide-react';
import { auth } from '@/auth';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getDashboardData } from '@/lib/data/dashboard';
import { getOrdersWithSignedUrls } from '@/lib/data/orders';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Espace client',
  description: "Suivez vos creations IA et vos commandes MUZO en un coup d'oeil.",
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'CREATED':
      return 'En attente';
    case 'PAID':
      return 'Payee';
    case 'SENT':
      return 'Expediee';
    case 'FULFILLED':
      return 'Livree';
    case 'FAILED':
      return 'En erreur';
    default:
      return status;
  }
}

function getStatusTone(status: string) {
  switch (status) {
    case 'FULFILLED':
      return 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200';
    case 'PAID':
      return 'border-blue-500/60 bg-blue-500/10 text-blue-200';
    case 'SENT':
      return 'border-sky-500/60 bg-sky-500/10 text-sky-200';
    case 'FAILED':
      return 'border-rose-500/60 bg-rose-500/10 text-rose-200';
    default:
      return 'border-amber-500/60 bg-amber-500/10 text-amber-200';
  }
}

function getProjectStatusMeta(status: string) {
  switch (status) {
    case 'READY':
      return {
        label: 'Finalise',
        badgeClass: 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200',
      };
    case 'GENERATING':
      return {
        label: 'Generation',
        badgeClass: 'border-sky-400/60 bg-sky-500/10 text-sky-200',
      };
    case 'FAILED':
      return {
        label: 'En erreur',
        badgeClass: 'border-rose-400/60 bg-rose-500/10 text-rose-200',
      };
    case 'DRAFT':
    default:
      return {
        label: 'Non finalise',
        badgeClass: 'border-amber-400/60 bg-amber-500/10 text-amber-200',
      };
  }
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/sign-in');
  }

  const data = await getDashboardData(session.user.id);
  const { user, projects } = data;
  
  // Récupérer les commandes avec URLs signées séparément
  const orders = await getOrdersWithSignedUrls(session.user.id);

  if (!user) {
    return (
      <main className="flex flex-1 flex-col gap-6">
        <Card className="border-dashed border-violet-500/40 bg-slate-900/40 text-center">
          <CardTitle>Profil introuvable</CardTitle>
          <CardDescription>
            Votre compte n&apos;est pas encore configure. Contactez le support MUZO pour finaliser votre acces.
          </CardDescription>
          <Button className="mt-6" href="/studio">
            Ouvrir le studio
          </Button>
        </Card>
      </main>
    );
  }

  type ProjectWithOutputs = (typeof projects)[number];
  type ProjectOutputWithMeta = ProjectWithOutputs['outputs'][number];
  type OrderWithProject = (typeof orders)[number];
  type ProjectGalleryItem = {
    id: string;
    url: string;
    createdAt: Date;
    projectTitle: string;
    projectId: string;
    projectStatus: string;
  };

  const totalOutputs = projects.reduce(
    (total: number, project: ProjectWithOutputs) => total + project.outputs.length,
    0,
  );
  const activeProjects = projects.filter(
    (project) => project.status !== 'READY' && project.status !== 'FAILED',
  ).length;

  const latestOutputs: ProjectGalleryItem[] = projects
    .flatMap<ProjectGalleryItem>((project: ProjectWithOutputs) =>
      project.outputs.map((output: ProjectOutputWithMeta) => ({
        id: output.id,
        url: output.url,
        createdAt: output.createdAt instanceof Date ? output.createdAt : new Date(output.createdAt),
        projectTitle: project.title,
        projectId: project.id,
        projectStatus: project.status,
      })),
    )
    .sort((a: ProjectGalleryItem, b: ProjectGalleryItem) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 6);

  const latestOrders = orders.slice(0, 5) as OrderWithProject[];

  return (
    <main className="flex flex-1 flex-col gap-12">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge className="w-fit">Bienvenue</Badge>
          <h1 className="mt-4 text-3xl font-semibold text-slate-100 md:text-4xl">
            Salut {user.name ?? user.email.split('@')[0]}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Visualisez vos dernieres creations IA, suivez le statut de vos commandes et lancez des produits en un clic.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button href="/studio">Nouvelle creation</Button>
          <Button variant="secondary" href="/">
            Retour a l&apos;accueil
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-800 bg-slate-900/70 shadow-lg">
          <CardTitle>Creations IA</CardTitle>
          <p className="mt-4 text-3xl font-semibold">{totalOutputs}</p>
          <CardDescription>Nombre total de visuels generes via MUZO.</CardDescription>
        </Card>
        <Card className="border-slate-800 bg-slate-900/70 shadow-lg">
          <CardTitle>Commandes</CardTitle>
          <p className="mt-4 text-3xl font-semibold">{orders.length}</p>
          <CardDescription>Resume de vos commandes passes et en cours.</CardDescription>
        </Card>
        <Card className="border-slate-800 bg-slate-900/70 shadow-lg">
          <CardTitle>Projets actifs</CardTitle>
          <p className="mt-4 text-3xl font-semibold">{activeProjects}</p>
          <CardDescription>Creations en cours de brief, de generation ou en attente de validation.</CardDescription>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-100">Vos dernieres creations</h2>
            <p className="text-sm text-slate-400">Galerie des visuels recents generes par l&apos;IA.</p>
          </div>
          <Button variant="ghost" href="/studio">
            Continuer un projet
          </Button>
        </div>
        {latestOutputs.length === 0 ? (
          <Card className="text-center">
            <CardTitle>Aucune creation pour le moment</CardTitle>
            <CardDescription>
              Lancez votre premiere generation dans le studio pour alimenter cet espace.
            </CardDescription>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {latestOutputs.map((output) => {
              const statusMeta = getProjectStatusMeta(output.projectStatus);

              return (
                <Card
                  key={output.id}
                  className="group overflow-hidden border-slate-800 bg-slate-900/70 p-0 shadow-lg transition-transform duration-300 hover:-translate-y-1 hover:shadow-violet-500/10"
                >
                  <div className="relative h-48 w-full overflow-hidden">
                    <Image
                      src={output.url}
                      alt={`Creation du projet ${output.projectTitle}`}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <Badge
                      className={cn(
                        'absolute left-3 top-3 border border-white/10 bg-slate-900/80 text-[11px] uppercase tracking-widest text-slate-100 shadow',
                        statusMeta.badgeClass,
                      )}
                    >
                      {statusMeta.label}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-4 p-4">
                    <div>
                      <CardTitle className="text-lg">{output.projectTitle}</CardTitle>
                      <CardDescription className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                        {formatDate(output.createdAt)}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        href={`/studio?projectId=${output.projectId}`}
                        className="gap-2 px-3 py-2 text-xs"
                      >
                        Reprendre
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        href={output.url}
                        className="gap-2 px-3 py-2 text-xs text-slate-300 hover:text-slate-100"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Apercu
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-100">Commandes recentes</h2>
            <p className="text-sm text-slate-400">Suivez les statuts, paiements et envois en temps reel.</p>
          </div>
          {orders.length > 0 && (
            <Button variant="ghost" href="/dashboard/orders">
              Voir toutes les commandes
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
        {latestOrders.length === 0 ? (
          <Card>
            <CardTitle>Aucune commande enregistree</CardTitle>
            <CardDescription>
              Vos commandes apparaitront ici des la validation de vos premiers acheteurs.
            </CardDescription>
          </Card>
        ) : (
          <div className="space-y-3">
            {latestOrders.map((order) => {
              const statusTone = getStatusTone(order.status);
              const statusLabel = getStatusLabel(order.status);
              const formattedDate = formatDate(
                order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt),
              );
              const preview = order.project.outputs[0]?.url;

              return (
                <Card key={order.id} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    {preview ? (
                      <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-800">
                        <Image src={preview} alt={order.project.title} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-slate-700 text-xs text-slate-500">
                        Apercu
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{order.project.title}</CardTitle>
                      <CardDescription className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                        {formattedDate}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <span className="text-base font-semibold text-slate-100">
                      {formatCurrency(order.price, order.currency)}
                    </span>
                    <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium', statusTone)}>
                      {statusLabel}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

