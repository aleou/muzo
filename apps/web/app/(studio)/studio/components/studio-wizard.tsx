"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type StyleOption = {
  id: string;
  name: string;
  description: string;
  prompt: string;
  negativePrompt?: string | null;
};

type Project = {
  id: string;
  title: string;
  inputImageUrl: string;
  signedInputImageUrl?: string;
  promptText: string;
  status: string;
  previewCount: number;
  productProvider?: string | null;
  productId?: string | null;
  productVariantId?: string | null;
  previews?: PreviewImage[];
};

type Asset = {
  id: string;
  url: string;
};

type PreviewImage = {
  id: string;
  url: string;
  createdAt: string;
};

type StudioProduct = {
  provider: string;
  productId: string;
  name: string;
  kind: "puzzle" | "poster" | "canvas" | "other";
  description?: string;
  variants: Array<{
    id: string;
    label: string;
    sizeHint?: string;
    pieces?: number;
    dpiRequirement: number;
  }>;
};

type Props = {
  styles: StyleOption[];
  initialProject?: Project | null;
  initialAsset?: Asset | null;
  initialPreviews?: PreviewImage[];
  initialStepIndex?: number;
};

type StepKey = "upload" | "brief" | "preview" | "product" | "checkout";

type Step = {
  key: StepKey;
  title: string;
  description: string;
};

const WORKFLOW_STEPS: Step[] = [
  { key: "upload", title: "1. Importez votre photo", description: "Chargez votre image de reference." },
  { key: "brief", title: "2. Renseignez le brief", description: "Decrivez le rendu souhaite, choisissez un style." },
  { key: "preview", title: "3. Generez la preview", description: "Lancez la generation gratuite." },
  { key: "product", title: "4. Choisissez le produit", description: "Selectionnez puzzle ou poster et sa variante." },
  { key: "checkout", title: "5. Finalisez", description: "Validez, passez en caisse, recevez votre creation." },
];

const PROMPT_SUGGESTIONS = [
  "Lumiere douce",
  "Palette pastel",
  "Style bande dessinee",
  "Ambiance festive",
  "Focus sur le visage",
  "Arriere-plan flou",
];

type NotificationItem = {
  id: string;
  message: string;
};

type NotificationTrayProps = {
  items: NotificationItem[];
  onDismiss: (id: string) => void;
};

function NotificationTray({ items, onDismiss }: NotificationTrayProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-6 top-28 z-50 flex w-72 flex-col gap-3">
      {items.map((notification) => (
        <div
          key={notification.id}
          className="pointer-events-auto overflow-hidden rounded-xl border border-rose-500/30 bg-slate-900/95 shadow-2xl shadow-rose-500/20"
        >
          <div className="flex items-start gap-3 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/20 text-rose-200">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="flex-1 text-sm text-slate-100">{notification.message}</div>
            <button
              type="button"
              onClick={() => onDismiss(notification.id)}
              className="text-slate-400 transition hover:text-slate-100"
              aria-label="Fermer la notification"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

type WorkflowStepsProps = {
  steps: Step[];
  currentStepIndex: number;
  loading: boolean;
  onSelect: (index: number) => void;
};

function WorkflowSteps({ steps, currentStepIndex, loading, onSelect }: WorkflowStepsProps) {
  return (
    <aside className="space-y-4">
      {steps.map((item, index) => {
        const isActive = index === currentStepIndex;
        const isDone = index < currentStepIndex;

        return (
          <Card
            key={item.key}
            role={isDone ? "button" : undefined}
            tabIndex={isDone ? 0 : undefined}
            onClick={() => {
              if (isDone && !loading) {
                onSelect(index);
              }
            }}
            onKeyDown={(event) => {
              if (!isDone || loading) {
                return;
              }

              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(index);
              }
            }}
            className={cn(
              "border-slate-800 bg-slate-900/80",
              isActive && "border-violet-500",
              isDone && !isActive && "border-emerald-400/60 hover:border-emerald-300/60",
              isDone && !loading ? "cursor-pointer" : "cursor-default",
            )}
          >
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-3 text-sm font-semibold text-slate-200">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border text-xs",
                    isDone
                      ? "border-emerald-400 text-emerald-300"
                      : isActive
                      ? "border-violet-400 text-violet-300"
                      : "border-slate-600 text-slate-400",
                  )}
                >
                  {index + 1}
                </span>
                {item.title}
              </div>
              <CardDescription className="text-xs text-slate-400">{item.description}</CardDescription>
            </CardHeader>
          </Card>
        );
      })}
    </aside>
  );
}

type LoadingAction = "upload" | "brief" | "product" | "preview" | "refresh";

function deriveInitialStep(project: Project | null | undefined): number {
  if (!project) {
    return 0;
  }

  if (project.status === "READY") {
    return 3;
  }

  if (project.status === "GENERATING") {
    return 2;
  }

  if (project.status === "FAILED") {
    return 2;
  }

  if (project.previewCount > 0) {
    return 2;
  }

  return 1;
}

const ERROR_MESSAGES: Record<string, string> = {
  image_inspection_failed: "Impossible de lire les metadonnees de cette image. Essayez un PNG ou JPG classique.",
  presign_failed: "Service de stockage temporairement indisponible. Patientez quelques instants.",
  upload_failed: "L'envoi du fichier vers le stockage a echoue.",
  project_creation_failed: "Impossible de creer le projet en base de donnees.",
  catalog_failed: "Catalogue produit indisponible actuellement.",
  product_save_failed: "Impossible d'enregistrer le produit selectionne.",
  brief_save_failed: "Enregistrement du brief impossible.",
  generation_failed: "La generation a echoue.",
  project_refresh_failed: "Mise a jour des previews impossible.",
};

async function raiseResponseError(code: string, response: Response): Promise<never> {
  let detail = "";

  try {
    const data = await response.clone().json();
    if (typeof data?.error === "string") {
      detail = data.error;
    } else if (data) {
      detail = JSON.stringify(data);
    }
  } catch (jsonError) {
    try {
      detail = await response.clone().text();
    } catch (textError) {
      detail = "";
    }
  }

  throw new Error([code, String(response.status), detail].filter(Boolean).join(":"));
}

function resolveFriendlyMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    const segments = error.message.split(":");
    const [code, status, ...rest] = segments;
    const base = ERROR_MESSAGES[code] ?? fallback;
    const detail = rest.join(":").trim();

    if (detail) {
      return `${base} (${detail})`;
    }

    if (!ERROR_MESSAGES[code] && error.message) {
      return `${fallback} (${error.message})`;
    }

    if (status && !Number.isNaN(Number(status))) {
      return `${base} (code ${status})`;
    }

    return base;
  }

  return fallback;
}

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

