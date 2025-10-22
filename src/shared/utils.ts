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
  const match = url.match(/-(\d{8,14})$/);
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

/**
 * Function to get Nutri-Score image path
 */
export function getNutriScoreImagePath(score: string): string {
  const normalizedScore = score.toUpperCase();
  if (normalizedScore === 'UNKNOWN' || normalizedScore === 'NA') {
    return chrome.runtime.getURL('assets/nutriscore/nutriscore-unknown.svg');
  }
  if (normalizedScore === 'NOT-APPLICABLE') {
    return chrome.runtime.getURL('assets/nutriscore/nutriscore-not-applicable.svg');
  }
  const extensionUrl = chrome.runtime.getURL(`assets/nutriscore/nutriscore-${normalizedScore.toLowerCase()}.svg`);
  return extensionUrl;
}

/**
 * Function to get Eco-Score image path
 */
export function getEcoScoreImagePath(score: string): string {
  const normalizedScore = score.toUpperCase();
  if (normalizedScore === 'UNKNOWN' || normalizedScore === 'NA') {
    return chrome.runtime.getURL('assets/ecoscore/green-score-unknown.svg');
  }
  if (normalizedScore === 'NOT-APPLICABLE') {
    return chrome.runtime.getURL('assets/ecoscore/green-score-not-applicable.svg');
  }
  let extensionUrl;
  // Handle special case for A+ if it exists
  if (normalizedScore === 'A+') {
    extensionUrl = chrome.runtime.getURL('assets/ecoscore/green-score-a-plus.svg');
  } else {
    extensionUrl = chrome.runtime.getURL(`assets/ecoscore/green-score-${normalizedScore.toLowerCase()}.svg`);
  }
  return extensionUrl;
}

/**
 * Function to get NOVA group image path
 */
export function getNovaGroupImagePath(score: string): string {
  const normalizedScore = score.toUpperCase();
  if (normalizedScore === 'UNKNOWN' || normalizedScore === 'NA') {
    return chrome.runtime.getURL('assets/nova/nova-group-unknown.svg');
  }
  if (normalizedScore === 'NOT-APPLICABLE') {
    return chrome.runtime.getURL('assets/nova/nova-group-not-applicable.svg');
  }
  const extensionUrl = chrome.runtime.getURL(`assets/nova/nova-group-${normalizedScore.toLowerCase()}.svg`);
  return extensionUrl;
}

/**
 * Function to get score display with image
 */
export function getScoreDisplay(score: string, scoreType: 'nutri' | 'eco' | 'nova'): string {
  let imagePath: string;
  switch (scoreType) {
    case 'eco':
      imagePath = getEcoScoreImagePath(score);
      break;
    case 'nova':
      imagePath = getNovaGroupImagePath(score);
      break;
    case 'nutri':
    default:
      imagePath = getNutriScoreImagePath(score);
  }
  return `<img src="${imagePath}" alt="${score.toUpperCase()} Score" style="height: 50px; vertical-align: middle;" />`;
}

/**
 * Create OpenFoodFacts URL for a given barcode
 */
export function createOpenFoodFactsURL(barcode: string): string {
  return `https://fr.openfoodfacts.org/produit/${barcode}`;
}
