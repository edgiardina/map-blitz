# Matchplay Map Blitz

[![CI](https://github.com/edgiardina/map-blitz/actions/workflows/ci.yml/badge.svg)](https://github.com/edgiardina/map-blitz/actions/workflows/ci.yml)

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL for the backend API proxy. Set this to point to your self-hosted server (e.g. `http://localhost:5000`). | Lovable Cloud functions URL |

To self-host the backend, add this to your `.env`:

```
VITE_API_BASE_URL=http://localhost:5000
```

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
