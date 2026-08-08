import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../../');
const lockfilePath = resolve(rootDir, 'package-lock.json');
const pkgPath = resolve(rootDir, 'package.json');
const outputPath = resolve(rootDir, 'docs/day-8/sbom.json');

interface PackageLock {
  name?: string;
  version?: string;
  packages?: Record<string, { version?: string; resolved?: string; integrity?: string; license?: string }>;
}

export async function generateSbom(): Promise<void> {
  const lockContent = await readFile(lockfilePath, 'utf-8');
  const lockData: PackageLock = JSON.parse(lockContent);
  const pkgContent = await readFile(pkgPath, 'utf-8');
  const pkgData = JSON.parse(pkgContent);

  const packages = lockData.packages || {};
  const sbomPackages = [];

  for (const [pkgName, pkgDetails] of Object.entries(packages)) {
    if (pkgName === '') {
      sbomPackages.push({
        SPDXID: 'SPDXRef-Package-Root',
        name: pkgData.name || 'ai-parallel-web',
        versionInfo: pkgData.version || '0.1.0',
        downloadLocation: 'NOASSERTION',
        filesAnalyzed: false,
        licenseConcluded: 'NOASSERTION',
        licenseDeclared: 'NOASSERTION',
        copyrightText: 'NOASSERTION',
      });
      continue;
    }

    const nameClean = pkgName.replace(/^node_modules\//, '');
    if (!nameClean) continue;

    sbomPackages.push({
      SPDXID: `SPDXRef-npm-${nameClean.replace(/[^a-zA-Z0-9.-]/g, '-')}-${pkgDetails.version || '0.0.0'}`,
      name: nameClean,
      versionInfo: pkgDetails.version || 'unknown',
      downloadLocation: pkgDetails.resolved || 'NOASSERTION',
      checksums: pkgDetails.integrity
        ? [{ algorithm: 'SHA512', checksumValue: pkgDetails.integrity }]
        : [],
      licenseConcluded: pkgDetails.license || 'NOASSERTION',
      licenseDeclared: pkgDetails.license || 'NOASSERTION',
      copyrightText: 'NOASSERTION',
    });
  }

  const sbomDocument = {
    spdxVersion: 'SPDX-2.3',
    dataLicense: 'CC0-1.0',
    SPDXID: 'SPDXRef-DOCUMENT',
    name: `${pkgData.name || 'ai-parallel-web'}-SBOM`,
    documentNamespace: `https://github.com/ai-parallel-web/sbom/${Date.now()}`,
    creationInfo: {
      creators: ['Tool: ParallelWeb-SBOM-Generator-1.0', 'Organization: AI Parallel Web Team'],
      created: new Date().toISOString(),
    },
    packages: sbomPackages,
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(sbomDocument, null, 2), 'utf-8');
  console.log(`Successfully generated SBOM at ${outputPath} with ${sbomPackages.length} packages.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void generateSbom();
}
