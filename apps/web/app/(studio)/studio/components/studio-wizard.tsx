"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
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
  promptText: string;
  status: string;
  previewCount: number;
  productProvider?: string | null;
  productId?: string | null;
  productVariantId?: string | null;
};

type Asset = {
  id: string;
  url: string;
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

const ERROR_MESSAGES: Record<string, string> = {
  image_inspection_failed: "Impossible de lire les metadonnees de cette image. Essayez un PNG ou JPG classique.",
  presign_failed: "Service de stockage temporairement indisponible. Patientez quelques instants.",
  upload_failed: "L’envoi du fichier vers le stockage a echoue.",
  project_creation_failed: "Impossible de creer le projet en base de donnees.",
  catalog_failed: "Catalogue produit indisponible actuellement.",
  product_save_failed: "Impossible d’enregistrer le produit selectionne.",
  brief_save_failed: "Enregistrement du brief impossible.",
  generation_failed: "La generation a echoue.",
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

function normalizeProject(raw: unknown, previous: Project | null): Project {
  const source = (raw ?? {}) as Record<string, unknown>;
  const fallback: Project = previous ?? {
    id: "",
    title: "",
    inputImageUrl: "",
    promptText: "",
    status: "",
    previewCount: 0,
    productProvider: null,
    productId: null,
    productVariantId: null,
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
      typeof source.signedInputImageUrl === "string"
        ? source.signedInputImageUrl
        : typeof source.inputImageUrl === "string"
        ? source.inputImageUrl
        : fallback.inputImageUrl,
    promptText:
      typeof source.promptText === "string" ? source.promptText : fallback.promptText,
    status: typeof source.status === "string" ? source.status : fallback.status,
    previewCount: coercePreviewCount(source.previewCount, fallback.previewCount),
    productProvider,
    productId: resolvedProductId ?? null,
    productVariantId: resolvedProductVariantId ?? null,
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

export function StudioWizard({ styles }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [project, setProject] = useState<Project | null>(null);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [useLocalPreviewFallback, setUseLocalPreviewFallback] = useState(false);
  const [products, setProducts] = useState<StudioProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedStyleId, setSelectedStyleId] = useState("");
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState("");
  const canNavigateBackward = stepIndex > 0;

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
        setError(null);
      }
    },
    [setError, stepIndex],
  );

  const handleStepBack = useCallback(() => {
    if (!canNavigateBackward) {
      return;
    }

    goToStep(stepIndex - 1);
  }, [canNavigateBackward, goToStep, stepIndex]);

  const currentStep = WORKFLOW_STEPS[stepIndex];
  const originalPhotoSrc = useLocalPreviewFallback
    ? localPreviewUrl ?? asset?.url ?? ""
    : asset?.url ?? localPreviewUrl ?? "";

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
          setError(resolveFriendlyMessage(catalogError, "Catalogue produit indisponible."));
        }
      }
    }

    fetchProducts();

    return () => {
      cancelled = true;
    };
  }, [stepIndex, products.length, project]);

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

      setError(null);
      setLoading(true);

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
        setError(resolveFriendlyMessage(uploadError, "Impossible de traiter cette image. Merci de reessayer."));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

const handlePreviewLaunch = useCallback(
  async (overrideProjectId?: string) => {
    const rawProjectId = (overrideProjectId ?? project?.id) as unknown;
    const targetProjectId =
      typeof rawProjectId === "string" && rawProjectId.trim().length > 0
        ? rawProjectId
        : extractObjectId(rawProjectId);

    if (!targetProjectId) {
      setError("Aucun projet a generer.");
      return;
    }

    setLoading(true);
    setError(null);
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
      setGenerationStatus("Preview lancee. Nous vous prevenons des qu’elle est prete pour validation.");
    } catch (generationError) {
      console.error(generationError);
      setGenerationStatus("");
      setError(resolveFriendlyMessage(generationError, "Impossible de demarrer la generation."));
    } finally {
      setLoading(false);
    }
  },
  [project],
);

