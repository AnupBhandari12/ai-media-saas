/** This is NOT a spending permission API. Stage 04 intentionally cannot turn
 * a client boolean / fake snapshot into real dispatch authority. */
export function reviewPaidReadiness({humanApproved=false,operatorApproved=false,
  isolatedDbVerified=false,durableUsdCeilingVerified=false,sharedQuotaAtomicVerified=false,
  idempotentLedgerVerified=false,unknownReconciliationVerified=false,ownerOnlyOutputVerified=false}={}) {
  const required={humanApproved,operatorApproved,isolatedDbVerified,durableUsdCeilingVerified,
    sharedQuotaAtomicVerified,idempotentLedgerVerified,unknownReconciliationVerified,ownerOnlyOutputVerified};
  const missing=Object.entries(required).filter(([,value])=>value!==true).map(([name])=>name);
  return Object.freeze({status:'BLOCKED',dispatchAllowed:false,publicRoutesEnabled:false,
    missing:Object.freeze(missing),reason:missing.length?'APPROVAL_OR_EVIDENCE_MISSING':'REVIEW_ONLY_NEVER_DISPATCH'});
}
