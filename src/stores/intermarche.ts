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

    try {
      const productElements = Array.from(
        document.querySelectorAll<HTMLElement>('[data-testid="product-layout"]'),
      );

      if (productElements.length === 0) {
        console.error('[Intermarché] No product elements found on the page.');
        return results;
      }

      productElements.forEach((productElement, index) => {
        const productLink = productElement.querySelector(
          // match anchors that contain the productCard__link class (Intermarché uses different class combos)
          'a.productCard__link, a.link.productCard__link, a.link--link.productCard__link',
        ) as HTMLAnchorElement | null ?? productElement.querySelector<HTMLAnchorElement>(
          // fallback: any product-like href
          'a[href*="/produit/"], a[href*="/product/"]',
        );

        if (!productLink) {
          console.warn(
            `[Intermarché] Product link not found for product element at index ${index}.`,
            productElement,
          );
          return;
        }

        // prefer the raw href attribute, otherwise use the resolved href
        const href = productLink.getAttribute('href') || productLink.href;
        if (!href) {
          console.warn(
            `[Intermarché] href missing on product link for product at index ${index}.`,
            productLink,
          );
          return;
        }

        const barcode = extractBarcodeFromURL(href);
        if (!barcode) {
          console.warn(`[Intermarché] Could not extract barcode from URL: ${href}`);
          return;
        }

        results.push({ productElement, barcode });
      });
    } catch (err) {
      console.error('[Intermarché] Error while getting product elements and barcodes:', err);
    }

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
