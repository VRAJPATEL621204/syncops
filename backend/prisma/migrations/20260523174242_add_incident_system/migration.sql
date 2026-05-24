/*
  Warnings:

  - You are about to drop the column `assignedToId` on the `Incident` table. All the data in the column will be lost.
  - Added the required column `sourceTeamId` to the `Incident` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "IncidentCategory" AS ENUM ('bug', 'feature_request', 'incident', 'security', 'performance', 'other');

-- CreateEnum
CREATE TYPE "IncidentLogAction" AS ENUM ('created', 'status_changed', 'priority_changed', 'team_assigned', 'manager_assigned', 'resolved', 'closed', 'reopened', 'description_updated', 'title_updated');

-- AlterEnum
ALTER TYPE "IncidentStatus" ADD VALUE 'closed';

-- DropForeignKey
ALTER TABLE "Incident" DROP CONSTRAINT "Incident_assignedToId_fkey";

-- AlterTable
ALTER TABLE "Incident" DROP COLUMN "assignedToId",
ADD COLUMN     "assignedManagerId" TEXT,
ADD COLUMN     "assignedTeamId" TEXT,
ADD COLUMN     "category" "IncidentCategory" NOT NULL DEFAULT 'incident',
ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "sourceTeamId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "IncidentLog" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "IncidentLogAction" NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IncidentLog_incidentId_idx" ON "IncidentLog"("incidentId");

-- CreateIndex
CREATE INDEX "IncidentLog_actorId_idx" ON "IncidentLog"("actorId");

-- CreateIndex
CREATE INDEX "IncidentLog_createdAt_idx" ON "IncidentLog"("createdAt");

-- CreateIndex
CREATE INDEX "Incident_organizationId_idx" ON "Incident"("organizationId");

-- CreateIndex
CREATE INDEX "Incident_status_idx" ON "Incident"("status");

-- CreateIndex
CREATE INDEX "Incident_priority_idx" ON "Incident"("priority");

-- CreateIndex
CREATE INDEX "Incident_sourceTeamId_idx" ON "Incident"("sourceTeamId");

-- CreateIndex
CREATE INDEX "Incident_assignedTeamId_idx" ON "Incident"("assignedTeamId");

-- CreateIndex
CREATE INDEX "Incident_assignedManagerId_idx" ON "Incident"("assignedManagerId");

-- CreateIndex
CREATE INDEX "Incident_createdById_idx" ON "Incident"("createdById");

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_sourceTeamId_fkey" FOREIGN KEY ("sourceTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_assignedTeamId_fkey" FOREIGN KEY ("assignedTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_assignedManagerId_fkey" FOREIGN KEY ("assignedManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentLog" ADD CONSTRAINT "IncidentLog_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentLog" ADD CONSTRAINT "IncidentLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
