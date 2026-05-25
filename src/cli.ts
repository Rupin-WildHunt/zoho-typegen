#!/usr/bin/env node
/**
 * zoho-typegen CLI
 *
 * Commands:
 *   zoho-typegen generate   — fetch all module fields and write .ts files (default)
 *   zoho-typegen list       — list all modules with their flags
 *
 * Config file (zoho-typegen.config.ts or .js) is loaded from the current working directory.
 * CLI flags override config file values.
 */

import { Command } from 'commander';
import path from 'path';
import { pathToFileURL } from 'url';
import { fetchModules, fetchAllModuleFields, ZohoModule } from './metadata.js';
import { writeModuleFiles } from './writer.js';
import { MappingOptions } from './mapper.js';

const ZOHO_BASE_URL = 'https://www.zohoapis.com/crm/v8';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface ZohoTypegenConfig {
  getToken: () => string | Promise<string>;
  outputDir?: string;
  picklistValues?: 'actual' | 'display';
  excludeModules?: string[];
  includeModules?: string[];
  includeUserHidden?: boolean;
  includeSystemHidden?: boolean;
}

async function loadConfig(): Promise<ZohoTypegenConfig> {
  const candidates = [
    path.resolve(process.cwd(), 'zoho-typegen.config.ts'),
    path.resolve(process.cwd(), 'zoho-typegen.config.js'),
  ];

  for (const candidate of candidates) {
    try {
      const mod = await import(pathToFileURL(candidate).href);
      return mod.default ?? mod;
    } catch {
      // try next candidate
    }
  }

  throw new Error(
    'No config file found. Create zoho-typegen.config.ts or zoho-typegen.config.js in your project root.\n' +
      'See zoho-typegen.config.example.ts for reference.'
  );
}

// ---------------------------------------------------------------------------
// Module filtering
// ---------------------------------------------------------------------------

interface RunOptions {
  includeUserHidden: boolean;
  includeSystemHidden: boolean;
  excludeModules: string[];
  includeModules: string[];
}

function shouldExclude(module: ZohoModule, opts: RunOptions): boolean {
  if (opts.includeModules.length > 0 && !opts.includeModules.includes(module.api_name)) return true;
  if (opts.excludeModules.includes(module.api_name)) return true;
  if (!module._raw.api_supported) return true;
  if (!module._raw.viewable) return true;
  if (module._raw.status === 'user_hidden' && !opts.includeUserHidden) return true;
  if (module._raw.status === 'system_hidden' && !opts.includeSystemHidden) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdGenerate(
  config: ZohoTypegenConfig,
  cliOverrides: Partial<ZohoTypegenConfig>
): Promise<void> {
  const merged = { ...config, ...cliOverrides };

  const accessToken = await merged.getToken();
  const outputDir = path.resolve(process.cwd(), merged.outputDir ?? './types/zoho');
  const opts: RunOptions = {
    includeUserHidden: merged.includeUserHidden ?? false,
    includeSystemHidden: merged.includeSystemHidden ?? false,
    excludeModules: merged.excludeModules ?? [],
    includeModules: merged.includeModules ?? [],
  };
  const mappingOpts: MappingOptions = {
    picklistValues: merged.picklistValues,
  };

  console.log('[zoho-typegen] Fetching CRM modules...');
  const allModules = await fetchModules(accessToken, ZOHO_BASE_URL);
  const modules = allModules.filter((m) => !shouldExclude(m, opts));
  const skipped = allModules.length - modules.length;

  console.log(
    `[zoho-typegen] ${allModules.length} total — generating ${modules.length}, skipping ${skipped}`
  );
  if (opts.includeModules.length) {
    console.log(`[zoho-typegen] only: ${opts.includeModules.join(', ')}`);
  }
  if (opts.excludeModules.length) {
    console.log(`[zoho-typegen] excluding: ${opts.excludeModules.join(', ')}`);
  }

  console.log('[zoho-typegen] Fetching fields (0.5 seconds between requests)...');
  const results = await fetchAllModuleFields(accessToken, ZOHO_BASE_URL, modules, 500);

  writeModuleFiles(outputDir, results, mappingOpts);

  const failed = modules.length - results.length;
  console.log(`\n✓ ${results.length} modules generated`);
  if (failed > 0) console.log(`✗ ${failed} modules failed — see log above`);
  console.log(`Output: ${outputDir}`);
}

async function cmdList(config: ZohoTypegenConfig): Promise<void> {
  const accessToken = await config.getToken();
  const modules = await fetchModules(accessToken, ZOHO_BASE_URL);

  const lines = [
    `\nFound ${modules.length} modules:\n`,
    `${'api_name'.padEnd(45)} ${'api_supported'.padEnd(15)} ${'viewable'.padEnd(10)} ${'status'.padEnd(15)} ${'generated_type'}`,
    `${'─'.repeat(45)} ${'─'.repeat(15)} ${'─'.repeat(10)} ${'─'.repeat(15)} ${'─'.repeat(14)}`,
  ];

  for (const mod of modules) {
    const { api_supported, viewable, status } = mod._raw;
    lines.push(
      `${mod.api_name.padEnd(45)} ${String(api_supported).padEnd(15)} ${String(viewable).padEnd(10)} ${String(status).padEnd(15)} ${mod.generated_type}`
    );
  }

  console.log(lines.join('\n'));
}

// ---------------------------------------------------------------------------
// CLI setup
// ---------------------------------------------------------------------------

const program = new Command();

program
  .name('zoho-typegen')
  .description(
    'Generate TypeScript interfaces from Zoho CRM module metadata.\nUnofficial community tool — not affiliated with Zoho Corporation.'
  )
  .version('0.1.0');

program
  .command('generate', { isDefault: true })
  .description('Fetch Zoho CRM module fields and generate TypeScript interface files')
  .option('--modules <names...>', 'only generate these modules (space-separated api_names)')
  .option('--exclude <names...>', 'skip these modules (space-separated api_names)')
  .option('--output <dir>', 'output directory (overrides config outputDir)')
  .option('--picklist <mode>', 'picklist value mode: display (default) or actual')
  .option('--include-user-hidden', 'include user_hidden modules (Tasks, Events, etc.)')
  .option('--include-system-hidden', 'include system_hidden modules (Notes, Attachments, etc.)')
  .action(async (opts) => {
    const config = await loadConfig();
    const overrides: Partial<ZohoTypegenConfig> = {};
    if (opts.modules) overrides.includeModules = opts.modules;
    if (opts.exclude) overrides.excludeModules = opts.exclude;
    if (opts.output) overrides.outputDir = opts.output;
    if (opts.picklist) overrides.picklistValues = opts.picklist;
    if (opts.includeUserHidden) overrides.includeUserHidden = true;
    if (opts.includeSystemHidden) overrides.includeSystemHidden = true;
    await cmdGenerate(config, overrides);
  });

program
  .command('list')
  .description('List all Zoho CRM modules with their API flags')
  .action(async () => {
    const config = await loadConfig();
    await cmdList(config);
  });

program.parseAsync(process.argv).catch((err) => {
  console.error('[zoho-typegen] Error:', (err as Error).message);
  process.exit(1);
});
