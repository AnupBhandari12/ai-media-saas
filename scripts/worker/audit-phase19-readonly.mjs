// AI Media Phase 19B10: READ-ONLY local static safety inventory.
// Reads project source and Git metadata. Does NOT use .env.local, network,
// Prisma, B2, Docker, filesystem mutation, or external deployment APIs.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const checks = [];
const read = p => {
  try { return readFileSync(path.join(root, p), 'utf8'); }
  catch { return null; }
};
const git = (...args) => {
  try { return execFileSync('git', args, {cwd: root, encoding:'utf8', timeout: 10000, windowsHide: true}).trim(); }
  catch { return null; }
};
function check(label, good, explanation) {checks.push({label,good:Boolean(good),explanation});}

const compose = read('compose.worker.yml');
check('Docker disabled network and privilege restrictions',
  !!compose && ['network_mode: none','read_only: true','no-new-privileges:true','cap_drop:','mem_limit:'].every(x => compose.includes(x)),
  'Source configuration inspection only; Docker runtime isolation also needs live testing.');

const cli = read('worker/cli.mjs');
const validation = read('worker/validation.mjs');
check('Worker CLI dispatch includes tested PDF operations',
  !!cli && !!validation && ['protect','unlock','compress-target','repair','convert'].every(x=>cli.includes(`"${x}"`) && validation.includes(`"${x}"`)),
  'No arbitrary user-provided action should execute a command.');
check('Worker validation rejects unsafe filenames',
  !!validation && validation.includes('filename.includes("..")') && validation.includes('path.basename(filename) !== filename'),
  'Structural source probe; bun tests exercise actual behavior.');

const owner = read('scripts/worker/run-once.mjs');
const security = read('lib/worker/maintenanceRules.mjs');
check('Local Office worker restricts claim to configured Clerk owner',
  !!owner && !!security && owner.includes('assertDevOwner(process.env)') &&
    owner.includes('ownerId: process.env.WORKER_DEV_OWNER_ID') &&
    security.includes('env.NODE_ENV === "production"'),
  'Owner isolation needs a cross-user test before public release.');

const auto = read('scripts/worker/run-auto.mjs');
check('Automatic local runner requires opt-in and serial jobs',
  !!auto && auto.includes('assertAutoDispatchEnabled()') && auto.includes('await runOne()'),
  'This is NOT a 24/7 hosted dispatcher or durable leased queue.');

const recovery = read('scripts/worker/recover-stuck.mjs');
check('Stuck-job recovery has read-only default and explicit action',
  !!recovery && recovery.includes('argv.length === 0') &&
    recovery.includes('--mark-failed') && recovery.includes('--confirm-runners-stopped') &&
    recovery.includes('verifyNoDockerContainer(jobId)'),
  'Never execute --mark-failed without operator review and stopped runners.');

const cleanup = read('scripts/worker/cleanup-once.mjs');
check('B2 cleanup has no-delete default and guarded apply',
  !!cleanup && cleanup.includes('const apply = args.includes("--apply")') &&
    cleanup.includes('assertCleanupAllowed(process.env, apply)') &&
    cleanup.includes('if (!apply)') && cleanup.includes('--confirm-owner-scoped-delete'),
  'This does not prove object versions/orphans are permanently purged.');

const download = read('app/api/worker/jobs/[id]/download/route.js');
check('Completed Office PDF download checks expiry',
  !!download && download.includes('isResultExpired(job)') && download.includes('410'),
  'Expired B2 versions still require lifecycle verification.');

const bridge = read('scripts/worker/local-pdf-bridge.mjs');
const rules = read('lib/worker/localPdfDevRules.mjs');
check('PDF QA bridge is loopback-only and opt-in',
  !!bridge && !!rules && bridge.includes('"127.0.0.1"') &&
    bridge.includes('randomBytes(32)') && bridge.includes('authorizedDevToken') &&
    rules.includes('LOCAL_PDF_DEV_BRIDGE_ENABLED') && rules.includes('env.NODE_ENV === "production"'),
  'Do not expose bridge through tunnel or firewall exceptions.');
check('PDF bridge isolates Docker container and passes password by stdin',
  !!bridge && !!rules && bridge.includes('shell: false') &&
    bridge.includes('process.stdin.end(password') &&
    ['"none"','"--read-only"','"--cap-drop"','"no-new-privileges:true"'].every(x=>rules.includes(x)),
  'Source probe; malicious request fuzzing and runtime tests remain necessary.');

const protectedPageIds = ['compress-target-worker','protect-worker','unlock-worker','repair-worker'];
for (const name of protectedPageIds) {
  const contents = read(`app/(dashboard)/tools/pdf/${name}/page.js`);
  check(`Dev-only PDF route remains gated: ${name}`,
    !!contents && contents.includes('process.env.NODE_ENV !== "development"') && contents.includes('notFound()'),
    'This route should 404 in production.');
}

const registry = read('lib/tools/registry.js');
check('Public Tools Hub still guards worker tools',
  !!registry && ['PDF-12','PDF-15','PDF-16'].every(id=>{
    const pos=registry.indexOf(`id: "${id}"`);
    return pos >= 0 && registry.slice(pos, pos+700).includes('status: TOOL_STATUS.COMING_SOON');
  }),
  'Absent PDF-20/21/22/30 catalog entries must remain unadvertised.');

const secretsTracked = git('ls-files', '--', '.env.local', 'worker/local-files');
check('Local secrets and generated worker files are not tracked',
  secretsTracked === '',
  'Only checks those two high-risk paths; do not commit other credentials or private documents.');

const branch = git('branch', '--show-current');
check('Expected integration branch selected',branch === 'fix/phase19-audit',
  `Current branch: ${branch ?? 'not accessible'}. Do not merge until QA review.`);

console.log('AI Media Phase 19B10 — READ-ONLY SOURCE AUDIT');
console.log('No API requests, Docker jobs, DB updates, B2 deletes or file writes performed.');
for (const c of checks) console.log(`${c.good ? 'PASS' : 'FAIL'} | ${c.label}\n       ${c.explanation}`);
console.log(`SUMMARY: ${checks.filter(c=>c.good).length}/${checks.length} structural checks passed.`);
console.log('NOT COVERED: live Docker conversion, mobile QA, cross-account API attacks, B2 version lifecycle, hosted queue.');
if (checks.some(c=>!c.good)) process.exitCode = 1;
