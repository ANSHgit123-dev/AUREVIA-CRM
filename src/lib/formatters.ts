/**
 * Formats monetary amounts according to Indian Real Estate standards (₹ Lakhs and ₹ Crores)
 */
export function formatIndianCurrency(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  
  if (amount >= 10000000) {
    const crores = amount / 10000000;
    return `₹${crores.toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    const lakhs = amount / 100000;
    return `₹${lakhs.toFixed(2)} L`;
  }
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatRelativeTime(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 0) {
    // In future
    const absDiff = Math.abs(diffInSeconds);
    if (absDiff < 3600) return `in ${Math.floor(absDiff / 60)}m`;
    if (absDiff < 86400) return `in ${Math.floor(absDiff / 3600)}h`;
    return formatDate(dateString);
  }
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 172800) return 'Yesterday';
  return formatDate(dateString);
}

/**
 * Normalizes phone numbers for duplicate detection by stripping spaces, dashes, parentheses and country code
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  // Remove non-digit characters
  const digits = phone.replace(/\D/g, '');
  // If starts with 91 and has 12 digits, return last 10 digits
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  // Return last 10 digits if longer
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
}

export function getStageLabel(stage: string): string {
  const map: Record<string, string> = {
    new: 'New Lead',
    contacted: 'Contacted',
    qualified: 'Qualified',
    site_visit_scheduled: 'Site Visit Scheduled',
    site_visit_conducted: 'Site Visit Conducted',
    negotiation: 'Negotiation',
    token_paid: 'Token Paid',
    booked: 'Booked',
    lost: 'Lost',
  };
  return map[stage] || stage.replace(/_/g, ' ');
}

export function getSourceLabel(source: string): string {
  const map: Record<string, string> = {
    website: 'Website Direct',
    google_ads: 'Google Ads',
    google_search: 'Google Search',
    meta_ads: 'Meta Ads',
    '99acres': '99acres',
    magicbricks: 'MagicBricks',
    real_estate_portal: 'Portals (99acres)',
    channel_partner: 'Channel Partner',
    walk_in: 'Direct Walk-in',
    referral: 'Client Referral',
    other: 'Other Campaigns',
  };
  return map[source] || source.replace(/_/g, ' ');
}
