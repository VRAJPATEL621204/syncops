-- AlterTable
ALTER TABLE "InviteToken" ADD COLUMN     "teamId" TEXT,
ADD COLUMN     "welcomeMessage" TEXT;

-- CreateIndex
CREATE INDEX "InviteToken_teamId_idx" ON "InviteToken"("teamId");

-- AddForeignKey
ALTER TABLE "InviteToken" ADD CONSTRAINT "InviteToken_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
