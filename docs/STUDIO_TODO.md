# Studio TODO

- [ ] Introduce packages/api with studio use-cases (upload, brief, product selection, generation) and consume it from web server actions.
- [ ] Add packages/domain state machines for StudioProject + Order, including transition guards and persistence hooks.
- [ ] Extend Prisma schema with studio-specific entities (StudioProject, ProjectAsset, ProjectGeneration, ProjectSelection, ReferencePrompt, PromptSuggestion, OutboxEvent) and migrations.
- [ ] Centralise job schemas + helpers in packages/queue and slim apps/worker to runners/handlers relying on the shared definitions.
- [ ] Implement single config surface in packages/config and replace scattered env parsing in web/worker.
- [ ] Build step-based studio UI (upload -> brief -> generation -> mockup -> confirmation) with positive guidance and suggestions surfaced from curated prompts.
- [ ] Integrate Printful/Printify catalog ingestion for puzzles/posters and surface dynamic option selectors per provider.
- [ ] Wire image moderation + GDPR retention policies before generation/mockup steps.
- [ ] Ship observability: Sentry across apps, queue metrics, health checks, and job backlog dashboards.
- [ ] Enforce idempotence/outbox-inbox patterns for webhooks, generations, and fulfillment retries.


