# AI Media SaaS

A professional image and video utility SaaS built with modern Next.js, Cloudinary, Clerk, Prisma, and Neon PostgreSQL.

The product starts as a **free public beta** and is designed to become a **freemium SaaS** after real user demand and usage justify paid features.

---

## Product Goal

Build a real public media utility where users can:

- Sign up and manage their own private workspace
- Upload images and videos
- Optimize media with Cloudinary
- Create social-media image variants
- Use AI-assisted smart cropping
- Compress and preview videos
- Save media history
- Download optimized outputs
- Manage their own media library

This is not only a tutorial or portfolio project. The goal is to build a real product that other users can use.

---

## Development Rule

We build every feature using this workflow:

1. Understand the concept
2. Understand the architecture and flow
3. Implement a small step
4. Test it
5. Review and debug
6. Polish the UI
7. Move to the next feature

We do not move forward only because a tutorial section is finished.

---

## Current Technology Baseline

- Next.js 16.3.8
- React 19.3
- JavaScript
- Node.js 24 LTS
- Bun
- Tailwind CSS 4

Additional technologies will be installed in their related development phases.

---

## Planned Core Stack

### Frontend

- Next.js App Router
- React
- JavaScript
- Tailwind CSS
- daisyUI
- Lucide React

### Authentication

- Clerk

### Database

- PostgreSQL
- Neon
- Prisma ORM

### Media

- Cloudinary
- next-cloudinary

### Validation

- Zod

### Utilities

- Axios / Fetch
- Day.js
- filesize

### Testing

- Vitest
- Testing Library
- Playwright

Production-stable compatible versions are verified before implementation.

---

## V1 Features

### Authentication

- Sign up
- Sign in
- Sign out
- Protected dashboard
- Account menu
- User-specific data ownership

### Dashboard

- Quick actions
- Recent media
- Usage summary
- Processing status
- Product tips

### Image Studio

- Image upload
- Drag and drop
- Upload progress
- AI-assisted smart crop
- Image optimization
- Social-media presets
- Preview
- Download
- Save to Media Library

### Video Studio

- Direct video upload
- Upload progress
- Video optimization
- Thumbnail generation
- Smart video preview
- Processing status
- Compression statistics
- Download
- Save to Media Library

### Media Library

- User-owned media
- Grid/list view
- Search
- Filters
- Asset details
- Download
- Delete
- Processing states

### Production Quality

- File validation
- File-size limits
- Usage limits
- Secure signed uploads
- Server-side authorization
- User ownership checks
- Responsive UI
- Loading states
- Error states
- Empty states
- Automated testing

---

## Route Map

```text
/
├── /sign-in
├── /sign-up
├── /dashboard
├── /studio/image
├── /studio/video
├── /library
├── /settings
└── /pricing        # future
```

### API Direction

```text
/api/cloudinary/sign
/api/media
/api/media/[id]
/api/usage
/api/webhooks/cloudinary
/api/webhooks/billing      # future
```

---

## Planned Project Structure

```text
app/
  (marketing)/
  (auth)/
  (dashboard)/
    dashboard/
    studio/
      image/
      video/
    library/
    settings/
  api/

components/
  layout/
  media/
  studio/
  ui/

lib/
  auth.js
  cloudinary.js
  prisma.js
  usage.js
  validators.js
  presets.js

prisma/
  schema.prisma

public/

tests/

proxy.js
```

Folders will be created only when they are actually needed.

---

## Architecture

```text
                    USER
                      │
                      ▼
              Next.js Application
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
      Clerk Auth             Dashboard
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
              Image Studio                 Video Studio
                    │                           │
                    └──────────┬────────────────┘
                               │
                               ▼
                          Cloudinary
                               │
                   Upload / Transform / Optimize
                               │
                               ▼
                        Next.js APIs
                               │
                               ▼
                            Prisma
                               │
                               ▼
                      Neon PostgreSQL
```

---

## Architecture Rules

- Large media uploads go directly from the browser to Cloudinary.
- Next.js route handlers should not buffer large video files.
- Cloudinary API secrets stay server-side.
- Every protected API verifies the authenticated user.
- Every media operation verifies ownership.
- Users cannot choose arbitrary Cloudinary folders.
- Cloudinary stores media files.
- Neon PostgreSQL stores application metadata and ownership information.
- One reusable Prisma client/service is used.
- Client Components never query the database directly.
- Zod validates server input.
- Raw database or provider errors are never exposed directly to users.
- Expensive Cloudinary transformations are controlled through approved presets.

---

## User Ownership Model

Every asset belongs to one authenticated user.

```text
User A
├── Image 1
├── Image 2
└── Video 1

User B
├── Image 1
└── Video 1
```

User A must never be able to access, modify, download, or delete User B's private media through either the UI or API.

---

## Media Processing Status

```text
PENDING
   ↓
UPLOADING
   ↓
PROCESSING
   ↓
READY
```

If something fails:

```text
PENDING / UPLOADING / PROCESSING
              ↓
            FAILED
```

The UI should always clearly show the current state.

---

## Image Studio Presets

Initial social-media presets include:

```text
Instagram Square      1080 x 1080
Instagram Portrait    1080 x 1350
X Post                1200 x 675
X Header              1500 x 500
Facebook Cover         820 x 312
```

Preset definitions will live in one configuration module so they can be updated later without changing the UI or business logic.

---

## Design Direction

### Product Style

Modern utility SaaS:

- Clean
- Professional
- Simple
- Fast
- Trustworthy
- Creator-friendly

### Design Tokens