async function resolveImageSize(file: File) {
  const blobUrl = URL.createObjectURL(file);

  try {
    const image = new window.Image();
    const result = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      image.onload = () => resolve({ width: image.width, height: image.height });
      image.onerror = () => reject(new Error("image_inspection_failed"));
      image.src = blobUrl;
    });

    return result;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

async function putObject(uploadUrl: string, file: File, headers?: Record<string, string>) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers,
    body: file,
  });

  if (!response.ok) {
    throw new Error("upload_failed");
  }
}

function extractObjectId(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    typeof (value as { $oid?: unknown }).$oid === "string"
  ) {
    return String((value as { $oid: string }).$oid);
  }

  if (
    value &&
    typeof value === "object" &&
    typeof (value as { toHexString?: unknown }).toHexString === "function"
  ) {
    try {
      const hex = (value as { toHexString: () => string }).toHexString();
      if (typeof hex === "string" && hex.trim().length > 0) {
        return hex;
      }
    } catch {
      // fall through to other strategies
    }
  }

  if (
    value &&
    typeof value === "object" &&
    typeof (value as { toString?: unknown }).toString === "function"
  ) {
    const str = (value as { toString: () => string }).toString();
    if (/^[a-fA-F0-9]{24}$/.test(str)) {
      return str;
    }
  }

  return "";
}

function coerceNullableString(value: unknown, fallback: string | null): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (value === null) {
    return null;
  }

  return fallback;
}

function coercePreviewCount(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "bigint") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  if (
    value &&
    typeof value === "object" &&
    typeof (value as { toNumber?: unknown }).toNumber === "function"
  ) {
    try {
      const numeric = (value as { toNumber: () => number }).toNumber();
      if (Number.isFinite(numeric)) {
        return numeric;
      }
    } catch {
      // ignore conversion failure and fall back
    }
  }

  return fallback;
}

function normalizePreviews(raw: unknown, fallback: PreviewImage[] = []): PreviewImage[] {
  if (!Array.isArray(raw)) {
    return fallback;
  }

  const previews: PreviewImage[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const source = entry as Record<string, unknown>;
    const id = extractObjectId(source.id) ?? Math.random().toString(36).slice(2);
    const url =
      typeof source.signedUrl === "string"
        ? source.signedUrl
        : typeof source.url === "string"
        ? source.url
        : "";

    if (!url) {
      continue;
    }

    const createdAt =
      typeof source.createdAt === "string"
        ? source.createdAt
        : new Date().toISOString();

    previews.push({ id, url, createdAt });
  }

  return previews.length > 0 ? previews : fallback;
}

