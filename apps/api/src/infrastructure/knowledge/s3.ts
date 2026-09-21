import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { TEXT_EXTENSIONS } from "../../domain/constants.js";
import { formatError } from "../../shared/utils.js";
import { getAwsRegion } from "../config.js";
import { KEY_PREFIX } from "./constants.js";

function s3(): S3Client {
  return new S3Client({ region: getAwsRegion() });
}

function isTextKey(key: string): boolean {
  const lower = key.toLowerCase();
  return [...TEXT_EXTENSIONS].some((ext) => lower.endsWith(ext));
}

export function sanitizeKnowledgeKey(relativePath: string): string {
  const trimmed = relativePath.trim().replaceAll("\\", "/");
  const withoutPrefix = trimmed.startsWith(KEY_PREFIX)
    ? trimmed.slice(KEY_PREFIX.length)
    : trimmed;
  if (
    withoutPrefix === "" ||
    withoutPrefix.includes("..") ||
    withoutPrefix.startsWith("/")
  ) {
    throw new Error(`Invalid knowledge path: ${relativePath}`);
  }
  return `${KEY_PREFIX}${withoutPrefix}`;
}

export async function listS3Files(bucket: string): Promise<string[]> {
  const client = s3();
  const paths: string[] = [];
  let token: string | undefined;
  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: KEY_PREFIX,
        ContinuationToken: token,
      }),
    );
    for (const object of page.Contents ?? []) {
      const key = object.Key;
      if (key === undefined || !isTextKey(key)) {
        continue;
      }
      paths.push(key.slice(KEY_PREFIX.length));
    }
    token = page.IsTruncated === true ? page.NextContinuationToken : undefined;
  } while (token !== undefined);
  return paths;
}

export async function readS3Document(
  bucket: string,
  relativePath: string,
): Promise<string> {
  const key = sanitizeKnowledgeKey(relativePath);
  try {
    const response = await s3().send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    const body = await response.Body?.transformToString("utf8");
    if (body === undefined) {
      throw new Error(`Empty S3 object: ${key}`);
    }
    return body;
  } catch (error: unknown) {
    throw new Error(`S3 read failed: ${formatError(error)}`);
  }
}

export async function listS3Knowledge(bucket: string): Promise<string[]> {
  try {
    return await listS3Files(bucket);
  } catch (error: unknown) {
    throw new Error(`S3 list failed: ${formatError(error)}`);
  }
}
