import 'server-only';
import { createHash, randomUUID } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { dirname, join, normalize, resolve, sep } from 'path';

/**
 * Progress photos are private. Bytes never go in Postgres and are never served
 * from a public path — only through an authenticated route that re-checks
 * permissions per request.
 *
 * Drivers are swappable via FF_STORAGE_DRIVER. "volume" (the default) writes to
 * a mounted disk and needs no credentials, which keeps a Railway deploy to one
 * click. "s3" targets any S3-compatible bucket (R2, S3, Backblaze).
 */

export type StoredObject = {
  key: string;
  size: number;
  mimeType: string;
};

export interface StorageDriver {
  readonly name: string;
  put(key: string, data: Buffer, mimeType: string): Promise<StoredObject>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

/* ------------------------------------------------------------ volume driver */

function storageRoot(): string {
  // /data is the conventional Railway volume mount point.
  return process.env.FF_STORAGE_DIR || (process.env.NODE_ENV === 'production' ? '/data/ff-photos' : './.storage');
}

class VolumeDriver implements StorageDriver {
  readonly name = 'volume';

  private absolute(key: string): string {
    const root = resolve(storageRoot());
    // Normalize then confirm containment: a crafted key must not escape the root.
    const target = resolve(join(root, normalize(key)));
    if (target !== root && !target.startsWith(root + sep)) {
      throw new Error('Invalid storage key');
    }
    return target;
  }

  async put(key: string, data: Buffer, mimeType: string): Promise<StoredObject> {
    const path = this.absolute(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
    return { key, size: data.length, mimeType };
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.absolute(key));
  }

  async delete(key: string): Promise<void> {
    await unlink(this.absolute(key)).catch(() => {
      // Already gone is a success for our purposes.
    });
  }
}

/* ---------------------------------------------------------------- s3 driver */

type S3Module = {
  S3Client: new (config: Record<string, unknown>) => { send: (command: unknown) => Promise<unknown> };
  PutObjectCommand: new (input: Record<string, unknown>) => unknown;
  GetObjectCommand: new (input: Record<string, unknown>) => unknown;
  DeleteObjectCommand: new (input: Record<string, unknown>) => unknown;
};

class S3Driver implements StorageDriver {
  readonly name = 's3';
  private client: { send: (command: unknown) => Promise<unknown> } | null = null;
  private module: S3Module | null = null;

  private config() {
    const bucket = process.env.S3_BUCKET;
    const region = process.env.S3_REGION || 'auto';
    const endpoint = process.env.S3_ENDPOINT;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new Error('S3 storage needs S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY');
    }
    return { bucket, region, endpoint, accessKeyId, secretAccessKey };
  }

  /**
   * Loaded through a variable specifier so the AWS SDK stays a genuinely
   * optional dependency — installs using the volume driver never pull it in.
   */
  private async load(): Promise<{ module: S3Module; client: { send: (c: unknown) => Promise<unknown> } }> {
    if (this.module && this.client) return { module: this.module, client: this.client };

    const specifier = '@aws-sdk/client-s3';
    let loaded: S3Module;
    try {
      loaded = (await import(/* @vite-ignore */ specifier)) as unknown as S3Module;
    } catch {
      throw new Error(
        'FF_STORAGE_DRIVER=s3 requires the AWS SDK. Install it with: npm install @aws-sdk/client-s3'
      );
    }

    const { region, endpoint, accessKeyId, secretAccessKey } = this.config();
    this.module = loaded;
    this.client = new loaded.S3Client({
      region,
      endpoint,
      forcePathStyle: Boolean(endpoint),
      credentials: { accessKeyId, secretAccessKey },
    });
    return { module: this.module, client: this.client };
  }

  async put(key: string, data: Buffer, mimeType: string): Promise<StoredObject> {
    const { module, client } = await this.load();
    await client.send(
      new module.PutObjectCommand({ Bucket: this.config().bucket, Key: key, Body: data, ContentType: mimeType })
    );
    return { key, size: data.length, mimeType };
  }

  async get(key: string): Promise<Buffer> {
    const { module, client } = await this.load();
    const response = (await client.send(
      new module.GetObjectCommand({ Bucket: this.config().bucket, Key: key })
    )) as { Body?: { transformToByteArray: () => Promise<Uint8Array> } };
    if (!response.Body) throw new Error('Object not found');
    return Buffer.from(await response.Body.transformToByteArray());
  }

  async delete(key: string): Promise<void> {
    const { module, client } = await this.load();
    await client.send(new module.DeleteObjectCommand({ Bucket: this.config().bucket, Key: key }));
  }
}

/* ------------------------------------------------------------------ facade */

let driver: StorageDriver | null = null;

export function storage(): StorageDriver {
  if (driver) return driver;
  driver = process.env.FF_STORAGE_DRIVER === 's3' ? new S3Driver() : new VolumeDriver();
  return driver;
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_PHOTO_BYTES = 12 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Keys are unguessable and namespaced per user. Authorization is still checked
 * on every read — the key shape is defence in depth, not the control.
 */
export function buildPhotoKey(userId: string, mimeType: string): string {
  const userSegment = createHash('sha256').update(userId).digest('hex').slice(0, 16);
  const extension = EXTENSIONS[mimeType] ?? 'bin';
  return `photos/${userSegment}/${randomUUID()}.${extension}`;
}

export function isAllowedImageType(mimeType: string): mimeType is (typeof ALLOWED_IMAGE_TYPES)[number] {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType);
}

/** Confirms the bytes really are the image type claimed by the upload. */
export function sniffImageType(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }
  return null;
}
