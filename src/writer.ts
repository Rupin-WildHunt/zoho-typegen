import fs from 'fs';
import path from 'path';
import { ZohoField, MappingOptions } from './mapper.js';
import { ZohoModule } from './metadata.js';
import { generateInterface, generateBarrel } from './generator.js';

/**
 * e.g. "Deal_Specifications" → "deal-specifications.ts"
 */
function toFileName(apiName: string): string {
  return apiName.toLowerCase().replace(/_/g, '-') + '.ts';
}

function fileNameToApiName(fileName: string): string {
  return fileName
    .replace(/\.ts$/, '')
    .split('-')
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ''))
    .join('_');
}

/**
 * Writes one .ts file per module + a barrel index.ts.
 * When a partial run is done (e.g. --modules), the barrel is rebuilt from ALL
 * .ts files in the output directory — not just the ones generated this run —
 * so existing exports are never lost.
 */
export function writeModuleFiles(
  outputDir: string,
  results: Array<{ module: ZohoModule; fields: ZohoField[] }>,
  opts: MappingOptions = {}
): void {
  fs.mkdirSync(outputDir, { recursive: true });

  for (const { module, fields } of results) {
    const fileName = toFileName(module.api_name);
    const filePath = path.join(outputDir, fileName);
    const content = generateInterface(module.api_name, fields, opts);
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  // Rebuild barrel from every .ts file present in the output dir (sorted for
  // deterministic output). This keeps existing exports intact on partial runs.
  const allTsFiles = fs
    .readdirSync(outputDir)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
    .sort();

  const barrelEntries = allTsFiles.map((fileName) => ({
    apiName: fileNameToApiName(fileName),
    fileName,
  }));

  const indexPath = path.join(outputDir, 'index.ts');
  const indexContent = generateBarrel(barrelEntries);
  fs.writeFileSync(indexPath, indexContent, 'utf-8');

  console.log(`\nWrote ${results.length} module files + index.ts to ${outputDir}`);
}
