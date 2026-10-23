/**
 * src/lib/labels.js
 * Human-readable verdict and flag labels for the Result page.
 */

/**
 * Returns verdict display info for a given risk level.
 * @param {'red'|'amber'|'green'} level
 * @returns {{ word: string, colorClass: string, bgClass: string, borderClass: string, icon: string }}
 */
export function verdictFor(level) {
  if (level === 'red') {
    return {
      word: 'Checkmate',
      colorClass: 'text-risk-red',
      bgClass: 'bg-risk-red-bg',
      borderClass: 'border-risk-red-border',
      spotlightColor: 'rgba(239, 68, 68, 0.18)',
      liquidColor: '#EF4444',
      icon: '♟',
    }
  }
  if (level === 'amber') {
    return {
      word: 'Check',
      colorClass: 'text-risk-amber',
      bgClass: 'bg-risk-amber-bg',
      borderClass: 'border-risk-amber-border',
      spotlightColor: 'rgba(245, 158, 11, 0.18)',
      liquidColor: '#F59E0B',
      icon: '▲',
    }
  }
  return {
    word: 'Safe',
    colorClass: 'text-risk-green',
    bgClass: 'bg-risk-green-bg',
    borderClass: 'border-risk-green-border',
    spotlightColor: 'rgba(142, 182, 152, 0.18)',
    liquidColor: '#8EB698',
    icon: '🛡',
  }
}

/**
 * Tactic category → readable label.
 */
const TACTIC_LABELS = {
  authority: 'Pretends to be an official or company',
  fear: 'Uses threats or fear',
  urgency: 'Pushes you to act fast',
  payment_credentials: 'Asks for money, OTP, PIN or passwords',
  isolation: 'Tells you to keep it secret',
  reward: 'Promises prizes or easy money',
}

/**
 * URL category → readable label.
 */
const URL_LABELS = {
  brand_lookalike: 'Link imitates a known brand',
  suspicious_tld: 'Unusual website ending',
  punycode: 'Link uses look-alike characters',
  ip_host: 'Link uses a raw IP address',
  shortener: 'Shortened link hides the real site',
  many_subdomains: 'Link has many sub-parts',
}

/**
 * Returns a human-readable label for a red flag object.
 * @param {{ type: string, category: string, evidence?: string }} flag
 * @returns {string}
 */
export function flagLabel(flag) {
  if (!flag) return 'Unknown warning'

  const { type, category, evidence } = flag

  if (type === 'tactic') {
    return TACTIC_LABELS[category] || category.replace(/_/g, ' ')
  }

  if (type === 'url') {
    return URL_LABELS[category] || category.replace(/_/g, ' ')
  }

  if (type === 'keyword') {
    return evidence ? `Suspicious word: "${evidence}"` : 'Suspicious keyword'
  }

  // Unknown type — use category with underscores replaced
  return category ? category.replace(/_/g, ' ') : 'Unknown warning'
}

/**
 * Scam category → human-readable label for Radar page.
 */
export const SCAM_CATEGORY_LABELS = {
  kyc_scam: 'KYC Scam',
  payment_scam: 'Payment Scam',
  job_scam: 'Job Scam',
  lottery_scam: 'Lottery Scam',
  phishing: 'Phishing',
  impersonation: 'Impersonation',
  fake_kyc: 'KYC Scam',
  digital_arrest: 'Digital Arrest',
  job_offer: 'Job Scam',
  other: 'Other',
}

export function categoryLabel(cat) {
  if (!cat) return 'Other'
  return SCAM_CATEGORY_LABELS[cat] || cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
