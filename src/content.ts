/**
 * PanierClair Content Script
 * Modular implementation with store-specific handlers
 */

console.log('Content script loaded');

import { BaseStore } from './stores/base-store';
import { IntermarcheStore } from './stores/intermarche';
import { CarrefourStore } from './stores/carrefour';
import { debounce } from './shared/utils';

let panierclairEnabled = false;
let panierclairCompact = false;
let currentStore: BaseStore | null = null;
let currentFilters: {
  nutriscore: string;
  ecoscore: string;
  nova: string;
  nutriscoreOnly: boolean;
  ecoscoreOnly: boolean;
  novaOnly: boolean;
  greyFilterUnknown: boolean;
} = {
  nutriscore: 'any',
  ecoscore: 'any',
  nova: 'any',
  nutriscoreOnly: false,
  ecoscoreOnly: false,
  novaOnly: false,
  greyFilterUnknown: false,
};

/**
 * Initialize the appropriate store based on the current page
 */
function initializeStore(): void {
  const stores = [new IntermarcheStore(), new CarrefourStore()];

  // Find the active store
  const activeStore = stores.find(store => store.isActive());

  if (activeStore) {
    currentStore = activeStore;
    console.log(`Detected ${activeStore.getName()} store`);
  } else {
    console.log('No supported store detected');
    currentStore = null;
  }
}

/**
 * Process products using the current store's implementation
 */
function processProductGrid(): void {
  if (currentStore && panierclairEnabled) {
    currentStore.processProductGrid(panierclairCompact);
    console.log('Processed product grid');
    // Apply filters after processing (with delay to allow async product fetching)
    setTimeout(() => {
      applyFilters();
    }, 1000);
  }
}

/**
 * Initialize and start the extension
 */