function normalizeProject(raw: unknown, previous: Project | null): Project {
  const source = (raw ?? {}) as Record<string, unknown>;
  const fallback: Project = previous ?? {
    id: "",
    title: "",
    inputImageUrl: "",
    signedInputImageUrl: undefined,
    promptText: "",
    status: "",
    previewCount: 0,
    productProvider: null,
    productId: null,
    productVariantId: null,
    previews: [],
  };

  const resolvedId = extractObjectId(source.id);
  const productProvider =
    typeof source.productProvider === "string"
      ? source.productProvider
      : source.productProvider === null
      ? null
      : fallback.productProvider ?? null;
  const resolvedProductId = coerceNullableString(
    source.productId,
    fallback.productId ?? null,
  );
  const resolvedProductVariantId = coerceNullableString(
    source.productVariantId,
    fallback.productVariantId ?? null,
  );

  return {
    id: resolvedId || fallback.id,
    title: typeof source.title === "string" ? source.title : fallback.title,
    inputImageUrl:
      typeof source.inputImageUrl === "string"
        ? source.inputImageUrl
        : fallback.inputImageUrl,
    signedInputImageUrl:
      typeof source.signedInputImageUrl === "string"
        ? source.signedInputImageUrl
        : fallback.signedInputImageUrl,
    promptText:
      typeof source.promptText === "string" ? source.promptText : fallback.promptText,
    status: typeof source.status === "string" ? source.status : fallback.status,
    previewCount: coercePreviewCount(source.previewCount, fallback.previewCount),
    productProvider,
    productId: resolvedProductId ?? null,
    productVariantId: resolvedProductVariantId ?? null,
    previews: normalizePreviews(source.previews, fallback.previews ?? []),
  };
}

function normalizeAsset(raw: unknown, previous: Asset | null): Asset | null {
  if (!raw && !previous) {
    return null;
  }

  const source = (raw ?? {}) as Record<string, unknown>;
  const fallback = previous ?? { id: "", url: "" };

  const resolvedId = extractObjectId(source.id);
  const signedUrl =
    typeof source.signedUrl === "string"
      ? source.signedUrl
      : typeof source.url === "string"
      ? source.url
      : fallback.url;

  return {
    id: resolvedId || fallback.id,
    url: signedUrl,
  };
}

