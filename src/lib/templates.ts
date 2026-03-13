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
  // Party-specific variables
  { key: 'host_name', label: 'Host Name', example: 'Jessica' },
  { key: 'party_date', label: 'Party Date', example: 'Saturday, March 22' },
  { key: 'party_time', label: 'Party Time', example: '6:00 PM' },
  { key: 'party_type', label: 'Party Type', example: "Girls' Night" },
  { key: 'estimated_guests', label: 'Estimated Guests', example: '8' },
  { key: 'party_location', label: 'Party Location', example: '123 Main St' },
  { key: 'rsvp_link', label: 'RSVP Link', example: 'sunstonepj.app/studio/...' },
  { key: 'rsvp_count', label: 'RSVP Count', example: '5' },
  { key: 'deposit_amount', label: 'Deposit Amount', example: '50' },
  { key: 'minimum_guarantee', label: 'Min. Guarantee', example: '500' },
  { key: 'total_party_revenue', label: 'Party Revenue', example: '850' },
  { key: 'profile_url', label: 'Profile URL', example: 'sunstonepj.app/studio/...' },
] as const;

/** Sample data for template previews. */
export const SAMPLE_VARIABLES: Record<string, string> = {
  client_name: 'Sarah Johnson',
  client_first_name: 'Sarah',
  business_name: 'Your Business',
  business_phone: '(555) 123-4567',
  host_name: 'Jessica',
  party_date: 'Saturday, March 22',
  party_time: '6:00 PM',
  party_type: "Girls' Night",
  estimated_guests: '8',
  party_location: '123 Main St',
  rsvp_link: 'sunstonepj.app/studio/your-studio/party/abc',
  rsvp_count: '5',
  deposit_amount: '50',
  minimum_guarantee: '500',
  total_party_revenue: '850',
  profile_url: 'sunstonepj.app/studio/your-studio',
};
