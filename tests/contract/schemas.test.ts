import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

interface SchemaValidator {
  (data: unknown): boolean;
  errors: readonly unknown[] | null;
}

interface SchemaCompiler {
  compile(schema: Record<string, unknown>): SchemaValidator;
}

type CompilerConstructor = new (options: { allErrors: boolean; strict: boolean }) => SchemaCompiler;
type FormatInstaller = (compiler: SchemaCompiler) => void;

const nodeRequire = createRequire(import.meta.url);
const Ajv2020 = (nodeRequire('ajv/dist/2020.js') as { default: CompilerConstructor }).default;
const addFormats = (nodeRequire('ajv-formats') as { default: FormatInstaller }).default;

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8')) as unknown;
}

describe('published JSON contracts', () => {
  it.each([
    [
      'event',
      '../../packages/contracts/schemas/event.schema.json',
      '../../packages/contracts/examples/event.example.json',
    ],
    [
      'export manifest',
      '../../packages/contracts/schemas/export-manifest.schema.json',
      '../../packages/contracts/examples/export-manifest.example.json',
    ],
  ])('validates the %s example', async (_name, schemaPath, examplePath) => {
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    const validate = ajv.compile((await readJson(schemaPath)) as Record<string, unknown>);
    const valid = validate(await readJson(examplePath));

    expect(validate.errors).toBeNull();
    expect(valid).toBe(true);
  });
});
