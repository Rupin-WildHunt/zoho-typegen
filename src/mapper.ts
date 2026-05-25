export interface ZohoPickListValue {
  actual_value: string;
  display_value: string;
}

export interface ZohoField {
  api_name: string;
  data_type: string;
  json_type: string | null; // e.g. 'jsonarray', 'jsonobject', null
  system_mandatory: boolean;
  custom_field: boolean;
  field_label: string;
  pick_list_values: ZohoPickListValue[];
  subform_fields?: ZohoField[];
}

export interface MappingOptions {
  picklistValues?: 'actual' | 'display';
}

// Zoho uses generic placeholders like 'option1', 'option2' for some actual_values
const GENERIC_VALUE_RE = /^option\d+$/i;

function resolvePicklistValues(
  pickListValues: ZohoPickListValue[],
  opts: MappingOptions = {}
): string[] {
  const useActual = opts.picklistValues === 'actual';
  return pickListValues
    .map((v) => {
      const actual = v.actual_value ?? '';
      const display = v.display_value ?? '';
      if (useActual) return GENERIC_VALUE_RE.test(actual) ? display : actual;
      return display;
    })
    .filter((v) => v !== '' && v !== '-None-');
}

export function mapFieldType(field: ZohoField, opts: MappingOptions = {}): string {
  switch (field.data_type) {
    case 'text':
    case 'textarea':
    case 'email':
    case 'phone':
    case 'website':
    case 'url':
    case 'encrypted':
    case 'autonumber':
      return 'string';

    case 'integer':
    case 'double':
    case 'decimal':
    case 'currency':
    case 'percent':
      return 'number';

    case 'bigint':
      return 'string'; // Zoho returns bigint fields as strings in API responses to avoid JS precision loss

    case 'boolean':
      return 'boolean';

    case 'date':
      return 'string'; // YYYY-MM-DD

    case 'datetime':
      return 'string'; // ISO 8601

    case 'picklist': {
      const values = resolvePicklistValues(field.pick_list_values, opts);
      if (values.length === 0) return 'string';
      return values.map((v) => `'${v.replace(/'/g, "\\'")}'`).join(' | ');
    }

    case 'multiselectpicklist': {
      const values = resolvePicklistValues(field.pick_list_values, opts);
      if (values.length === 0) return 'string[]';
      const union = values.map((v) => `'${v.replace(/'/g, "\\'")}'`).join(' | ');
      return `Array<${union}>`;
    }

    case 'lookup':
      return '{ id: string; name: string }';

    case 'ownerlookup':
    case 'userlookup':
      return '{ id: string; name: string; email?: string }'; // user lookups include email in API responses

    case 'formula':
      return 'string | number | boolean';

    case 'fileupload':
    case 'imageupload':
      return 'Array<{ file_Id: string; file_Name: string; attachment_Id: string; extn: string; file_Size: string; original_Size_Byte: string; download_Url: string; preview_Url: string; delete_Url: string; is_Preview_Available: boolean; mode: string; entity_Id: number; creator_Id: number; link_Docs: number }>';

    case 'profileimage':
      return 'string'; // Profile image is a URL string, not a file upload array

    case 'layout':
      return '{ id: string; name: string; display_label?: string }'; // layout fields include display_label in API responses

    case 'subform':
      return '__subform__';

    default:
      return 'unknown';
  }
}
