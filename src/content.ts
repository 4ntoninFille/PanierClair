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
 * Handle messages from popup/background script
 */
chrome.runtime.onMessage.addListener((message: { type: string; enabled?: boolean; compact?: boolean }) => {
  if (message.type === 'panierclair-toggle') {
    panierclairEnabled = message.enabled !== undefined ? message.enabled : !panierclairEnabled;
    const show = panierclairEnabled;
    document.querySelectorAll('.panierclair-info').forEach(el => {
      (el as HTMLElement).style.display = show ? '' : 'none';
    });
    if (show) {
      processProductGrid();
    }
  }

  if (message.type === 'panierclair-compact') {
    panierclairCompact = message.compact !== undefined ? message.compact : !panierclairCompact;
    document.body.classList.toggle('panierclair-compact', panierclairCompact);
    console.log('Compact mode set to:', panierclairCompact);

    // If extension is enabled, reprocess the grid to apply compact styling
    if (panierclairEnabled) {
      processProductGrid();
    }
  }
});

/**
 * Initialize extension state from storage and start
 */
chrome.storage.local.get(
  ['panierclairEnabled', 'panierclairCompact'],
  (result: { panierclairEnabled?: boolean; panierclairCompact?: boolean }) => {
    panierclairEnabled = result.panierclairEnabled !== undefined ? result.panierclairEnabled : true;
    panierclairCompact = result.panierclairCompact !== undefined ? result.panierclairCompact : false;

    document.querySelectorAll('.panierclair-info').forEach(el => {
      (el as HTMLElement).style.display = panierclairEnabled ? '' : 'none';
    });

    initialize();

    if (panierclairEnabled && currentStore) {
      console.log(`PanierClair is enabled for ${currentStore.getName()}`);
      processProductGrid();
    } else {
      console.log('PanierClair is disabled: ', result.panierclairEnabled);
    }
  },
);

console.log('Content script done');
