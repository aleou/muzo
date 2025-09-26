# MUZO - Architecture et bonnes pratiques

## 1. Vision produit

MUZO permet à un utilisateur de transformer une photo personnelle en illustration stylisée prête à être imprimée sur des produits physiques (puzzle, poster, toile). L'expérience couvre la génération IA, la sélection produit, le paiement et l'intégration aux fournisseurs Print-on-Demand.

## 2. Architecture globale

- Interface utilisateur et API en Next.js (App Router) hébergés sur Vercel.
- Worker Node.js indépendant orchestrant BullMQ pour les tâches asynchrones (génération, mockup, fulfilment).
- Base de données MongoDB Atlas administrée via Prisma (provider Mongo).
- Stockage médias S3 avec uploads directs via URL pré-signée.
- File d'attente Redis (Upstash) pour BullMQ.
- Paiement Stripe Checkout et webhooks pour synchroniser les commandes.
- Fournisseurs POD abstraits via un module FulfillmentProvider (Printful, Printify).
- Observabilité avec Sentry et Logtail (hooks prévus dans le worker et le web).

## 3. Répartition monorepo

apps/web - Next.js App Router, UI et API publiques
apps/worker - Worker Node.js (BullMQ) pour les tâches longues
packages/db - Prisma, accès MongoDB, repositories
packages/queue - Définitions de payloads et helpers BullMQ
packages/fulfillment - Abstraction Printful/Printify et intégrations HTTP
packages/ai - SDK interne pour RunPod et outils IA
config - Configs partagées à compléter
scripts - Outils CLI et automatisations à compléter
docs - Documentation technique et produit

## 4. Modules clés

### 4.1 Web (apps/web)

- App Router et server actions pour limiter les API routes publiques.
- NextAuth pour l'authentification (email et OAuth extensible).
- Upload direct S3 via POST api/upload-url (URL pré-signée, ACL privée) puis enregistrement de l'Asset.
- Gestion d'état client avec React Query et streaming RSC pour afficher la progression des jobs.
- Instrumentation Sentry et traçabilité Stripe (idempotency keys, logs).

### 4.2 Worker (apps/worker)

- File d'attente BullMQ avec trois queues : generation, mockup, fulfillment.
- Chaque queue crée un Worker dédié qui consomme les jobs et se connecte à Redis Upstash.
- Orchestration RunPod via package @muzo/ai pour lancer la génération et gérer l'upscaling.
- Pipeline médias : récupération S3, upscaling (StableDiffusion, Real-ESRGAN), conversion 300 DPI via Sharp (à implémenter).
- Fulfillment : construction de la commande, appel API fournisseur, suivi du statut via webhooks.

### 4.3 Package DB (packages/db)

- Prisma modèle Mongo avec collections User, Style, Project, ProjectOutput, Order, Job, Asset.
- Repositories fins par domaine pour éviter l'exposition directe du client Prisma.
- Fonctions utilitaires pour les mises à jour orchestrées (exemple upsertGenerationResult).

### 4.4 Package Queue (packages/queue)

- Schémas Zod pour valider les payloads de jobs (generation, mockup, fulfillment).
- Types exportés pour garantir la cohérence entre web et worker.

### 4.5 Package Fulfillment (packages/fulfillment)

- Interface FulfillmentProvider avec méthodes createOrder, getOrderStatus, listProducts, listVariants.
- Implémentations HTTP pour Printful et Printify (stubs à compléter avec la logique métier réelle et les identifiants boutique).
- Gestion d'erreurs et logs via Pino.

### 4.6 Package AI (packages/ai)

- Client RunPod (Axios) pour déclencher la génération et valider la réponse via Zod.
- Hooks pour ajouter plus tard l'upscaling et la conversion colorimétrique.

## 5. Flux utilisateur (MVP)

1. Upload d'une image via l'URL pré-signée S3, création d'un Asset.
2. Création d'un Project avec style et prompt, création d'un Job generation et push dans BullMQ.
3. Worker consomme le job, appelle RunPod, stocke le rendu final sur S3 et met à jour Project.status.
4. L'utilisateur choisit un produit, déclenche Stripe Checkout via POST api/checkout.
5. Webhook Stripe payment_intent.succeeded, création Order et Job fulfillment.
6. Worker envoie la commande au fournisseur POD, surveille les webhooks Printful ou Printify et met à jour Order.status.
7. L'interface affiche l'état de la commande dans l'espace utilisateur et envoie des emails transactionnels (Resend).

