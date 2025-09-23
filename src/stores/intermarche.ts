/**
 * Intermarché store implementation
 */

import { BaseStore } from './base-store';
import { ProductWithBarcode } from '../shared/types';
import { extractBarcodeFromURL } from '../shared/utils';

export class IntermarcheStore extends BaseStore {
  constructor() {
    super('Intermarché');
  }

  /**
   * Check if this store is active on the current page
   */
  isActive(): boolean {
    // Check for Intermarché-specific elements
    return document.querySelector('[data-testid="product-layout"]') !== null;
  }

  /**
   * Get product elements and their barcodes for Intermarché
   */
  getProductElementsAndBarcodes(): ProductWithBarcode[] {
    const results: ProductWithBarcode[] = [];

    document.querySelectorAll<HTMLElement>('[data-testid="product-layout"]').forEach(productElement => {
      const productLink = productElement.querySelector(
        'a.link.link--link.productCard__link',
      ) as HTMLAnchorElement | null;
      const href = productLink?.getAttribute('href');
      const barcode = href ? extractBarcodeFromURL(href) : null;
      if (barcode) {
        results.push({ productElement, barcode });
      }
    });

    return results;
  }

  /**
   * Insert loader element for Intermarché products
   */
  insertLoader(productElement: HTMLElement, loader: HTMLElement): void {
    const priceElement = productElement.querySelector('.stime-product--footer__prices');
    if (priceElement && priceElement.parentNode) {
      priceElement.parentNode.insertBefore(loader, priceElement);
    } else {
      productElement.appendChild(loader);
    }
  }

  /**
   * Insert product info element for Intermarché products
   */
  insertProductInfo(productElement: HTMLElement, infoElement: HTMLElement): void {
    // Intermarché: insert above price in a container
    const intermPrice = productElement.querySelector('.stime-product--footer__prices');

    if (intermPrice) {
      const container = document.createElement('div');
      container.style.cssText = `
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
      `;
      container.appendChild(infoElement);

      if (intermPrice.parentNode) {
        intermPrice.parentNode.insertBefore(container, intermPrice);
        container.appendChild(intermPrice);
      }
    } else {
      console.log('Intermarché price element not found');
      productElement.appendChild(infoElement);
    }
  }
}
