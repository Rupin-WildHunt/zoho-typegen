// zoho-typegen.config.ts
// Copy this file to your project root and fill in your values.

export default {
  // Required OAuth scopes: ZohoCRM.settings.modules.READ + ZohoCRM.settings.fields.READ
  getToken: () => 'YOUR_ACCESS_TOKEN',
  // Example: getToken: () => Meteor.settings.zohoToken,
  // Example: getToken: () => process.env.ZOHO_TOKEN,
  // Example: getToken: () => getZohoTokenFromDb(),

  outputDir: './types/zoho',

  // MORE OPTIONS

  // picklistValues: 'display', // or 'actual'
  // 'actual' is not recommended for picklists. It uses the hidden value of the item and may cause issues if
  // values have been renamed on Zoho CRM.

  // excludeModules: [], // Exclude modules you don't need

  // includeModules: [], // leave empty to generate all modules

  // includeUserHidden: false, // Default is false

  // includeSystemHidden: false, // Default is false
};
