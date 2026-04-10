# Syncrio Marketing Site

Standalone marketing/landing site for Syncrio.

## Local Development

1. `cd marketing-site`
2. `npm install`
3. Copy `.env.example` to `.env.local`
4. `npm run dev`

The site runs on `http://localhost:3001` by default.

## Environment Variables

- `NEXT_PUBLIC_SITE_URL`: Public URL of the marketing site
- `NEXT_PUBLIC_APP_URL`: Public URL of the main product app used by `Sign in` and `Get started`

## Deployment

Deploy this folder as its own Next.js app.

Examples:

- Marketing site: `https://syncrio.com`
- Product app: `https://app.syncrio.com`

Then set:

- `NEXT_PUBLIC_SITE_URL=https://syncrio.com`
- `NEXT_PUBLIC_APP_URL=https://app.syncrio.com`
