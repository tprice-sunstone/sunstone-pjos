// ============================================================================
// Template Utilities — src/lib/templates.ts
// ============================================================================
// Variable substitution for message templates. Reused by broadcasts,
// workflows, and the template preview API.
// ============================================================================

/**
 * Replace {{variable}} placeholders in a template body with actual values.
 * Unknown variables are left as-is so the user sees what's missing.
 */
export function renderTemplate(
  body: string,
  variables: Record<string, string>
): string {
  return body.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match;
  });
}

/** Standard template variables with descriptions for the UI. */
export const TEMPLATE_VARIABLES = [
  { key: 'client_name', label: 'Client Name', example: 'Sarah Johnson' },
  { key: 'client_first_name', label: 'First Name', example: 'Sarah' },
  { key: 'business_name', label: 'Business Name', example: 'Golden Touch PJ' },
  { key: 'business_phone', label: 'Business Phone', example: '(555) 123-4567' },
] as const;

/** Sample data for template previews. */
export const SAMPLE_VARIABLES: Record<string, string> = {
  client_name: 'Sarah Johnson',
  client_first_name: 'Sarah',
  business_name: 'Your Business',
  business_phone: '(555) 123-4567',
};
