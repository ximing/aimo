import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import { join } from "path";
import { env } from "@/config/env.js";

let s3Client: S3Client | null = null;

if (env.STORAGE_TYPE === "s3") {
  s3Client = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY!,
      secretAccessKey: env.S3_SECRET_KEY!,
    },
  });
}

export async function uploadFile(file: any, path: string): Promise<string> {
  if (env.STORAGE_TYPE === "s3") {
    const command = new PutObjectCommand({
      Bucket: env.S3_BUCKET!,
      Key: path,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3Client!.send(command);
    return `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${path}`;
  } else {
    // Local file system
    const uploadDir = join(
      env.STORAGE_LOCAL_PATH,
      path.split("/").slice(0, -1).join("/"),
    );
    await mkdir(uploadDir, { recursive: true });

    const writeStream = createWriteStream(join(env.STORAGE_LOCAL_PATH, path));
    await new Promise((resolve, reject) => {
      file.pipe(writeStream).on("finish", resolve).on("error", reject);
    });

    return `/uploads/${path}`;
  }
}
