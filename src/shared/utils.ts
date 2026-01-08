/**
 * Shared utility functions for the PanierClair extension
 */

/**
 * Function to extract the barcode from the URL (for simple cases)
 */
export function extractBarcodeFromURL(url: string): string | null {
  const match = url.match(/\/(\d+)$/);
  return match ? match[1] : null;
}

/**
 * Function to extract barcode from Carrefour-style URLs (ends with -<digits>)
 */
export function extractBarcodeFromCarrefourURL(url: string): string | null {
  const cleanUrl = url.split('?')[0].split('#')[0];
  const match = cleanUrl.match(/-(\d{8,14})$/);
  return match ? match[1] : null;
}

/**
 * Utility function for debouncing
 */
export function debounce<T extends (...args: unknown[]) => void>(func: T, delay: number): T {
  let timer: NodeJS.Timeout | null = null;
  return ((...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  }) as T;
}

type Variant = 'full' | 'icon';

/**
 * Function to get Nutri-Score image path
 */
export function getNutriScoreImagePath(score: string, variant: Variant = 'full'): string {
  const normalizedScore = score.toUpperCase();

  if (normalizedScore === 'UNKNOWN' || normalizedScore === 'NA') {
    // Use same unknown asset for both variants if no icon exists
    return chrome.runtime.getURL('assets/nutriscore/nutriscore-unknown.svg');
  }
  if (normalizedScore === 'NOT-APPLICABLE') {
    return chrome.runtime.getURL('assets/nutriscore/nutriscore-not-applicable.svg');
  }

  // For icons, we append '-icon' before .svg (if such assets exist)
  const baseName = `nutriscore-${normalizedScore.toLowerCase()}`;
  const fileName = variant === 'icon' ? `${baseName}-icon.svg` : `${baseName}.svg`;
  return chrome.runtime.getURL(`assets/nutriscore/${fileName}`);
}

/**
 * Function to get Eco-Score image path
 */
export function getEcoScoreImagePath(score: string, variant: Variant = 'full'): string {
  const normalizedScore = score.toUpperCase();

  if (normalizedScore === 'UNKNOWN' || normalizedScore === 'NA') {
    return chrome.runtime.getURL('assets/ecoscore/green-score-unknown.svg');
  }
  if (normalizedScore === 'NOT-APPLICABLE') {
    return chrome.runtime.getURL('assets/ecoscore/green-score-not-applicable.svg');
  }

  // Special case for A+ (full: green-score-a-plus.svg, icon: green-score-a-icon.svg)
  if (normalizedScore === 'A+') {
    const fileName = variant === 'icon' ? 'green-score-a-icon.svg' : 'green-score-a-plus.svg';
    return chrome.runtime.getURL(`assets/ecoscore/${fileName}`);
  }

  // Normal cases: append '-icon' for icon variant
  const base = `green-score-${normalizedScore.toLowerCase()}`;
  const fileName = variant === 'icon' ? `${base}-icon.svg` : `${base}.svg`;
  return chrome.runtime.getURL(`assets/ecoscore/${fileName}`);
}

/**
 * Function to get NOVA group image path
 */
export function getNovaGroupImagePath(score: string, variant: Variant = 'full'): string {
  const normalizedScore = score.toUpperCase();

  if (normalizedScore === 'UNKNOWN' || normalizedScore === 'NA') {
    return chrome.runtime.getURL('assets/nova/nova-group-unknown.svg');
  }
  if (normalizedScore === 'NOT-APPLICABLE') {
    return chrome.runtime.getURL('assets/nova/nova-group-not-applicable.svg');
  }

  const baseName = `nova-group-${normalizedScore.toLowerCase()}`;
  const fileName = variant === 'icon' ? `${baseName}-icon.svg` : `${baseName}.svg`;
  return chrome.runtime.getURL(`assets/nova/${fileName}`);
}

/**
 * Function to get score display with image
 * Accepts optional variant to request icon-sized assets and adjusts height accordingly.
 */
export function getScoreDisplay(score: string, scoreType: 'nutri' | 'eco' | 'nova', variant: Variant = 'full'): string {
  let imagePath: string;
  switch (scoreType) {
    case 'eco':
      imagePath = getEcoScoreImagePath(score, variant);
      break;
    case 'nova':
      imagePath = getNovaGroupImagePath(score, variant);
      break;
    case 'nutri':
    default:
      imagePath = getNutriScoreImagePath(score, variant);
  }

  return `<img src="${imagePath}" alt="${score.toUpperCase()} Score"  />`;
}

/**
 * Create OpenFoodFacts URL for a given barcode
 */
export function createOpenFoodFactsURL(barcode: string): string {
  return `https://fr.openfoodfacts.org/produit/${barcode}`;
}
