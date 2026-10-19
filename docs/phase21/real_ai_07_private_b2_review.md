# Stage 07 - Backblaze private result plan only

Existing app already includes `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`, and the worker has owner-scoped document downloads. AI files require their own verified owner + job/asset/ledger binding. This stage constructs private opaque object-key plans only; it never uploads, generates signed URLs or authorizes download. Plan-level PNG magic bytes are insufficient proof of decoded/transparent/subject-preserving content; full Sharp verification is required at the future write boundary.

Do not create a public B2 bucket, or place S3 credentials in client-side variables.
