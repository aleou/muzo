import { prisma } from '@muzo/db';
import { auth } from '@/auth';
import { getProjectForStudio } from '@muzo/api';
import { StudioWizard } from './components/studio-wizard';

function summarizePrompt(prompt: string) {
  if (prompt.length <= 120) {
    return prompt;
  }
  return `${prompt.slice(0, 117).trimEnd()}...`;
}

type StudioPageProps = {
  searchParams?: {
    projectId?: string;
  };
};

function inferInitialStep(status: string | null, previewCount: number): number {
  if (status === 'READY') {
    return 3;
  }

  if (status === 'GENERATING' || status === 'FAILED' || previewCount > 0) {
    return 2;
  }

  if (status === 'DRAFT') {
    return 1;
  }

  return 0;
}

export default async function StudioPage({ searchParams }: StudioPageProps) {
  const session = await auth();
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

  const projectId = typeof searchParams?.projectId === 'string' ? searchParams.projectId : undefined;
  let initialPreviews: Array<{ id: string; url: string; createdAt: string }> = [];
  let initialProject: {
    id: string;
    title: string;
    inputImageUrl: string;
    signedInputImageUrl?: string;
    promptText: string;
    status: string;
    previewCount: number;
    productProvider: string | null;
    productId: string | null;
    productVariantId: string | null;
    previews: Array<{ id: string; url: string; createdAt: string }>;
  } | null = null;
  let initialStepIndex: number | undefined;

  if (projectId && session?.user?.id) {
    const projectData = await getProjectForStudio({
      projectId,
      userId: session.user.id,
    });

    if (projectData) {
      initialPreviews = projectData.previews ?? [];

      initialProject = {
        id: projectData.id,
        title: projectData.title,
        inputImageUrl: projectData.inputImageUrl,
        signedInputImageUrl: projectData.signedInputImageUrl,
        promptText: projectData.promptText,
        status: projectData.status,
        previewCount: Number(projectData.previewCount ?? 0),
        productProvider: projectData.productProvider,
        productId: projectData.productId,
        productVariantId: projectData.productVariantId,
        previews: initialPreviews,
      };

      initialStepIndex = inferInitialStep(initialProject.status, initialProject.previewCount);
    }
  }

  return (
    <section className="space-y-10">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-widest text-violet-300">MuZo Studio</p>
        <h1 className="text-3xl font-semibold text-slate-100">Creez votre projet personnalise</h1>
        <p className="text-sm text-slate-400">
          Importez votre photo, choisissez un produit et laissez notre IA construire une preview prete a imprimer.
        </p>
      </div>

      <StudioWizard
        styles={styleOptions}
        initialProject={initialProject}
        initialAsset={initialProject
          ? { id: initialProject.id, url: initialProject.signedInputImageUrl || initialProject.inputImageUrl }
          : null}
        initialPreviews={initialPreviews}
        initialStepIndex={initialStepIndex}
      />
    </section>
  );
}