## 6. Modèles de données

- User : email, nom, rôle, liens vers projects et orders.
- Style : nom, prompts, presets (sd model, cfg, steps, exemples visuels).
- Project : image d'entrée, style, prompt, statut (draft, generating, ready, failed), outputs.
- Order : relation user et project, provider, produit, prix, statut (created, paid, sent, fulfilled, failed).
- Job : type (generation, mockup, fulfillment), statut, payload JSON, résultat JSON.
- Asset : type (input, output, mockup), s3Key, métadonnées (dimensions, dpi, profil colorimétrique).

## 7. Endpoints essentiels

- POST api/upload-url : génère la signature S3.
- POST api/projects et GET api/projects/:id : création et consultation des projets.
- POST api/jobs/:id/retry : relancer un job échoué.
- POST api/checkout : création session Stripe.
- POST api/webhooks/stripe : traitement paiement.
- POST api/webhooks/printful ou api/webhooks/printify : suivi fulfilment.
- GET api/products : catalogue POD exposé au front.

## 8. Sécurité et conformité

- Filtrer les contenus via un service de modération (Vision, Nudity, logos protégés).
- Vérifier les dimensions minimums et DPI avant génération.
- Anonymiser les données sensibles, appliquer RGPD (opt-in, purge utilisateur sur demande, DPA avec Stripe et fournisseurs).
- Signer toutes les requêtes webhooks et vérifier les signatures Stripe et Printful.
- Mettre en place du rate limiting sur les actions critiques (Upstash Ratelimit).
- Gestion des secrets via Vercel, Doppler ou AWS Secrets Manager suivant l'environnement.

## 9. Observabilité et qualité

- Sentry pour web et worker (traces, erreurs, release health).
- Logtail ou Better Stack pour les logs applicatifs.
- Tests E2E avec Playwright (scénarios upload, génération, paiement simulé).
- Tests contractuels sur les packages (Zod et Vitest) pour valider les payloads.
- CI GitHub Actions : lint, typecheck, tests, preview deployments.

## 10. Roadmap 3 sprints

Sprint 1 - Base produit (MVP génératif)
- Mise en place de la monorepo Turborepo et des packages partagés.
- Authentification NextAuth et Mongo.
- Upload S3 pré-signé et stockage Asset.
- Pages Studio (upload, style, prompt), galerie et détail Project.
- Queue Upstash et worker Dockerisé.
- Intégration RunPod (génération, upscaling, métadonnées).

Sprint 2 - Paiement et POD
- Stripe Checkout et webhooks.
- Abstraction FulfillmentProvider et implémentation Printful.
- Catalogue produits et variantes avec règles DPI.
- Création commande POD après paiement et suivi via webhooks.
- Page Commandes utilisateur.

Sprint 3 - Qualité et Ops
- Génération mockups auto (Sharp ou Canvas).
- Observabilité (Sentry, logs structurés) et rate limiting.
- Emails transactionnels (Resend).
- Landing marketing, CGV, politique de confidentialité.
- Tests E2E et pipeline CI complet.

## 11. Bonnes pratiques et conventions

- Utiliser Zod pour valider systématiquement les payloads entrants (API routes, jobs, webhooks).
- Maintenir la séparation web et worker pour scaler indépendamment.
- Centraliser la configuration environnementale via des helpers (lib/env.ts, utils/env.ts).
- Versionner les presets de style dans la base et prévoir une UI interne pour les affiner.
- Respecter le DPI 300 minimum et convertir les profils colorimétriques avant envoi à Printful ou Printify.
- En production, stocker uniquement les URLs S3 privées et générer des URLs temporaires pour le front.
- Ajouter des tests unitaires pour chaque provider d'impression et chaque transformation média.

## 12. Onboarding développeur

1. Cloner le repo, installer pnpm, exécuter pnpm install.
2. Configurer les secrets locaux via le fichier env.
3. Lancer pnpm dev --filter @muzo/web et pnpm dev --filter @muzo/worker.
4. Utiliser Stripe CLI pour forwarder les webhooks en local.
5. Consulter ce document et le README pour les conventions de commits, la stack et les responsabilités.

## 13. Prochaines étapes suggérées

- Script de seeds (styles) dans packages/db.
- Mise en place de Husky et lint-staged pour formater avant commit.
- Automatiser la création d'URLs pré-signées via AWS SDK dans apps/web.
- Ajouter un package shared/ui pour le design system (Radix UI et Tailwind).
