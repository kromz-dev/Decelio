-- AlterTable
-- Essai gratuit de 14 jours (T-essai-gratuit-14-jours) : deux colonnes
-- additives et nullables sur User, sans effet sur les lignes existantes.
-- trialUsedAt : posé au premier abonnement (essai ou paiement immédiat),
-- jamais effacé -- garantit un seul essai par compte.
-- stripeTrialEnd : date de fin de l'essai en cours ; remis à NULL à la
-- conversion (sert de marqueur anti-double-comptage pour trial_converted).
ALTER TABLE "User" ADD COLUMN     "trialUsedAt" TIMESTAMP(3),
ADD COLUMN     "stripeTrialEnd" TIMESTAMP(3);
