-- CreateTable
CREATE TABLE "TenantSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "companyName" TEXT NOT NULL DEFAULT 'Quote Portal',
    "companyTagline" TEXT,
    "companyPhone" TEXT,
    "companyWebsite" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#000000',
    "accentColor" TEXT NOT NULL DEFAULT '#111827',
    "emailFromName" TEXT,
    "emailFromAddress" TEXT,
    "emailAdminAddress" TEXT,
    "tax1Label" TEXT NOT NULL DEFAULT 'GST',
    "tax2Label" TEXT NOT NULL DEFAULT 'PST',
    "locale" TEXT NOT NULL DEFAULT 'en-CA',
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "premiumBranding" BOOLEAN NOT NULL DEFAULT false,
    "footerText" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSettings_pkey" PRIMARY KEY ("id")
);
