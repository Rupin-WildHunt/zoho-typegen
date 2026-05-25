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

/**
 * Writes one .ts file per module + a barrel index.ts.
 */
export function writeModuleFiles(
  outputDir: string,
  results: Array<{ module: ZohoModule; fields: ZohoField[] }>,
  opts: MappingOptions = {}
): void {
  fs.mkdirSync(outputDir, { recursive: true });

  const barrelEntries: { apiName: string; fileName: string }[] = [];

  for (const { module, fields } of results) {
    const fileName = toFileName(module.api_name);
    const filePath = path.join(outputDir, fileName);
    const content = generateInterface(module.api_name, fields, opts);

    fs.writeFileSync(filePath, content, 'utf-8');
    barrelEntries.push({ apiName: module.api_name, fileName });
  }

  const indexPath = path.join(outputDir, 'index.ts');
  const indexContent = generateBarrel(barrelEntries);
  fs.writeFileSync(indexPath, indexContent, 'utf-8');

  console.log(`\nWrote ${results.length} module files + index.ts to ${outputDir}`);
}
