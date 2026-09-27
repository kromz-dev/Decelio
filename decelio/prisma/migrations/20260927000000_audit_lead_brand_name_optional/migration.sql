-- AlterTable
-- captureLead ne collecte plus de nom de marque (docs/08-constitution.md :
-- Decelio ne mesure pas les citations). Rendu optionnel plutôt que
-- supprimé pour conserver les valeurs déjà en base.
ALTER TABLE "AuditLead" ALTER COLUMN "brandName" DROP NOT NULL;
