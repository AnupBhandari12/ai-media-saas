import {getPhase21LocalReleaseGate} from '../../lib/ai/phase21LocalReleaseGate.mjs';
const r=getPhase21LocalReleaseGate();
console.log('PHASE 21 LOCAL TOOLS: READY FOR MANUAL QA');
console.log('REAL PAID PROVIDER RELEASE:',r.phase21PaidRelease);
for (const line of r.requiredNext) console.log('-',line);
console.log('Read-only; no DB, no provider and no storage calls.');
