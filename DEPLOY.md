# Deploying World Sim

World Sim is a fully static PWA — once built (`npm run build`) the `dist/`
folder is everything. Host it on any static host/CDN, or use the included
`Dockerfile` (nginx) on a container platform such as Coolify.

## Coolify (Dockerfile build pack)

1. **Connect the repo.** In Coolify → your project → **+ New Resource** →
   *Application* → *Private Repository (with GitHub App)* (or *Public* if the
   repo is public). Select `techman44/worldsim` and the branch you want
   (`main`, or `claude/world-sim-sandbox-enfh6q` for this PR).
2. **Build pack:** choose **Dockerfile** (the repo root `Dockerfile` builds the
   site and serves it with nginx).
3. **Port:** set the exposed/ports value to **80**.
4. **Domain:** set your domain (e.g. `worldsim.deansdomain.co`). Coolify
   provisions HTTPS automatically.
5. **Deploy.** Subsequent pushes can auto-deploy if you enable the webhook.

That's it — no environment variables or secrets are required; the app has no
backend.

### Alternative: Coolify "Static" build pack (no Dockerfile)

If you'd rather not use the Dockerfile:

- Build pack: **Nixpacks** or **Static**
- Install command: `npm ci`
- Build command: `npm run build`
- Publish / output directory: `dist`
- Port: `80` (Coolify serves the static output)

## Local container test

```bash
docker build -t worldsim .
docker run --rm -p 8080:80 worldsim
# open http://localhost:8080
```

## Any static host

`npm run build` then upload `dist/` to Netlify, Vercel, Cloudflare Pages,
GitHub Pages, S3+CloudFront, etc. The app uses a **relative base path**, so it
works from a sub-path too (e.g. GitHub Pages project sites). Make sure
`sw.js` and `index.html` are served with no-cache headers so PWA updates land
(the included nginx config already does this).

## Note on automated deploys from this assistant

Deploying directly from the Claude Code remote environment to an external
Coolify server requires that server to be allowed by the session's egress
network policy. If you want me to drive the Coolify API directly in a future
session, create the environment with a network policy that permits your
Coolify host, and I can script the deploy via the Coolify REST API.
