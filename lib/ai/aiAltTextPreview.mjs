/**
 * Phase 21 AI-08: LOCAL MOCK preview composed from the established caption
 * HTTP guard. This does NOT inspect uploaded images or call any provider.
 * Future real image analysis must use its own protected image pipeline.
 */
import {
  handleLocalCaptionPreview,
  isLocalCaptionPreviewEnabled,
} from "./aiCaptionPreview.mjs";

export function isLocalAltTextPreviewEnabled({ nodeEnv, flag } = {}) {
  return isLocalCaptionPreviewEnabled({ nodeEnv, flag });
}

export async function handleLocalAltTextPreview(options = {}) {
  const result = await handleLocalCaptionPreview(options);
  if (result.status !== 200) return result;

  // Safe placeholder: the source is ONLY user-supplied text. We did not read
  // an image, and even this draft is NOT AI-generated.
  return {
    status: 200,
    body: {
      mode: "MOCK_ONLY",
      generated: false,
      imageAnalyzed: false,
      quotaConsumed: false,
      source: "USER_DESCRIPTION",
      task: "ALT_TEXT",
      text: result.body.text,
      quota: result.body.quota,
    },
  };
}