function initialize(): void {
  initializeStore();

  // MutationObserver to handle dynamic changes
  const observer = new MutationObserver(
    debounce(() => {
      observer.disconnect(); // Temporarily disconnect to avoid loops
      if (panierclairEnabled && currentStore) {
        console.log(`PanierClair is enabled for ${currentStore.getName()}`);
        processProductGrid();
      } else {
        console.log('PanierClair is disabled or no store detected');
      }
      observer.observe(document.body, { childList: true, subtree: true }); // Reconnect observer
    }, 200), // Debounce delay (adjust as needed)
  );

  // Observe the body for changes
  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Apply filters to product elements with grey overlay for non-matching products
 */
function applyFilters(): void {
  if (!panierclairEnabled) {
    // If extension is disabled, remove all filters
    document.querySelectorAll('[data-panierclair-nutriscore]').forEach(el => {
      const container = findProductContainer(el as HTMLElement);
      if (container) {
        container.classList.remove('panierclair-filtered-out');
      }
    });
    return;
  }

  // Inject CSS for grey filter effect if not already injected
  if (!document.getElementById('panierclair-filter-styles')) {
    const style = document.createElement('style');
    style.id = 'panierclair-filter-styles';
    style.textContent = `
      .panierclair-filtered-out {
        opacity: 0.4 !important;
        filter: grayscale(100%) !important;
        transition: opacity 0.3s ease, filter 0.3s ease !important;
      }
    `;
    document.head.appendChild(style);
  }

  const productElements = document.querySelectorAll('[data-panierclair-nutriscore]');

  productElements.forEach(element => {
    const productElement = element as HTMLElement;
    const nutriScore = productElement.getAttribute('data-panierclair-nutriscore') || '';
    const ecoScore = productElement.getAttribute('data-panierclair-ecoscore') || '';
    const nova = productElement.getAttribute('data-panierclair-nova') || '';

    let matchesFilter = true;

    // Check Nutriscore filter
    if (currentFilters.nutriscore !== 'any') {
      const normalizedNutri = nutriScore.toLowerCase();
      const filterNutri = currentFilters.nutriscore.toLowerCase();

      // Skip unknown/not-applicable/na
      if (normalizedNutri === 'unknown' || normalizedNutri === 'not-applicable' || normalizedNutri === 'na') {
        matchesFilter = false;
      } else if (currentFilters.nutriscoreOnly) {
        // "Uniquement" (only): exact match only
        if (normalizedNutri !== filterNutri) {
          matchesFilter = false;
        }
      } else {
        // Default: "or better" logic - show products with better or equal score
        const nutriOrder = { a: 1, b: 2, c: 3, d: 4, e: 5 };
        const productNutriValue = nutriOrder[normalizedNutri as keyof typeof nutriOrder];
        const filterNutriValue = nutriOrder[filterNutri as keyof typeof nutriOrder];

        // Product matches if its value is <= filter value (better or equal)
        if (productNutriValue === undefined || filterNutriValue === undefined || productNutriValue > filterNutriValue) {
          matchesFilter = false;
        }
      }
    }

    // Check Ecoscore filter
    if (matchesFilter && currentFilters.ecoscore !== 'any') {
      const normalizedEco = ecoScore.toLowerCase();
      const filterEco = currentFilters.ecoscore.toLowerCase();

      // Skip unknown/not-applicable/na
      if (normalizedEco === 'unknown' || normalizedEco === 'not-applicable' || normalizedEco === 'na') {
        matchesFilter = false;
      } else if (currentFilters.ecoscoreOnly) {
        // "Uniquement" (only): exact match only
        if (normalizedEco !== filterEco) {
          matchesFilter = false;
        }
      } else {
        // Default: "or better" logic - show products with better or equal score
        const ecoOrder: Record<string, number> = { 'a+': 0.5, a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 };
        const productEcoValue = ecoOrder[normalizedEco];
        const filterEcoValue = ecoOrder[filterEco];

        // Product matches if its value is <= filter value (better or equal)
        if (productEcoValue === undefined || filterEcoValue === undefined || productEcoValue > filterEcoValue) {
          matchesFilter = false;
        }
      }
    }

    // Check Nova filter
    if (matchesFilter && currentFilters.nova !== 'any') {
      const normalizedNova = nova.toLowerCase();
      const filterNova = currentFilters.nova.toLowerCase();

      // Skip unknown/not-applicable/na
      if (normalizedNova === 'unknown' || normalizedNova === 'not-applicable' || normalizedNova === 'na') {
        matchesFilter = false;
      } else if (currentFilters.novaOnly) {
        // "Uniquement" (only): exact match only
        if (normalizedNova !== filterNova) {
          matchesFilter = false;
        }
      } else {
        // Default: "or better" logic - show products with better or equal score
        const productNovaValue = parseInt(normalizedNova);
        const filterNovaValue = parseInt(filterNova);

        // Product matches if its value is <= filter value (better or equal)
        if (isNaN(productNovaValue) || isNaN(filterNovaValue) || productNovaValue > filterNovaValue) {
          matchesFilter = false;
        }
      }
    }

    // Check if product has unknown scores
    const normalizedNutri = nutriScore.toLowerCase();
    const normalizedEco = ecoScore.toLowerCase();
    const normalizedNova = nova.toLowerCase();

    // Helper function to check if a score is unknown/not-applicable
    const isUnknownScore = (score: string): boolean => {
      const normalized = score.toLowerCase();
      return normalized === 'unknown' || normalized === 'not-applicable' || normalized === 'na';
    };

    // Check if product has unknown score for an active filter
    // If a filter is active and the corresponding score is unknown, it should be greyed if checkbox is checked
    const hasUnknownForActiveFilter =
      (currentFilters.nutriscore !== 'any' && isUnknownScore(normalizedNutri)) ||
      (currentFilters.ecoscore !== 'any' && isUnknownScore(normalizedEco)) ||
      (currentFilters.nova !== 'any' && isUnknownScore(normalizedNova));

    // Find the product container and apply/remove grey filter
    const productContainer = findProductContainer(productElement);
    if (productContainer) {
      // Determine if product should be greyed out:
      // - If product matches filter AND doesn't have unknown for active filter: never grey it out
      // - If product doesn't match filter:
      //   * If product has unknown for active filter AND greyFilterUnknown is checked: grey it out
      //   * If product has unknown for active filter AND greyFilterUnknown is NOT checked: don't grey it out (show normally)
      //   * If product is NOT unknown: grey it out (normal behavior)
      // - If product matches filter BUT has unknown for active filter AND greyFilterUnknown is checked: grey it out

      let shouldGreyOut = false;

      if (!matchesFilter) {
        // Product doesn't match filter
        if (hasUnknownForActiveFilter) {
          // Product has unknown for active filter: only grey if checkbox is checked
          shouldGreyOut = currentFilters.greyFilterUnknown;
        } else {
          // Product is not unknown: always grey it out (normal filter behavior)
          shouldGreyOut = true;
        }
      } else if (hasUnknownForActiveFilter && currentFilters.greyFilterUnknown) {
        // Product matches filter BUT has unknown for active filter AND checkbox is checked: grey it out
        shouldGreyOut = true;
      }
      // If matchesFilter is true and no unknown for active filter, shouldGreyOut stays false (don't grey it out)

      if (shouldGreyOut) {
        productContainer.classList.add('panierclair-filtered-out');
      } else {
        productContainer.classList.remove('panierclair-filtered-out');
      }
    }
  });
}

/**
 * Find the product container element for a given product element
 * Handles different store structures (Intermarché, Carrefour, etc.)
 */
function findProductContainer(element: HTMLElement): HTMLElement | null {
  // For Intermarché: look for data-testid="product-layout"
  let container = element.closest('[data-testid="product-layout"]') as HTMLElement;
  if (container) {
    return container;
  }

  // For Carrefour: look for article with product-list-card class
  container = element.closest('article[class*="product-list-card-plp-grid"]') as HTMLElement;
  if (container) {
    return container;
  }

  // Fallback: if the element itself has the data attribute, it might be the container
  if (element.hasAttribute('data-panierclair-nutriscore')) {
    // Check if it's a product container (has data-testid or is an article)
    if (element.hasAttribute('data-testid') || element.tagName === 'ARTICLE') {
      return element;
    }
  }

  // Last resort: return the element itself
  return element;
}

/**
 * Handle messages from popup/background script
 */
chrome.runtime.onMessage.addListener(
  (message: {
    type: string;
    enabled?: boolean;
    compact?: boolean;
    filters?: {
      nutriscore: string;
      ecoscore: string;
      nova: string;
      nutriscoreOnly?: boolean;
      ecoscoreOnly?: boolean;
      novaOnly?: boolean;
      greyFilterUnknown?: boolean;
    };
  }) => {
    if (message.type === 'panierclair-toggle') {
      panierclairEnabled = message.enabled !== undefined ? message.enabled : !panierclairEnabled;
      const show = panierclairEnabled;
      document.querySelectorAll('.panierclair-info').forEach(el => {
        (el as HTMLElement).style.display = show ? '' : 'none';
      });
      if (show) {
        processProductGrid();
        applyFilters();
      } else {
        // When disabled, remove all filters
        document.querySelectorAll('[data-panierclair-nutriscore]').forEach(el => {
          const container = findProductContainer(el as HTMLElement);
          if (container) {
            container.classList.remove('panierclair-filtered-out');
          }
        });
      }
    }

    if (message.type === 'panierclair-compact') {
      panierclairCompact = message.compact !== undefined ? message.compact : !panierclairCompact;
      document.body.classList.toggle('panierclair-compact', panierclairCompact);
      console.log('Compact mode set to:', panierclairCompact);

      // If extension is enabled, reprocess the grid to apply compact styling
      if (panierclairEnabled) {
        processProductGrid();
        applyFilters();
      }
    }

    if (message.type === 'panierclair-filters' && message.filters) {
      currentFilters = {
        nutriscore: message.filters.nutriscore || 'any',
        ecoscore: message.filters.ecoscore || 'any',
        nova: message.filters.nova || 'any',
        nutriscoreOnly: message.filters.nutriscoreOnly || false,
        ecoscoreOnly: message.filters.ecoscoreOnly || false,
        novaOnly: message.filters.novaOnly || false,
        greyFilterUnknown: message.filters.greyFilterUnknown || false,
      };
      console.log('Filters updated:', currentFilters);
      applyFilters();
    }
  },
);

/**
 * Initialize extension state from storage and start
 */
chrome.storage.local.get(
  ['panierclairEnabled', 'panierclairCompact', 'panierclairFilters'],
  (result: {
    panierclairEnabled?: boolean;
    panierclairCompact?: boolean;
    panierclairFilters?: {
      nutriscore: string;
      ecoscore: string;
      nova: string;
      nutriscoreOnly?: boolean;
      ecoscoreOnly?: boolean;
      novaOnly?: boolean;
      greyFilterUnknown?: boolean;
    };
  }) => {
    panierclairEnabled = result.panierclairEnabled !== undefined ? result.panierclairEnabled : true;
    panierclairCompact = result.panierclairCompact !== undefined ? result.panierclairCompact : false;
    const savedFilters = result.panierclairFilters;
    currentFilters = {
      nutriscore: savedFilters?.nutriscore || 'any',
      ecoscore: savedFilters?.ecoscore || 'any',
      nova: savedFilters?.nova || 'any',
      nutriscoreOnly: savedFilters?.nutriscoreOnly !== undefined ? savedFilters.nutriscoreOnly : false,
      ecoscoreOnly: savedFilters?.ecoscoreOnly !== undefined ? savedFilters.ecoscoreOnly : false,
      novaOnly: savedFilters?.novaOnly !== undefined ? savedFilters.novaOnly : false,
      greyFilterUnknown: savedFilters?.greyFilterUnknown !== undefined ? savedFilters.greyFilterUnknown : false,
    };

    document.querySelectorAll('.panierclair-info').forEach(el => {
      (el as HTMLElement).style.display = panierclairEnabled ? '' : 'none';
    });

    initialize();

    if (panierclairEnabled && currentStore) {
      console.log(`PanierClair is enabled for ${currentStore.getName()}`);
      processProductGrid();
      // Apply filters after a short delay to ensure products are processed
      setTimeout(() => {
        applyFilters();
      }, 500);
    } else {
      console.log('PanierClair is disabled: ', result.panierclairEnabled);
    }
  },
);

console.log('Content script done');
