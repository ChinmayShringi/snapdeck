# @snapdeck/docs

Snapdeck documentation site. Next.js 15 App Router with `output: 'export'` so the build produces a fully static site that GitHub Pages serves.

## Local development

From the repo root:

```bash
pnpm install
pnpm -r --filter="./packages/*" build
pnpm --filter @snapdeck/docs dev
```

Open http://localhost:3000/.

## Local static build

```bash
pnpm --filter @snapdeck/docs build
```

Output lands in `apps/docs/out/`. To preview the GitHub Pages basePath locally:

```bash
NEXT_PUBLIC_BASE_PATH=/snapdeck pnpm --filter @snapdeck/docs build
```

## GitHub Pages deployment

The workflow at `.github/workflows/docs.yml` builds the packages, builds this docs app with `NEXT_PUBLIC_BASE_PATH=/snapdeck`, uploads `apps/docs/out/` as a Pages artifact, and deploys via `actions/deploy-pages@v4`.

One-time repository setup: **Repo Settings → Pages → Source → GitHub Actions**. The workflow needs this to push to the `github-pages` environment.

Site URL: https://chinmayshringi.github.io/snapdeck/
