/** Do not treat free low-resolution API previews as unlimited free full-res. */
export function reviewRealRemoveBg({sourceVerified=false,ownerConsent=false,operatorApproval=false,
  actualCreditBalanceVerified=false,sharedQuotaReserved=false,vendorPoolReserved=false,
  outputVerificationReady=false,privateStorageReady=false,ledgerReady=false}={}) {
  const checks={sourceVerified,ownerConsent,operatorApproval,actualCreditBalanceVerified,
    sharedQuotaReserved,vendorPoolReserved,outputVerificationReady,privateStorageReady,ledgerReady};
  const reasons=Object.entries(checks).filter(([,ok])=>ok!==true).map(([key])=>key);
  return Object.freeze({status:'BLOCKED',provider:'remove.bg',providerCallAllowed:false,
    automaticRetryAllowed:false,automaticRefundAllowed:false,missing:Object.freeze(reasons),
    reason:'REVIEW_ONLY_NEVER_DISPATCH'});
}
