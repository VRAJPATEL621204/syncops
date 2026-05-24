import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function deleteCloudinaryFolder(folder, resourceType) {
  try {
    // List all resources in folder
    const result = await cloudinary.api.resources({
      type: "upload",
      prefix: folder,
      resource_type: resourceType,
      max_results: 500,
    });

    if (result.resources.length === 0) {
      console.log(`  No ${resourceType} resources in ${folder}`);
      return;
    }

    const publicIds = result.resources.map((r) => r.public_id);
    console.log(`  Deleting ${publicIds.length} ${resourceType} files from ${folder}...`);

    await cloudinary.api.delete_resources(publicIds, { resource_type: resourceType });
    console.log(`  ✓ Deleted ${publicIds.length} files`);
  } catch (err) {
    console.log(`  Warning: ${err.message}`);
  }
}

async function main() {
  console.log("\n=== SyncOps Media Cleanup ===\n");

  // 1. Delete from Cloudinary
  console.log("1. Clearing Cloudinary...");
  await deleteCloudinaryFolder("syncops/images", "image");
  await deleteCloudinaryFolder("syncops/audio", "raw");
  await deleteCloudinaryFolder("syncops/audio", "video"); // old uploads
  console.log("  ✓ Cloudinary cleared\n");

  // 2. Reset media messages in DB
  console.log("2. Resetting media messages in database...");
  const updated = await prisma.message.updateMany({
    where: {
      type: { not: "text" },
    },
    data: {
      type: "text",
      content: "[Media removed]",
      mediaUrl: null,
      mimeType: null,
      duration: null,
    },
  });
  console.log(`  ✓ Reset ${updated.count} media messages\n`);

  console.log("=== Cleanup complete ===\n");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