const handleProductSelection = useCallback(
  async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!project || !selectedProductId || !selectedVariantId) {
        setError("Selectionnez un produit et une variante pour continuer.");
        return;
      }

      setError(null);
      setLoading(true);

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
        setStepIndex(4);
      } catch (productError) {
        console.error(productError);
        setError(resolveFriendlyMessage(productError, "Impossible d’enregistrer la selection produit."));
      } finally {
        setLoading(false);
      }
  },
  [project, products, selectedProductId, selectedVariantId],
);

  const handleBriefSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!project) {
        return;
      }

      if (prompt.trim().length === 0) {
        setError("Ajoutez une description pour guider la generation.");
        return;
      }

      setLoading(true);
      setError(null);

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
        setStepIndex(2);
        nextProjectId = normalizedProject.id;
      } catch (briefError) {
        console.error(briefError);
        setError(resolveFriendlyMessage(briefError, "Impossible d’enregistrer le brief."));
      } finally {
        setLoading(false);
      }

      if (nextProjectId) {
        void handlePreviewLaunch(nextProjectId);
      }
    },
    [project, prompt, title, selectedStyleId, handlePreviewLaunch],
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-4">
        {WORKFLOW_STEPS.map((item, index) => {
          const isActive = index === stepIndex;
          const isDone = index < stepIndex;

          return (
            <Card
              key={item.key}
              role={isDone ? "button" : undefined}
              tabIndex={isDone ? 0 : undefined}
              onClick={() => {
                if (isDone && !loading) {
                  goToStep(index);
                }
              }}
              onKeyDown={(event) => {
                if (!isDone || loading) {
                  return;
                }

                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  goToStep(index);
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

      <div className="space-y-6">
        {canNavigateBackward ? (
          <div className="flex justify-end">
            <Button variant="ghost" onClick={handleStepBack} disabled={loading}>
              &lt; Retour à l&apos;étape précédente
            </Button>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        ) : null}

        {currentStep.key === "upload" && (
          <Card>
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
                  <Input type="file" accept="image/*" disabled={loading} onChange={handleFileChange} />
                </div>
                {loading ? <p className="mt-3 text-xs text-violet-300">Chargement en cours...</p> : null}
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep.key === "product" && project && (
          <Card>
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
                    )}
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
                  >
                    <option value="">Selectionnez une variante</option>
                    {currentProduct.variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.label}
                        {variant.pieces ? ` • ${variant.pieces} pieces` : ""}
                        {variant.sizeHint ? ` • ${variant.sizeHint}` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500">
                    Resolution minimale recommande: {currentProduct.variants[0]?.dpiRequirement ?? 300} DPI.
                  </p>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={loading || !selectedVariantId}>
                      Enregistrer et continuer
                    </Button>
                  </div>
                </form>
              ) : null}
            </CardContent>
          </Card>
        )}

        {currentStep.key === "brief" && project && (
          <Card>
            <CardHeader>
              <CardTitle>Composez votre brief</CardTitle>
              <CardDescription>Indiquez les elements clefs pour guider la generation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <form className="space-y-5" onSubmit={handleBriefSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="studio-title">Titre du projet</Label>
                    <Input id="studio-title" value={title} onChange={(event) => setTitle(event.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="studio-style">Style artistique</Label>
                    <select
                      id="studio-style"
                      className="w-full rounded-md border border-slate-700 bg-slate-900 p-3 text-sm text-slate-100"
                      value={selectedStyleId}
                      onChange={(event) => setSelectedStyleId(event.target.value)}
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
                  <Button type="submit" disabled={loading}>
                    Enregistrer le brief
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {currentStep.key === "preview" && project && asset && (
          <Card>
            <CardHeader>
              <CardTitle>Votre preview</CardTitle>
              <CardDescription>
                Comparez la photo d’origine et le rendu IA. Le mockup produit arrivera apres validation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs uppercase text-slate-400">Photo d’origine</p>
                  <div className="overflow-hidden rounded-lg border border-slate-700">
                    {originalPhotoSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={originalPhotoSrc}
                        alt="Photo d’origine"
                        className="h-full w-full object-cover"
                        onError={() => {
                          if (!useLocalPreviewFallback && localPreviewUrl) {
                            setUseLocalPreviewFallback(true);
                          }
                        }}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-slate-900/60 p-6 text-sm text-slate-400">
                        Apercu indisponible pour le moment.
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase text-slate-400">Preview IA</p>
                  <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/50 p-6 text-sm text-slate-400">
                    La preview sera visible ici des qu’elle est prete.
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>{generationStatus ? <p className="text-sm text-emerald-300">{generationStatus}</p> : null}</div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handlePreviewLaunch} disabled={loading}>
                    Lancer la generation gratuite
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
          <Card>
            <CardHeader>
              <CardTitle>Prochaine etape</CardTitle>
              <CardDescription>
                Des que la preview est validee, vous pourrez choisir les quantites et finaliser le paiement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-300">
                Nous vous enverrons un email avec la preview finale ainsi qu’un lien direct vers la caisse. Vous pouvez fermer cette page, nous vous
                guiderons pour la suite.
              </p>
              <div className="rounded-md border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300">
                <p className="font-semibold text-slate-100">Et apres ?</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Recevez la preview et le mockup produit par email.</li>
                  <li>Validez ou demandez une retouche.</li>
                  <li>Passez en caisse et suivez l’expedition en temps reel.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