export function StudioWizard({
  styles,
  initialProject = null,
  initialAsset = null,
  initialPreviews = [],
  initialStepIndex,
}: Props) {
  const defaultStep = initialStepIndex ?? deriveInitialStep(initialProject);

  const [stepIndex, setStepIndex] = useState(defaultStep);
  const [project, setProject] = useState<Project | null>(initialProject);
  const [asset, setAsset] = useState<Asset | null>(
    initialAsset ?? (initialProject?.signedInputImageUrl || initialProject?.inputImageUrl
      ? { id: initialProject.id, url: initialProject.signedInputImageUrl || initialProject.inputImageUrl }
      : null),
  );
  const [previewImages, setPreviewImages] = useState<PreviewImage[]>(
    initialPreviews.length > 0 ? initialPreviews : initialProject?.previews ?? [],
  );
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [useLocalPreviewFallback, setUseLocalPreviewFallback] = useState(false);
  const [products, setProducts] = useState<StudioProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedStyleId, setSelectedStyleId] = useState("");
  const [title, setTitle] = useState(initialProject?.title ?? "");
  const [prompt, setPrompt] = useState(initialProject?.promptText ?? "");
  const [loadingAction, setLoadingAction] = useState<LoadingAction | null>(null);
  const [generationStatus, setGenerationStatus] = useState("");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const canNavigateBackward = stepIndex > 0;

  const isBusy = loadingAction !== null;
  const isUploading = loadingAction === "upload";
  const isSavingProduct = loadingAction === "product";
  const isSavingBrief = loadingAction === "brief";
  const isLaunchingPreview = loadingAction === "preview";
  const isRefreshingPreview = loadingAction === "refresh";
  const loadingMessages: Record<LoadingAction, string> = {
    upload: "Import du fichier en cours...",
    brief: "Sauvegarde du brief...",
    product: "Enregistrement du produit...",
    preview: "Generation de la preview...",
    refresh: "Actualisation des previews...",
  };
  const activeLoadingMessage = loadingAction ? loadingMessages[loadingAction] : null;

  const syncPreviewImages = useCallback((incoming: Project) => {
    if (Array.isArray(incoming.previews)) {
      setPreviewImages(incoming.previews);
    }
  }, []);

  const pushNotification = useCallback((message: string) => {
    const id = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
    setNotifications((previous) => [...previous, { id, message }]);
    setTimeout(() => {
      setNotifications((previous) => previous.filter((item) => item.id !== id));
    }, 5000);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const clearError = useCallback(() => {
    // intentionally left blank – legacy hook retained for API compatibility
  }, []);

  const showError = useCallback(
    (message: string) => {
      pushNotification(message);
    },
    [pushNotification],
  );

  const goToStep = useCallback(
    (target: number, options: { allowForward?: boolean } = {}) => {
      setStepIndex((current) => {
        if (target < 0 || target >= WORKFLOW_STEPS.length) {
          return current;
        }

        if (target === current) {
          return current;
        }

        if (!options.allowForward && target > current) {
          return current;
        }

        return target;
      });

      if (target <= stepIndex) {
        clearError();
      }
    },
    [clearError, stepIndex],
  );

  const handleStepBack = useCallback(() => {
    if (!canNavigateBackward) {
      return;
    }

    goToStep(stepIndex - 1);
  }, [canNavigateBackward, goToStep, stepIndex]);

  const currentStep = WORKFLOW_STEPS[stepIndex];
  const originalPhotoSrc = useLocalPreviewFallback
    ? localPreviewUrl ?? asset?.url ?? project?.signedInputImageUrl ?? project?.inputImageUrl ?? ""
    : asset?.url ?? localPreviewUrl ?? project?.signedInputImageUrl ?? project?.inputImageUrl ?? "";

  useEffect(() => {
    return () => {
      if (localPreviewUrl && localPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  useEffect(() => {
    if (asset?.url) {
      setUseLocalPreviewFallback(false);
    }
  }, [asset?.id, asset?.url]);

  useEffect(() => {
    if (!project) {
      setGenerationStatus("");
      return;
    }

    if (project.status === "GENERATING") {
      setGenerationStatus("Generation en cours...");
      return;
    }

    if (project.status === "FAILED") {
      setGenerationStatus("La derniere generation a echoue.");
      return;
    }

    if (project.status === "READY" && previewImages.length > 0) {
      setGenerationStatus("Previews pretes a etre consultees.");
      return;
    }

    if (project.status === "DRAFT" && previewImages.length === 0) {
      setGenerationStatus("Aucune preview disponible pour le moment.");
      return;
    }

    setGenerationStatus("");
  }, [project?.status, previewImages.length]);

  // Auto-polling when generation is in progress
  useEffect(() => {
    if (!project?.id || project.status !== "GENERATING") {
      return;
    }

    let cancelled = false;
    let pollCount = 0;
    const maxPolls = 120; // 10 minutes max (120 * 5 seconds)

    const poll = async () => {
      if (cancelled || pollCount >= maxPolls) {
        if (pollCount >= maxPolls) {
          setGenerationStatus("La generation prend plus de temps que prevu. Essayez de rafraichir.");
        }
        return;
      }

      pollCount++;

      try {
        const response = await fetch(`/api/studio/projects/${project.id}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (!response.ok) {
          console.error("Polling failed:", response.status);
          return;
        }

        const payload = await response.json();
        
        if (cancelled) {
          return;
        }

        const normalizedProject = normalizeProject(payload.project, project);
        setProject(normalizedProject);
        syncPreviewImages(normalizedProject);

        // Update status message
        if (normalizedProject.status === "GENERATING") {
          const messages = [
            "Generation en cours... Preparation du modele IA",
            "Generation en cours... Analyse de votre image",
            "Generation en cours... Creation de la preview",
            "Generation en cours... Finalisation"
          ];
          const messageIndex = Math.min(Math.floor(pollCount / 5), messages.length - 1);
          setGenerationStatus(messages[messageIndex]);
        } else if (normalizedProject.status === "READY") {
          setGenerationStatus("Preview prete ! Consultez le resultat ci-dessous.");
        } else if (normalizedProject.status === "FAILED") {
          setGenerationStatus("La generation a echoue. Vous pouvez reessayer.");
        }

        // Continue polling if still generating
        if (normalizedProject.status === "GENERATING" && !cancelled) {
          setTimeout(poll, 5000); // Poll every 5 seconds
        }
      } catch (error) {
        console.error("Polling error:", error);
        if (!cancelled && pollCount < maxPolls) {
          setTimeout(poll, 5000);
        }
      }
    };

    // Start polling after initial delay
    const timeoutId = setTimeout(poll, 3000);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [project?.id, project?.status, syncPreviewImages]);

  useEffect(() => {
    if (stepIndex < 3 || products.length > 0 || !project) {
      return;
    }

    let cancelled = false;

    async function fetchProducts() {
      try {
        const response = await fetch("/api/studio/products");
        if (!response.ok) {
          await raiseResponseError("catalog_failed", response);
        }

        const payload = await response.json();
        if (!cancelled) {
          setProducts(payload.products ?? []);
        }
      } catch (catalogError) {
        console.error(catalogError);
        if (!cancelled) {
          showError(resolveFriendlyMessage(catalogError, "Catalogue produit indisponible."));
        }
      }
    }

    fetchProducts();

    return () => {
      cancelled = true;
    };
  }, [stepIndex, products.length, project, showError]);

  const currentProduct = useMemo(() => {
    if (!selectedProductId) {
      return null;
    }

    return products.find((item) => item.productId === selectedProductId) ?? null;
  }, [products, selectedProductId]);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      setLocalPreviewUrl((current) => {
        if (current && current.startsWith("blob:")) {
          URL.revokeObjectURL(current);
        }
        return previewUrl;
      });
      setUseLocalPreviewFallback(true);

      clearError();
      setLoadingAction("upload");

      try {
        const { width, height } = await resolveImageSize(file);

        const urlResponse = await fetch("/api/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, contentType: file.type }),
        });

        if (!urlResponse.ok) {
          await raiseResponseError("presign_failed", urlResponse);
        }

        const urlPayload = await urlResponse.json();
        await putObject(urlPayload.uploadUrl, file, urlPayload.headers);

        const projectResponse = await fetch("/api/studio/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalFilename: file.name,
            s3Key: urlPayload.key,
            publicUrl: urlPayload.publicUrl,
            width,
            height,
            dpi: 300,
            sizeBytes: file.size,
            mimeType: file.type,
          }),
        });

        if (!projectResponse.ok) {
          await raiseResponseError("project_creation_failed", projectResponse);
        }

        const projectPayload = await projectResponse.json();
        const normalizedProject = normalizeProject(projectPayload.project, null);
        const normalizedAsset = normalizeAsset(projectPayload.asset, null);
        setProject(normalizedProject);
        syncPreviewImages(normalizedProject);
        setAsset(normalizedAsset);
        setUseLocalPreviewFallback(!normalizedAsset?.url);
        setTitle(normalizedProject.title ?? "");
        setPrompt(normalizedProject.promptText ?? "");
        setSelectedProductId("");
        setSelectedVariantId("");
        setProducts([]);
        setStepIndex(1);
      } catch (uploadError) {
        console.error(uploadError);
        showError(resolveFriendlyMessage(uploadError, "Impossible de traiter cette image. Merci de reessayer."));
      } finally {
        setLoadingAction(null);
      }
    },
    [clearError, showError, syncPreviewImages],
  );

  const handlePreviewLaunch = useCallback(
    async (overrideProjectId?: string) => {
      const rawProjectId = (overrideProjectId ?? project?.id) as unknown;
      const targetProjectId =
        typeof rawProjectId === "string" && rawProjectId.trim().length > 0
          ? rawProjectId
          : extractObjectId(rawProjectId);

      if (!targetProjectId) {
        showError("Aucun projet a generer.");
        return;
      }

      setLoadingAction("preview");
      clearError();
      setGenerationStatus("Generation en cours...");
      setStepIndex(2);

      try {
        const response = await fetch(`/api/studio/projects/${targetProjectId}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: "preview" }),
        });

        if (!response.ok) {
          await raiseResponseError("generation_failed", response);
        }

        const payload = await response.json();
        const normalizedProject = normalizeProject(payload.project, project);
        setProject(normalizedProject);
        syncPreviewImages(normalizedProject);
        setGenerationStatus("Preview lancee. Nous vous prevenons des qu'elle est prete pour validation.");
      } catch (generationError) {
        console.error(generationError);
        setGenerationStatus("");
        showError(resolveFriendlyMessage(generationError, "Impossible de demarrer la generation."));
      } finally {
        setLoadingAction((current) => (current === "preview" ? null : current));
      }
  },
  [project, clearError, showError, syncPreviewImages],
);

  const handlePreviewRefresh = useCallback(async () => {
    if (!project?.id) {
      return;
    }

    setLoadingAction("refresh");

    try {
      const response = await fetch(`/api/studio/projects/${project.id}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!response.ok) {
        await raiseResponseError("project_refresh_failed", response);
      }

      const payload = await response.json();
      const normalizedProject = normalizeProject(payload.project, project);
      setProject(normalizedProject);
      syncPreviewImages(normalizedProject);

      if (typeof payload.statusMessage === "string" && payload.statusMessage.trim().length > 0) {
        setGenerationStatus(payload.statusMessage);
      }
    } catch (refreshError) {
      console.error(refreshError);
      showError(resolveFriendlyMessage(refreshError, "Mise a jour des previews impossible."));
    } finally {
      setLoadingAction((current) => (current === "refresh" ? null : current));
    }
  }, [project, showError, syncPreviewImages]);

  const handleProductSelection = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!project || !selectedProductId || !selectedVariantId) {
        showError("Selectionnez un produit et une variante pour continuer.");
        return;
      }

      clearError();
      setLoadingAction("product");

      try {
        const product = products.find((item) => item.productId === selectedProductId);

        const response = await fetch(`/api/studio/projects/${project.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: product?.provider,
            productId: selectedProductId,
            productVariantId: selectedVariantId,
          }),
        });

        if (!response.ok) {
          await raiseResponseError("product_save_failed", response);
        }

        const payload = await response.json();
        const normalizedProject = normalizeProject(payload.project, project);
        setProject(normalizedProject);
        syncPreviewImages(normalizedProject);
        setStepIndex(4);
      } catch (productError) {
        console.error(productError);
        showError(resolveFriendlyMessage(productError, "Impossible d'enregistrer la selection produit."));
      } finally {
        setLoadingAction((current) => (current === "product" ? null : current));
      }
    },
    [project, products, selectedProductId, selectedVariantId, clearError, showError, syncPreviewImages],
  );

  const handleBriefSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!project) {
        return;
      }

      if (prompt.trim().length === 0) {
        showError("Ajoutez une description pour guider la generation.");
        return;
      }

      setLoadingAction("brief");
      clearError();

      let nextProjectId: string | null = null;

      try {
        const response = await fetch(`/api/studio/projects/${project.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim().length === 0 ? project.title : title,
            promptText: prompt,
            styleId: selectedStyleId || undefined,
          }),
        });

        if (!response.ok) {
          await raiseResponseError("brief_save_failed", response);
        }

        const payload = await response.json();
        const normalizedProject = normalizeProject(payload.project, project);
        setProject(normalizedProject);
        syncPreviewImages(normalizedProject);
        setStepIndex(2);
        nextProjectId = normalizedProject.id;
      } catch (briefError) {
        console.error(briefError);
        showError(resolveFriendlyMessage(briefError, "Impossible d'enregistrer le brief."));
      } finally {
        setLoadingAction((current) => (current === "brief" ? null : current));
      }

      if (nextProjectId) {
        void handlePreviewLaunch(nextProjectId);
      }
    },
    [project, prompt, title, selectedStyleId, handlePreviewLaunch, clearError, showError, syncPreviewImages],
  );

  return (
    <>
      <NotificationTray items={notifications} onDismiss={dismissNotification} />
      {activeLoadingMessage ? (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-start justify-center bg-slate-950/25 backdrop-blur-sm">
          <div className="mt-28 flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-4 py-2 text-sm text-slate-200 shadow-xl">
            <Loader2 className="h-4 w-4 animate-spin text-violet-300" aria-hidden="true" />
            <span>{activeLoadingMessage}</span>
          </div>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <WorkflowSteps
          steps={WORKFLOW_STEPS}
          currentStepIndex={stepIndex}
          loading={isBusy}
          onSelect={goToStep}
        />
        <div className="space-y-6">
        {canNavigateBackward ? (
          <div className="flex justify-end">
            <Button variant="ghost" onClick={handleStepBack} disabled={isBusy}>
              &lt; Retour a l'etape precedente
            </Button>
          </div>
        ) : null}

        {currentStep.key === "upload" && (
          <Card className="border-slate-800 bg-slate-900/70 shadow-xl">
            <CardHeader>
              <CardTitle>Importez votre photo</CardTitle>
              <CardDescription>
                PNG ou JPG jusque 25 Mo. Preferez des images de 2048 px minimum pour un rendu optimal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border border-dashed border-slate-700 bg-slate-900/50 p-6 text-center">
                <p className="text-sm text-slate-300">Glissez-deposez un fichier ou cliquez pour parcourir.</p>
                <p className="mt-2 text-xs text-slate-500">Nous utiliserons cette image comme reference.</p>
                <div className="mt-4 flex justify-center">
                  <Input type="file" accept="image/*" disabled={isUploading || isBusy} onChange={handleFileChange} />
                </div>
                {isUploading ? (
                  <div className="mt-4 flex items-center justify-center gap-2 text-violet-300">
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    <span className="text-xs uppercase tracking-wide">Import en cours</span>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep.key === "product" && project && (
          <Card className="border-slate-800 bg-slate-900/70 shadow-xl">
            <CardHeader>
              <CardTitle>Choisissez un produit</CardTitle>
              <CardDescription>
                Un seul produit pour commencer. Vous pourrez ajouter des options supplementaires plus tard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {products.map((item) => (
                  <button
                    key={`${item.provider}-${item.productId}`}
                    type="button"
                    className={cn(
                      "flex flex-col gap-2 rounded-lg border p-4 text-left transition",
                      selectedProductId === item.productId
                        ? "border-violet-400 bg-violet-500/10"
                        : "border-slate-700 bg-slate-900/60 hover:border-slate-500",
                      isSavingProduct && selectedProductId !== item.productId && "opacity-60",
                    )}
                    disabled={isSavingProduct}
                    onClick={() => {
                      setSelectedProductId(item.productId);
                      setSelectedVariantId("");
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-50">{item.name}</p>
                      <Badge className="uppercase tracking-wide">{item.kind}</Badge>
                    </div>
                    {item.description ? <p className="text-xs text-slate-400">{item.description}</p> : null}
                  </button>
                ))}
              </div>

              {currentProduct ? (
                <form className="space-y-3" onSubmit={handleProductSelection}>
                  <Label htmlFor="variant">Variante</Label>
                  <select
                    id="variant"
                    className="w-full rounded-md border border-slate-700 bg-slate-900 p-3 text-sm text-slate-100"
                    value={selectedVariantId}
                    onChange={(event) => setSelectedVariantId(event.target.value)}
                    disabled={isSavingProduct}
                  >
                    <option value="">Selectionnez une variante</option>
                    {currentProduct.variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.label}
                        {variant.pieces ? ` ' ${variant.pieces} pieces` : ""}
                        {variant.sizeHint ? ` ' ${variant.sizeHint}` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500">
                    Resolution minimale recommande: {currentProduct.variants[0]?.dpiRequirement ?? 300} DPI.
                  </p>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSavingProduct || !selectedVariantId} className="gap-2">
                      {isSavingProduct ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          Enregistrement...
                        </>
                      ) : (
                        "Enregistrer et continuer"
                      )}
                    </Button>
                  </div>
                </form>
              ) : null}
            </CardContent>
          </Card>
        )}

        {currentStep.key === "brief" && project && (
          <Card className="border-slate-800 bg-slate-900/70 shadow-xl">
            <CardHeader>
              <CardTitle>Composez votre brief</CardTitle>
              <CardDescription>Indiquez les elements clefs pour guider la generation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <form className="space-y-5" onSubmit={handleBriefSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="studio-title">Titre du projet</Label>
                    <Input
                      id="studio-title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      disabled={isSavingBrief}
                    />
                  </div>
                  <div>
                    <Label htmlFor="studio-style">Style artistique</Label>
                    <select
                      id="studio-style"
                      className="w-full rounded-md border border-slate-700 bg-slate-900 p-3 text-sm text-slate-100"
                      value={selectedStyleId}
                      onChange={(event) => setSelectedStyleId(event.target.value)}
                      disabled={isSavingBrief}
                    >
                      <option value="">Libre</option>
                      {styles.map((style) => (
                        <option key={style.id} value={style.id}>
                          {style.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="studio-prompt">Decrivez le rendu souhaite</Label>
                  <Textarea
                    id="studio-prompt"
                    rows={7}
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    disabled={isSavingBrief}
                    placeholder="Decrivez la scene finale, les emotions, les couleurs, le type de rendu..."
                  />
                  <div className="mt-2 space-y-2 text-xs text-slate-400">
                    <p>Suggestions:</p>
                    <div className="flex flex-wrap gap-2">
                      {PROMPT_SUGGESTIONS.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          className="rounded-full border border-slate-600 px-3 py-1 text-slate-200 hover:border-violet-400"
                          onClick={() =>
                            setPrompt((current) =>
                              current.includes(suggestion)
                                ? current
                                : current.length === 0
                                ? suggestion
                                : `${current}\n${suggestion}`,
                            )
                          }
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSavingBrief} className="gap-2">
                    {isSavingBrief ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Sauvegarde...
                      </>
                    ) : (
                      "Enregistrer le brief"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {currentStep.key === "preview" && project && (
          <Card className="border-slate-800 bg-slate-900/70 shadow-xl">
            <CardHeader>
              <CardTitle>Vos previews</CardTitle>
              <CardDescription>
                Comparez la photo d'origine et les rendus generes. Rafraichissez des qu'une nouvelle preview est disponible.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Photo d'origine</p>
                  <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-950/40">
                    {originalPhotoSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={originalPhotoSrc}
                        alt="Photo d'origine"
                        className="h-full w-full object-cover"
                        onError={() => {
                          if (!useLocalPreviewFallback && localPreviewUrl) {
                            setUseLocalPreviewFallback(true);
                          }
                        }}
                      />
                    ) : (
                      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
                        Apercu indisponible pour le moment.
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Previews IA</p>
                  {project.status === "GENERATING" ? (
                    <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4 rounded-xl border border-violet-500/40 bg-gradient-to-br from-slate-900/90 to-violet-900/20 p-8 text-center">
                      <div className="relative">
                        <Loader2 className="h-16 w-16 animate-spin text-violet-400" aria-hidden="true" />
                        <div className="absolute inset-0 animate-pulse rounded-full bg-violet-500/20 blur-xl" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-base font-semibold text-slate-100">Generation en cours...</p>
                        <p className="max-w-xs text-sm text-slate-400">{generationStatus}</p>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-violet-400" />
                        <span>L'IA travaille sur votre creation</span>
                      </div>
                    </div>
                  ) : previewImages.length > 0 ? (
                    <div className="space-y-4">
                      <div className="relative overflow-hidden rounded-xl border border-violet-500/40 bg-slate-950/40">
                        <Image
                          src={previewImages[0].url}
                          alt={`Preview principale du projet ${project.title}`}
                          width={900}
                          height={900}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-3 text-xs text-slate-200">
                          Genere le {new Date(previewImages[0].createdAt).toLocaleString("fr-FR")}
                        </div>
                      </div>
                      {previewImages.length > 1 ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {previewImages.slice(1).map((preview) => (
                            <div key={preview.id} className="overflow-hidden rounded-lg border border-slate-700/70 bg-slate-950/40">
                              <Image
                                src={preview.url}
                                alt={`Preview ${preview.id}`}
                                width={600}
                                height={600}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center text-sm text-slate-400">
                      <span>Aucune preview disponible pour le moment.</span>
                      <Button onClick={() => handlePreviewLaunch()} disabled={isLaunchingPreview} className="gap-2">
                        {isLaunchingPreview ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            Generation...
                          </>
                        ) : (
                          "Lancer une preview"
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-800 pt-4 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-100">Etat:</p>
                    {project.status === "GENERATING" && (
                      <Badge className="border-sky-400/60 bg-sky-500/10 text-sky-200">
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        En cours
                      </Badge>
                    )}
                    {project.status === "READY" && (
                      <Badge className="border-emerald-400/60 bg-emerald-500/10 text-emerald-200">
                        Pret
                      </Badge>
                    )}
                    {project.status === "FAILED" && (
                      <Badge className="border-rose-400/60 bg-rose-500/10 text-rose-200">
                        Echoue
                      </Badge>
                    )}
                    {project.status === "DRAFT" && (
                      <Badge className="border-amber-400/60 bg-amber-500/10 text-amber-200">
                        Brouillon
                      </Badge>
                    )}
                  </div>
                  {generationStatus ? (
                    <p className="mt-1 text-xs text-slate-500">{generationStatus}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={handlePreviewRefresh}
                    disabled={isRefreshingPreview || !project?.id || project.status === "GENERATING"}
                    className="gap-2"
                  >
                    {isRefreshingPreview ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Actualisation...
                      </>
                    ) : (
                      "Actualiser les previews"
                    )}
                  </Button>
                  <Button
                    onClick={() => handlePreviewLaunch()}
                    disabled={isLaunchingPreview || project.status === "GENERATING"}
                    className="gap-2"
                  >
                    {isLaunchingPreview ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Generation...
                      </>
                    ) : (
                      "Lancer une nouvelle preview"
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => goToStep(3, { allowForward: true })}
                    disabled={project?.status !== "READY"}
                  >
                    Choisir un produit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep.key === "checkout" && project && (
          <Card className="border-slate-800 bg-slate-900/70 shadow-xl">
            <CardHeader>
              <CardTitle>Prochaine etape</CardTitle>
              <CardDescription>
                Des que la preview est validee, vous pourrez choisir les quantites et finaliser le paiement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-300">
                Nous vous enverrons un email avec la preview finale ainsi qu'un lien direct vers la caisse. Vous pouvez fermer cette page, nous vous
                guiderons pour la suite.
              </p>
              <div className="rounded-md border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300">
                <p className="font-semibold text-slate-100">Et apres ?</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Recevez la preview et le mockup produit par email.</li>
                  <li>Validez ou demandez une retouche.</li>
                  <li>Passez en caisse et suivez l'expedition en temps reel.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
    </>
  );
}
