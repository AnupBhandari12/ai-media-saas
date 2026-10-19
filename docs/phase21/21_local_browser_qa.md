# Stage 05 - browser QA checklist

Start `bun run dev`, sign in with Clerk, then visit:

1. http://localhost:3000/tools/ai/caption-generator
   - In **Free caption drafts**, type your own post, create three styles, edit and copy one.
   - Existing MOCK PREVIEW remains separate and requires its original explicit dev opt-in.
2. http://localhost:3000/tools/ai/alt-text-generator
   - In **Accessibility writing review**, type a description, review warnings, edit and copy.
   - Never claim an uploaded image was analyzed; check description against image by eye.
3. http://localhost:3000/tools/ai/background-remover
   - Choose a small JPG or PNG with a plain white background.
   - Under the original preview, click a background pixel in **Remove a solid-color background**.
   - Set tolerance 15-40, press **Remove solid color locally**, verify subject and download PNG.
   - Try a complex photo: edges will be imperfect. The real paid AI Remove button stays disabled.

Also inspect narrow mobile layout and keyboard-only controls. Record any problems with exact page, action and screenshot. This kit is not a substitute for provider integration or browser E2E automation.

Security: No new environment variables, packages, Neon migrations or paid provider calls in stages 01-05. The browser tools operate locally. The pre-existing `/api/ai/quota` reader remains read-only.