```text
Primary        Indigo / Purple
Secondary      Cyan / Teal

Background     Near white
Surface        White
Dark neutral   Deep navy
Text           Slate / neutral

Radius         Medium to large
Borders        Subtle
Shadows        Minimal

Typography     Inter or equivalent system sans-serif
Theme          Light mode first
```

Dark mode can be added after the core product is stable.

---

## UI Principles

- Never make the user guess whether an upload is still working.
- Show upload limits before the upload starts.
- Use visible progress indicators.
- Provide clear success and error messages.
- Avoid browser `alert()` for production UX.
- Use skeletons while loading dashboard/library data.
- Confirm destructive delete actions.
- Keep advanced options hidden until they provide real value.
- Make mobile workflows usable without hover interactions.
- Never display raw Cloudinary, Prisma, or database errors to users.

---

## Security Principles

- Never commit secrets.
- Never expose server credentials to Client Components.
- Verify authentication server-side.
- Verify media ownership server-side.
- Validate file type and size.
- Apply user quotas.
- Use signed Cloudinary uploads.
- Control Cloudinary folders from the server.
- Restrict supported transformations.
- Verify provider webhooks.
- Prevent cross-user media access.
- Clean up failed or orphaned media.
- Keep dependencies and Next.js security patches current.

---

## Environment Variables

The project uses `.env.local` for real credentials.

Real environment files must never be committed.

`.env.example` documents the required variables:

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Database
DATABASE_URL=

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## Launch Model

Initial release:

```text
FREE PUBLIC BETA
```

Free does not mean unlimited.

The beta will use configurable fair-use limits to protect:

- Cloudinary transformations
- Media processing
- Storage
- Bandwidth
- Database usage
- Hosting resources

Image usage limits can be more generous than video limits because video processing and delivery are more expensive.

---

## Future Monetization

The application will be monetization-ready from the architecture level, but payment will not be added before the product has real usage.

### Free

- Core image presets
- Basic video optimization
- Smart previews
- Personal Media Library
- Fair-use quota

### Pro

- Higher image and video limits
- Larger file support
- Batch processing
- Custom dimensions
- Custom presets
- Longer storage retention
- Advanced media tools

### Business / API

- Team workspaces
- Brand kits
- API access
- API keys
- Webhooks
- Usage-based processing
- Business integrations
- Support options

Possible future revenue models include subscriptions, processing credit packs, developer API usage, agency plans, and white-label integrations.

---

## Future Product Features

### After Stable V1

- Custom resize
- Batch image processing
- Saved presets
- Better media details
- Usage dashboard
- Dark mode
- Onboarding tour

### Growth Features

- Background removal
- Watermark/logo overlay
- Video trim
- Video crop
- Audio extraction
- GIF export
- Short clip export
- Expiring share links

### AI Layer

Future Generative AI features may include:

- Auto alt text
- Social caption generation
- Hashtag suggestions
- Title generation
- Description generation
- Video transcription
- Subtitle generation
- Smart moderation

The AI provider can later be OpenAI, Gemini, or another provider behind a common adapter.

### Business Features

- Brand kits
- Team workspaces
- Roles
- Shared folders
- Approval workflows
- Custom retention policies

### Developer Platform

- API keys
- REST API
- Webhooks
- Usage metering
- API documentation
- SDK examples

### Platform Expansion

- PWA
- Installable desktop/mobile web experience
- Cloud-storage integrations
- Social platform integrations
- Background job infrastructure if required by future scale

---

## Development Roadmap

```text
Phase 0
Product Setup
        ↓
Phase 1
UI Foundation
        ↓
Phase 2
Clerk Authentication
        ↓
Phase 3
Neon + Prisma
        ↓
Phase 4
Cloudinary Foundation
        ↓
Phase 5
Image Studio
        ↓
Phase 6
Video Studio
        ↓
Phase 7
Media Library
        ↓
Phase 8
Security + Quotas
        ↓
Phase 9
Testing + Polish
        ↓
Phase 10
Public Free Beta
        ↓
Phase 11
Monetization Readiness
```

---

## Phase 0 — Product Setup

Current phase.

Goals:

- Create the new JavaScript project
- Verify runtime and dependency versions
- Configure Git
- Protect secrets
- Create environment template
- Document architecture
- Document route map
- Define design direction
- Define development rules

### Phase 0 Checklist

- [x] Next.js project created
- [x] JavaScript selected
- [x] App Router selected
- [x] Tailwind CSS enabled
- [x] Git initialized
- [x] Node.js verified
- [x] Bun verified
- [x] Git verified
- [x] Next.js version verified
- [x] React version verified
- [x] `.env.example` created
- [x] Secrets protected by `.gitignore`
- [x] AI coding-agent rules added
- [x] Route map documented
- [x] Architecture documented
- [x] Design direction documented
- [x] Security principles documented
- [x] Product decisions documented
- [ ] Lint passes
- [ ] Production build passes
- [ ] Git secret check passes
- [ ] Phase 0 committed

---

## Current Status

```text
Phase 0 — Product Setup

Almost Complete
```

Next milestone:

```text
Phase 1 — Professional UI Foundation
```

Phase 1 will build:

- Marketing landing page
- Dashboard shell
- Responsive sidebar
- Top navigation
- Reusable buttons
- Cards
- Toast patterns
- Skeleton loading patterns
- Empty states
- Error states

---

## Source of Truth

The project follows:

**AI Media SaaS — Complete Product Blueprint & Build Roadmap v1.0**

The blueprint is the main project reference.

Architecture or product scope should only change intentionally, not randomly during implementation.