<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AI Media SaaS Project Rules

## Language
- Use JavaScript only for application code.
- Do not introduce TypeScript unless explicitly approved.
- Use `.js` and `.jsx` files.

## Framework
- Use Next.js App Router.
- Follow the current stable Next.js APIs and conventions.
- Use `proxy.js` instead of the old `middleware.js` convention where applicable.
- Prefer Server Components for read-heavy pages.
- Use Client Components only when browser interaction or client state is required.

## Project Architecture
- Follow the AI Media SaaS Blueprint and Build Roadmap.
- Do not add random features outside the approved roadmap.
- Keep the main structure organized around:
  - `app/`
  - `components/`
  - `lib/`
  - `prisma/`
  - `public/`
  - `tests/`

## Security
- Never expose server secrets to client components.
- Never commit `.env.local` or real credentials.
- Every protected server route/action must verify the authenticated user.
- Every media read/update/delete must verify ownership.
- Never trust a client-provided user ID, Cloudinary folder, or public ID without server validation.

## Database
- Use one reusable Prisma client/service.
- Do not create a new `PrismaClient()` inside every route.
- All user-owned data queries must be scoped by the current user.

## Media Uploads
- Large images and videos should upload directly from the browser to Cloudinary using authenticated signed uploads.
- Do not buffer large video files inside Next.js route handlers.
- Cloudinary API secrets must remain server-side.

## Validation
- Use Zod for server-side validation.
- Validate file type, file size, ownership, quota, and allowed transformations.
- Return clear user-safe errors instead of raw provider/database errors.

## UI
- Build professional UI alongside each feature.
- Use Tailwind CSS lightly and clearly.
- Keep the interface simple, responsive, accessible, and mobile-friendly.
- Every async workflow should have loading, success, empty, and error states.

## Development Workflow
For every feature follow:

1. Understand the concept.
2. Draw/explain the flow.
3. Implement a small code step.
4. Test it.
5. Review/debug it.
6. Polish the UI.
7. Only then move to the next feature.

## Scope
The V1 core includes:
- Authentication
- Dashboard
- Image Studio
- Video Studio
- Media Library
- Usage limits
- Security
- Testing
- Deployment

Payments, team workspaces, public APIs, and generative AI are future phases unless the blueprint is intentionally updated.
