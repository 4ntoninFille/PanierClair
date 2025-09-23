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
let currentStore: BaseStore | null = null;

/**
 * Initialize the appropriate store based on the current page
 */
function initializeStore(): void {
  const stores = [
    new IntermarcheStore(),
    new CarrefourStore(),
  ];

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
    currentStore.processProductGrid();
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
chrome.runtime.onMessage.addListener((message: { type: string; enabled?: boolean }) => {
  if (message.type === 'panierclair-toggle') {
    panierclairEnabled = panierclairEnabled ? false : true;
    const show = message.enabled;
    document.querySelectorAll('.panierclair-info').forEach(el => {
      (el as HTMLElement).style.display = show ? '' : 'none';
    });
    if (show) {
      processProductGrid();
    }
  }
});

/**
 * Initialize extension state from storage and start
 */
chrome.storage.local.get(['panierclairEnabled'], (result: { panierclairEnabled?: boolean }) => {
  panierclairEnabled = result.panierclairEnabled !== undefined ? result.panierclairEnabled : true;
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
});

console.log('Content script done');
