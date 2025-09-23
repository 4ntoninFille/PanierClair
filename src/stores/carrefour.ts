/**
 * Carrefour store implementation
 */

import { BaseStore } from './base-store';
import { ProductWithBarcode } from '../shared/types';
import { extractBarcodeFromCarrefourURL } from '../shared/utils';

export class CarrefourStore extends BaseStore {
  constructor() {
    super('Carrefour');
  }

  /**
   * Check if this store is active on the current page
   */
  isActive(): boolean {
    // Check for Carrefour-specific elements
    return document.querySelector('article.product-list-card-plp-grid') !== null;
  }

  /**
   * Get product elements and their barcodes for Carrefour
   */
  getProductElementsAndBarcodes(): ProductWithBarcode[] {
    const results: ProductWithBarcode[] = [];

    document.querySelectorAll<HTMLElement>('article.product-list-card-plp-grid').forEach(productElement => {
      const productLink = productElement.querySelector('a.c-link.product-card-click-wrapper') as HTMLAnchorElement | null;
      const href = productLink?.getAttribute('href');
      // Barcode is at the end of the URL, after the last '-'
      const barcode = href ? extractBarcodeFromCarrefourURL(href) : null;
      if (barcode) {
        results.push({ productElement, barcode });
      }
    });

    return results;
  }

  /**
   * Insert loader element for Carrefour products
   */
  insertLoader(productElement: HTMLElement, loader: HTMLElement): void {
    // TODO: Implement loader insertion logic without causing bugs
    void productElement;
    void loader;
    // const infosElement = productElement.querySelector('.product-list-card-plp-grid__infos');
    // if (infosElement) {
    //   infosElement.appendChild(loader);
    // } else {
    //   productElement.appendChild(loader);
    // }
  }

  /**
   * Insert product info element for Carrefour products
   */
  insertProductInfo(productElement: HTMLElement, infoElement: HTMLElement): void {
    // Remove any positioning styles
    infoElement.style.position = '';
    infoElement.style.left = '';
    infoElement.style.right = '';
    infoElement.style.bottom = '';
    infoElement.style.width = '';
    infoElement.style.zIndex = '';
    productElement.appendChild(infoElement);
  }
}
