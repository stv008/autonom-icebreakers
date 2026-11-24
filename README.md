# Autonom Icebreakers

A small installable web app (PWA) that shows one ice-breaker question at a time to open internal meetings. Romanian and English, works offline after the first visit, no accounts, no analytics.

**Live:** https://stv008.github.io/autonom-icebreakers/

## Develop

Requires Node.js 22.12 or newer.

```bash
npm ci
npm run dev        # local dev server
npm run validate   # check public/data/questions.json
npm test           # unit tests
npm run build      # type-check, build to dist/, check the build output
npm run preview    # serve the production build
```

## Content

Questions live in versioned files under `public/data/` and are activated through `public/data/manifest.json` (a higher `releaseSeq` wins). `scripts/` holds the validator and the release scripts.

## Deploy

Every push to `main` runs validation, tests and the build, then publishes `dist/` to GitHub Pages (`.github/workflows/deploy-pages.yml`).
