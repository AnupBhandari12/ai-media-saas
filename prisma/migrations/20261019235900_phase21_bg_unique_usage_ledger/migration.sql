-- Phase 21 Stage08: additive background -> UsageEvent exact-once linkage.
-- Does NOT fund paid providers, change old rows, drop, update, or enable a route.
ALTER TABLE "UsageEvent" ADD COLUMN "bgCreditReservationId" UUID;
CREATE UNIQUE INDEX "UsageEvent_bgCreditReservationId_key" ON "UsageEvent"("bgCreditReservationId");
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_bgCreditReservationId_fkey"
  FOREIGN KEY ("bgCreditReservationId") REFERENCES "BgCreditReservation"("requestId")
  ON DELETE RESTRICT ON UPDATE CASCADE;
