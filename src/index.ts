/**
 * These functions can be imported directly in your own scripts
 * if you prefer not to use the CLI.
 */

export { fetchModules, fetchAllModuleFields } from './metadata.js';
export type { ZohoModule, ZohoRawModule } from './metadata.js';

export { mapFieldType } from './mapper.js';
export type { ZohoField, ZohoPickListValue, MappingOptions } from './mapper.js';

export { generateInterface, generateBarrel } from './generator.js';

export { writeModuleFiles } from './writer.js';
