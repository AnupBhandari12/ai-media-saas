// One-time safe, anchor-checked installer to preserve the user's exact existing Phase 19 code.
// Run once after unpacking: node scripts/worker/install-phase19b5.mjs
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const backupRoot = path.join(root, "worker", "local-files", "phase19b5-backups");
const modifications = [
  {
    file: "scripts/worker/run-once.mjs",
    replacements: [
      [
        'import { WORKER_DOCUMENT_TOOL_IDS } from "../../lib/worker/jobConfig.js";',
        'import { WORKER_DOCUMENT_TOOL_IDS } from "../../lib/worker/jobConfig.js";\nimport { assertDevOwner } from "../../lib/worker/maintenanceRules.mjs";',
      ],
      [
        '    throw new Error("This local worker must not run inside Vercel or production.");\n  }\n}',
        '    throw new Error("This local worker must not run inside Vercel or production.");\n  }\n  assertDevOwner(process.env);\n}',
      ],
      [
        '    where: {\n      toolId: { in: WORKER_DOCUMENT_TOOL_IDS },\n      status: "PENDING",',
        '    where: {\n      ownerId: process.env.WORKER_DEV_OWNER_ID,\n      toolId: { in: WORKER_DOCUMENT_TOOL_IDS },\n      createdAt: { gte: new Date(Date.now() - 72 * 60 * 60 * 1000) },\n      status: "PENDING",',
      ],
      [
        '      id: candidate.id,\n      status: "PENDING",',
        '      id: candidate.id,\n      ownerId: process.env.WORKER_DEV_OWNER_ID,\n      status: "PENDING",',
      ],
    ],
  },
  {
    file: "app/api/worker/jobs/[id]/download/route.js",
    replacements: [
      [
        'import { createPresignedDownload } from "@/lib/worker/objectStorage";',
        'import { createPresignedDownload } from "@/lib/worker/objectStorage";\nimport { isResultExpired } from "@/lib/worker/maintenanceRules.mjs";',
      ],
      [
        '  const { job } = access;\n  const result = job.resultRefs;',
        '  const { job } = access;\n  if (isResultExpired(job) || job.resultRefs?.expired === true) {\n    return uploadResponseError("Document result expired after seven days.", 410);\n  }\n  const result = job.resultRefs;',
      ],
    ],
  },
];

// Compute all outputs first: if a file differs from expected baseline, change nothing.
const prepared = [];
for (const entry of modifications) {
  const sourcePath = path.join(root, entry.file);
  const current = await readFile(sourcePath, "utf8");
  let next = current;
  for (const [before, after] of entry.replacements) {
    if (next.includes(after)) continue; // allow safe re-run
    const at = next.indexOf(before);
    if (at < 0 || next.indexOf(before, at + before.length) >= 0) {
      throw new Error(`Stopped: expected unique original code not found in ${entry.file}. No files changed.`);
    }
    next = next.replace(before, after);
  }
  prepared.push({ sourcePath, next, changed: next !== current, relative: entry.file });
}
await mkdir(backupRoot, { recursive: true });
for (const entry of prepared) {
  if (!entry.changed) continue;
  const backup = path.join(backupRoot, entry.relative.replaceAll(/[\\/]/g, "__") + ".bak");
  await copyFile(entry.sourcePath, backup);
  await writeFile(entry.sourcePath, entry.next, "utf8");
  console.log(`Updated ${entry.relative}; ignored backup stored locally.`);
}
console.log("Phase 19B5 source integration is ready. Run tests before committing.");
