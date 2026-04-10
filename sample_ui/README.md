# Code To Copy

This folder contains the main source files for the UI/backend areas you asked for, copied with their original project structure so imports stay recognizable.

## Included feature areas

- `toast`
  - Frontend toast implementation: `libraries/react-shared-libraries/src/toaster`
  - Common mount points: `apps/frontend/src/components/preview/preview.wrapper.tsx`, `apps/frontend/src/app/(app)/layout.tsx`

- `create post modal`
  - Main modal flow: `apps/frontend/src/components/new-launch`
  - Calendar/context/helpers the modal depends on: `apps/frontend/src/components/launches`
  - Media picker/uploader used by the modal: `apps/frontend/src/components/media`
  - Preview wrappers/components: `apps/frontend/src/components/preview`
  - Platform icons used by channel pickers/previews: `apps/frontend/public/icons/platforms`

- `calendar UI + drag and drop`
  - Main calendar screen: `apps/frontend/src/components/launches/calendar.tsx`
  - Calendar state/data loading: `apps/frontend/src/components/launches/calendar.context.tsx`
  - Launches shell and drag-enabled sidebar/menu: `apps/frontend/src/components/launches/launches.component.tsx`
  - React DnD provider: `apps/frontend/src/components/launches/helpers/dnd.provider.tsx`
  - Filters/date navigation: `apps/frontend/src/components/launches/filters.tsx`
  - Extra layout dependencies used by calendar/modals/loading: `apps/frontend/src/components/layout`
  - Onboarding used by the launches shell: `apps/frontend/src/components/onboarding`

- `design post`
  - Main editor/canvas area: `apps/frontend/src/components/launches/polonto.tsx`
  - Image generation section: `apps/frontend/src/components/launches/polonto`
  - Media crop/edit helpers: `apps/frontend/src/components/launches/helpers/media.settings.component.tsx`
  - Related media backend: `apps/backend/src/api/routes/media.controller.ts`, `libraries/nestjs-libraries/src/database/prisma/media`

- `AI agent`
  - Agent frontend: `apps/frontend/src/components/agents`
  - In-modal assistant usage: `apps/frontend/src/components/new-launch/manage.modal.tsx`
  - Agent backend route: `apps/backend/src/api/routes/copilot.controller.ts`
  - Agent/chat services and tools: `libraries/nestjs-libraries/src/chat`, `libraries/nestjs-libraries/src/agent`, `libraries/nestjs-libraries/src/openai`

- `post creation backend`
  - API route: `apps/backend/src/api/routes/posts.controller.ts`
  - Post service/repository: `libraries/nestjs-libraries/src/database/prisma/posts`
  - DTOs: `libraries/nestjs-libraries/src/dtos/posts`, `libraries/nestjs-libraries/src/dtos/generator`
  - Platform-specific provider logic/settings: `libraries/nestjs-libraries/src/integrations`

## Shared support copied too

- `libraries/helpers/src/utils`
- `libraries/react-shared-libraries/src/helpers`
- `libraries/react-shared-libraries/src/form`
- `libraries/react-shared-libraries/src/translation`
- `libraries/nestjs-libraries/src/upload`
- `libraries/nestjs-libraries/src/videos`
- `libraries/nestjs-libraries/src/user`
- `libraries/nestjs-libraries/src/services/make.is.ts`

## Styling

- `ui-support-styles.scss`
  - Trimmed global styles/variables extracted for the copied features.
- `apps/frontend/src/app/polonto.css`
  - Direct Polotno editor stylesheet import used by the design-post canvas.

## Notes

- I copied the main feature slices and their most relevant shared/backend support code, not the entire app.
- Some imports still point at the original workspace aliases like `@gitroom/...`, so when you transplant this into another app you will likely want to either:
  - keep the same alias structure, or
  - rewrite imports to your target app structure.
