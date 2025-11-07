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
    // match either product-list-card-plp-grid or product-list-card-plp-grid-new (or similar variants)
    return document.querySelector('article[class*="product-list-card-plp-grid"]') !== null;
  }

  /**
   * Extract barcode from article HTML content as last resort
   */
  private extractBarcodeFromArticleHTML(productElement: HTMLElement): string | null {
    // Search for 13-digit barcodes in the article's HTML
    const htmlContent = productElement.innerHTML;
    const barcodeMatches = htmlContent.match(/\b\d{13}\b/g);

    if (barcodeMatches && barcodeMatches.length > 0) {
      // Return the first 13-digit number found
      // (often barcodes are EAN-13 format)
      return barcodeMatches[0];
    }

    // Also try 8-digit barcodes (EAN-8)
    const shortBarcodeMatches = htmlContent.match(/\b\d{8}\b/g);
    if (shortBarcodeMatches && shortBarcodeMatches.length > 0) {
      return shortBarcodeMatches[0];
    }

    return null;
  }

  /**
   * Get product elements and their barcodes for Carrefour
   */
  getProductElementsAndBarcodes(): ProductWithBarcode[] {
    const results: ProductWithBarcode[] = [];

    // use attribute-contains selector so it matches both old and new class variants
    document.querySelectorAll<HTMLElement>('article[class*="product-list-card-plp-grid"]').forEach(productElement => {
      let barcode: string | null = null;

      // Method 1: Try article ID first
      const articleId = productElement.id;
      if (articleId && /^\d{8,14}$/.test(articleId)) {
        barcode = articleId;
      }

      // Method 2: Fallback to URL extraction if ID doesn't work
      if (!barcode) {
        const productLink = productElement.querySelector(
          'a.c-link.product-card-click-wrapper',
        ) as HTMLAnchorElement | null;
        const href = productLink?.getAttribute('href');
        barcode = href ? extractBarcodeFromCarrefourURL(href) : null;
      }

      // Method 3: Last resort - search in article HTML
      if (!barcode) {
        barcode = this.extractBarcodeFromArticleHTML(productElement);
      }

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
    // const infosElement = productElement.querySelector('.class="product-list-card-plp-grid-new"__infos');
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
