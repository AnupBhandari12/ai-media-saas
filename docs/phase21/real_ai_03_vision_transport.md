# Stage 03 - real image vision request contract, offline only

AI now has a request builder for image input using the documented Responses API `input_image` data URL. This is a real multimodal payload, but DOES NOT claim an actual image was understood until provider work is explicitly enabled and measured. Requires trusted server full decoding before calling `makeVisionPayload` (existing `aiSharpDecoder.mjs` can inform implementation). No route is wired, no secret is read by tests, no provider call made.

Image-input tokens are billable. Avoid client URLs and unverified MIME. See https://developers.openai.com/api/docs/guides/images-vision .
