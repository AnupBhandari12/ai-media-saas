
import {
    S3Client,
    PutBucketCorsCommand,
    GetBucketCorsCommand,
} from "@aws-sdk/client-s3";

const {
    B2_ENDPOINT,
    B2_REGION,
    B2_BUCKET_NAME,
    B2_CORS_ADMIN_KEY_ID,
    B2_CORS_ADMIN_APPLICATION_KEY,
} = process.env;

const required = [
    B2_ENDPOINT,
    B2_REGION,
    B2_BUCKET_NAME,
    B2_CORS_ADMIN_KEY_ID,
    B2_CORS_ADMIN_APPLICATION_KEY,
];

if (required.some((value) => !value)) {
    throw new Error("Missing Backblaze CORS setup configuration.");
}

const s3 = new S3Client({
    endpoint: B2_ENDPOINT,
    region: B2_REGION,
    forcePathStyle: true,
    credentials: {
        accessKeyId: B2_CORS_ADMIN_KEY_ID,
        secretAccessKey: B2_CORS_ADMIN_APPLICATION_KEY,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
});

const corsRules = [
    {
        AllowedOrigins: ["http://localhost:3000"],
        AllowedMethods: ["PUT"],
        AllowedHeaders: ["content-type"],
        ExposeHeaders: ["ETag"],
        MaxAgeSeconds: 3600,
    },
];

try {
    await s3.send(
        new PutBucketCorsCommand({
            Bucket: B2_BUCKET_NAME,
            CORSConfiguration: {
                CORSRules: corsRules,
            },
        }),
    );

    const verified = await s3.send(
        new GetBucketCorsCommand({
            Bucket: B2_BUCKET_NAME,
        }),
    );

    console.log("CORS updated successfully!");
    console.log(
        JSON.stringify(verified.CORSRules, null, 2),
    );
} catch (error) {
    console.error(
        "CORS setup failed:",
        error.name,
        error.message,
    );
    process.exitCode = 1;
} finally {
    s3.destroy();
}
