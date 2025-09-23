/**
 * Abstract base class for store implementations
 */

import { ProductWithBarcode, ProductInfo, ProductResponse } from '../shared/types';
import { createLoader, processProductElement } from '../shared/ui-components';

export abstract class BaseStore {
  protected storeName: string;

  constructor(storeName: string) {
    this.storeName = storeName;
  }

  /**
   * Abstract method to get product elements and their barcodes
   * Each store must implement this based on their DOM structure
   */
  abstract getProductElementsAndBarcodes(): ProductWithBarcode[];

  /**
   * Abstract method to define where to insert the loader element
   * Each store has different DOM structures for price/product details
   */
  abstract insertLoader(productElement: HTMLElement, loader: HTMLElement): void;

  /**
   * Abstract method to define where to insert the product info
   * Each store has different DOM structures for product layout
   */
  abstract insertProductInfo(productElement: HTMLElement, infoElement: HTMLElement): void;

  /**
   * Check if this store is active on the current page
   */
  abstract isActive(): boolean;

  /**
   * Process all product items in the grid
   */
  processProductGrid(): void {
    console.log(`Processing ${this.storeName} product grid`);

    const products = this.getProductElementsAndBarcodes();
    const barcodes: string[] = products.map(p => p.barcode);

    // Add loaders to all product elements
    products.forEach(({ productElement }) => {
      if (!productElement.dataset.loaderAdded) {
        const loader = createLoader();
        this.insertLoader(productElement, loader);
        productElement.dataset.loaderAdded = 'true';
      }
    });

    // Fetch product information if we have barcodes
    if (barcodes.length > 0) {
      chrome.runtime.sendMessage({ type: 'getProductsInfo', barcodes }, (response: ProductResponse) => {
        if (response && response.products) {
          products.forEach(({ productElement, barcode }) => {
            const productInfo = response.products.find((product: ProductInfo) => product.barcode === barcode);
            const loader = productElement.querySelector('.loader');
            if (loader) loader.remove();

            if (productInfo) {
              processProductElement(productElement, productInfo, (element, infoElement) => {
                this.insertProductInfo(element, infoElement);
              });
            }
          });
        }
      });
    }
  }

  /**
   * Get the store name
   */
  getName(): string {
    return this.storeName;
  }
}
