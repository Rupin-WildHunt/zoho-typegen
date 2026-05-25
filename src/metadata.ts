import { ZohoField, ZohoPickListValue } from './mapper.js';

/** Raw module object as returned by GET /crm/v8/settings/modules */
export interface ZohoRawModule {
  api_name: string;
  module_name: string;
  plural_label: string;
  singular_label: string;
  actual_plural_label: string;
  actual_singular_label: string;
  generated_type: 'default' | 'custom' | 'linking' | 'subform' | 'web';
  // API access
  api_supported: boolean;
  // Permissions
  viewable: boolean;
  creatable: boolean;
  editable: boolean;
  deletable: boolean;
  convertable: boolean;
  lookupable: boolean;
  // Visibility
  status: string; // e.g. 'user_hidden', 'visible', 'hidden'
  visibility: number; // numeric visibility flag
  show_as_tab: boolean;
  presence_sub_menu: boolean;
  sub_menu_available: boolean;
  // Features
  global_search_supported: boolean;
  isBlueprintSupported: boolean;
  feeds_required: boolean;
  quick_create: boolean;
  recycle_bin_on_delete: boolean;
  has_more_profiles: boolean;
  public_fields_configured: boolean;
  // Metadata
  id: string;
  sequence_number: number;
  profile_count: number;
  business_card_field_limit: number;
  web_link: string;
  description: string;
  access_type: string;
  arguments: string;
  modified_time: string | null;
  modified_by: unknown;
  parent_module: unknown;
  profiles: unknown[];
  private_profile: unknown;
}

export interface ZohoModule {
  api_name: string;
  module_name: string;
  generated_type: ZohoRawModule['generated_type'];
  _raw: ZohoRawModule;
}

// Raw shapes coming back from Zoho API
interface ZohoModulesApiResponse {
  modules: ZohoRawModule[];
}

interface ZohoRawField {
  api_name: string;
  data_type: string;
  json_type: string | null;
  system_mandatory: boolean;
  custom_field: boolean;
  field_label: string;
  pick_list_values?: ZohoPickListValue[];
  associated_module?: { module: string; id: string } | null;
  [key: string]: unknown;
}

interface ZohoFieldsApiResponse {
  fields: ZohoRawField[];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches all CRM modules from the org.
 * Only includes 'default' and 'custom' module types.
 * Modules that are themselves subforms are skipped here — they get fetched
 * inline via fetchFields() when a parent module has a subform field.
 */
export async function fetchModules(accessToken: string, baseUrl: string): Promise<ZohoModule[]> {
  const url = `${baseUrl}/settings/modules`;

  const response = await fetch(url, {
    headers: { Authorization: accessToken },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`fetchModules failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as ZohoModulesApiResponse;

  return data.modules
    .filter((m) => m.generated_type === 'default' || m.generated_type === 'custom')
    .map((m) => ({
      api_name: m.api_name,
      module_name: m.module_name,
      generated_type: m.generated_type,
      _raw: m,
    }));
}

/**
 * Fetches all field definitions for a single module.
 * Returns normalized ZohoField objects ready for the mapper.
 */
export async function fetchFields(
  accessToken: string,
  baseUrl: string,
  moduleApiName: string
): Promise<ZohoField[]> {
  const url = `${baseUrl}/settings/fields?module=${encodeURIComponent(moduleApiName)}`;

  const response = await fetch(url, {
    headers: { Authorization: accessToken },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`fetchFields(${moduleApiName}) failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as ZohoFieldsApiResponse;

  const fields: ZohoField[] = [];

  for (const f of data.fields ?? []) {
    const field: ZohoField = {
      api_name: f.api_name,
      data_type: f.data_type,
      json_type: f.json_type ?? null,
      system_mandatory: f.system_mandatory ?? false,
      custom_field: f.custom_field ?? false,
      field_label: f.field_label ?? '',
      pick_list_values: (f.pick_list_values ?? []).map((v) => ({
        actual_value: String(v.actual_value ?? ''),
        display_value: String(v.display_value ?? ''),
      })),
    };

    // Subform — fetch the subform module's fields and attach them
    if (f.data_type === 'subform' && f.associated_module?.module) {
      try {
        field.subform_fields = await fetchFields(accessToken, baseUrl, f.associated_module.module);
      } catch (err) {
        console.warn(
          `  ⚠ Could not fetch subform fields for ${moduleApiName}.${f.api_name}: ${(err as Error).message}`
        );
      }
    }

    fields.push(field);
  }

  return fields;
}

/**
 * Fetches fields for every module, with a delay between requests
 * to stay within Zoho's rate limit (~150 req/min on standard plans).
 */
export async function fetchAllModuleFields(
  accessToken: string,
  baseUrl: string,
  modules: ZohoModule[],
  delayMs = 500
): Promise<Array<{ module: ZohoModule; fields: ZohoField[] }>> {
  const results: Array<{ module: ZohoModule; fields: ZohoField[] }> = [];

  for (const module of modules) {
    try {
      const fields = await fetchFields(accessToken, baseUrl, module.api_name);
      results.push({ module, fields });
      console.log(`  ✓ ${module.api_name} (${fields.length} fields)`);
    } catch (err) {
      // skips bad modules without aborting the whole run
      console.warn(`  ✗ ${module.api_name}: ${(err as Error).message}`);
    }

    if (delayMs > 0) await delay(delayMs);
  }

  return results;
}
