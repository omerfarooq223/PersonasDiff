import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { chromium } from 'playwright';

import { assertAllowedUrl, type SurfacePolicy } from './allowlist.js';

const fixtureOrigin = process.env.APPROVED_SURFACE_ORIGIN ?? 'http://localhost:4300';
const outputDirectory = process.env.ARTIFACT_OUTPUT_DIR ?? 'artifacts/spike';
const pathPrefixes = (process.env.APPROVED_PATH_PREFIXES ?? '/fixture').split(',');
const policy: SurfacePolicy = {
  allowedOrigin: fixtureOrigin,
  allowedPathPrefixes: pathPrefixes,
};

const target = assertAllowedUrl(`${fixtureOrigin}/fixture?persona=control`, policy);
await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  locale: 'en-US',
  timezoneId: 'UTC',
  viewport: { height: 720, width: 1280 },
});
await context.route('**/*', async (route) => {
  try {
    assertAllowedUrl(route.request().url(), policy);
    await route.continue();
  } catch {
    await route.abort('blockedbyclient');
  }
});
const page = await context.newPage();

const startedAt = new Date().toISOString();
let responseStatus: number | null = null;

try {
  const response = await page.goto(target.toString(), {
    waitUntil: 'networkidle',
    timeout: 30_000,
  });
  responseStatus = response?.status() ?? null;

  const screenshotPath = join(outputDirectory, 'control.png');
  const snapshotPath = join(outputDirectory, 'control.html');
  await page.screenshot({ fullPage: true, path: screenshotPath });
  await writeFile(snapshotPath, await page.content(), 'utf8');

  const artifacts = await Promise.all(
    [screenshotPath, snapshotPath].map(async (path) => {
      const body = await readFile(path);
      return {
        bytes: body.byteLength,
        path,
        sha256: createHash('sha256').update(body).digest('hex'),
      };
    }),
  );

  const manifest = {
    artifacts,
    browserVersion: browser.version(),
    completedAt: new Date().toISOString(),
    finalUrl: page.url(),
    responseStatus,
    schemaVersion: '1.0.0',
    startedAt,
  };
  const manifestPath = join(outputDirectory, 'manifest.json');
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  if (process.env.S3_ENDPOINT && process.env.S3_BUCKET) {
    const client = new S3Client({
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? '',
        secretAccessKey: process.env.S3_SECRET_KEY ?? '',
      },
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      region: process.env.S3_REGION ?? 'us-east-1',
    });
    const keyPrefix = `spike/${Date.now()}`;
    for (const upload of [
      { contentType: 'image/png', key: 'control.png', path: screenshotPath },
      { contentType: 'text/html; charset=utf-8', key: 'control.html', path: snapshotPath },
      { contentType: 'application/json', key: 'manifest.json', path: manifestPath },
    ]) {
      await client.send(
        new PutObjectCommand({
          Body: await readFile(upload.path),
          Bucket: process.env.S3_BUCKET,
          ContentType: upload.contentType,
          Key: `${keyPrefix}/${upload.key}`,
        }),
      );
    }
  }

  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
} finally {
  await context.close();
  await browser.close();
}
