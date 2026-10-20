CREATE INDEX IF NOT EXISTS "habits_userId_isActive_idx" ON "habits"("userId", "isActive");
CREATE INDEX IF NOT EXISTS "transactions_userId_date_idx" ON "transactions"("userId", "date");
CREATE INDEX IF NOT EXISTS "transactions_userId_isInstallment_idx" ON "transactions"("userId", "isInstallment");
CREATE INDEX IF NOT EXISTS "transactions_userId_isRecurring_idx" ON "transactions"("userId", "isRecurring");
CREATE INDEX IF NOT EXISTS "transactions_cardId_idx" ON "transactions"("cardId");
