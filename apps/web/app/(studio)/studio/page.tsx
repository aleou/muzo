import { prisma } from '@muzo/db';
import { StudioWizard } from './components/studio-wizard';

function summarizePrompt(prompt: string) {
  if (prompt.length <= 120) {
    return prompt;
  }
  return `${prompt.slice(0, 117).trimEnd()}...`;
}

export default async function StudioPage() {
  const styles = await prisma.style.findMany({
    select: {
      id: true,
      name: true,
      prompt: true,
      negativePrompt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: 6,
  });

  const styleOptions = styles.map((style) => ({
    id: style.id,
    name: style.name,
    description: summarizePrompt(style.prompt ?? ''),
    prompt: style.prompt ?? '',
    negativePrompt: style.negativePrompt,
  }));

  return (
    <section className="space-y-10">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-widest text-violet-300">MuZo Studio</p>
        <h1 className="text-3xl font-semibold text-slate-100">Creez votre projet personnalise</h1>
        <p className="text-sm text-slate-400">
          Importez votre photo, choisissez un produit et laissez notre IA construire une preview prete a imprimer.
        </p>
      </div>

      <StudioWizard styles={styleOptions} />
    </section>
  );
}
