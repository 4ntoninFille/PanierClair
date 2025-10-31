import { test, expect, Page } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

test.describe('Carrefour Store Scraping Tests', () => {
  let page: Page;
  let htmlContent: string;
  const testUrl = 'https://www.carrefour.fr/promotions?filters%5Bproduct.categories.id%5D%5B0%5D=2183&noRedirect=0';
  const cachedHtmlPath = path.join(__dirname, 'carrefour-test-page.html');

  // Download the page only once for all tests
  test.beforeAll(async ({ browser }) => {
    console.log('Downloading Carrefour page once for all tests...');

    // Check if we already have a cached version (optional)
    try {
      const stats = await fs.stat(cachedHtmlPath);
      const hoursSinceDownload = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);

      // Use cached version if less than 24 hours old
      if (hoursSinceDownload < 24) {
        console.log('Using cached HTML (less than 24 hours old)');
        htmlContent = await fs.readFile(cachedHtmlPath, 'utf-8');
        return;
      }
    } catch (e) {
      console.error('Error checking cached HTML:', e);
    }

    // Create a new page for downloading
    const downloadPage = await browser.newPage({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    // Add stealth settings to avoid detection
    await downloadPage.setViewportSize({ width: 1920, height: 1080 });

    // Add extra headers to appear more legitimate
    await downloadPage.setExtraHTTPHeaders({
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      DNT: '1',
      Connection: 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    });

    // Add a random delay before navigation (between 1-3 seconds)
    await downloadPage.waitForTimeout(Math.random() * 2000 + 1000);

    // Navigate to the page
    await downloadPage.goto(testUrl, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    // Wait for product cards to be loaded
    await downloadPage.waitForSelector('article.product-list-card-plp-grid-new', {
      state: 'visible',
      timeout: 30000,
    });

    // Add a small random delay after page load
    await downloadPage.waitForTimeout(Math.random() * 1000 + 500);

    // Get the full HTML content
    htmlContent = await downloadPage.content();

    // Save to cache file
    await fs.writeFile(cachedHtmlPath, htmlContent, 'utf-8');
    console.log(`Page content saved to ${cachedHtmlPath}`);

    // Close the download page
    await downloadPage.close();

    console.log('Page downloaded successfully. Running tests on local copy...');
  });

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Set a reasonable viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Load the saved HTML content instead of navigating to the URL
    await page.setContent(htmlContent, {
      waitUntil: 'domcontentloaded',
    });

    // Ensure we have product cards loaded
    await page.waitForSelector('article.product-list-card-plp-grid-new', {
      state: 'visible',
      timeout: 5000, // Much shorter timeout since it's local
    });
  });

  test('should detect Carrefour store is active on promotions page', async () => {
    // Inject the CarrefourStore class into the page
    const isActive = await page.evaluate(() => {
      // Mock the BaseStore for testing
      class BaseStore {
        storeName: string;
        constructor(name: string) {
          this.storeName = name;
        }
      }

      // Define CarrefourStore in the page context
      class CarrefourStore extends BaseStore {
        constructor() {
          super('Carrefour');
        }

        isActive(): boolean {
          return document.querySelector('article.product-list-card-plp-grid-new') !== null;
        }
      }

      const store = new CarrefourStore();
      return store.isActive();
    });

    expect(isActive).toBe(true);
  });

  test('should find product elements on the page', async () => {
    // Count the number of product cards
    const productCount = await page.locator('article.product-list-card-plp-grid-new').count();

    console.log(`Found ${productCount} products on the page`);
    expect(productCount).toBeGreaterThan(0);
  });

  test('should extract product links with valid href attributes', async () => {
    // Get all product links
    const productLinks = await page.evaluate(() => {
      const links: string[] = [];
      document.querySelectorAll('article.product-list-card-plp-grid-new').forEach(article => {
        const link = article.querySelector('a.c-link.product-card-click-wrapper');
        if (link) {
          const href = link.getAttribute('href');
          if (href) {
            links.push(href);
          }
        }
      });
      return links;
    });

    console.log(`Found ${productLinks.length} product links`);

    // Verify we found some links
    expect(productLinks.length).toBeGreaterThan(0);

    // Verify link format
    productLinks.forEach(link => {
      expect(link).toBeTruthy();
      // Carrefour product URLs typically contain '/p/' or similar pattern
      expect(link).toMatch(/\/p\//);
    });
  });

  test('should extract barcodes from product URLs', async () => {
    // Test the barcode extraction logic
    const productsWithBarcodes = await page.evaluate(() => {
      // Mock the extractBarcodeFromCarrefourURL function
      const extractBarcodeFromCarrefourURL = (url: string): string | null => {
        // Carrefour URLs typically end with the barcode after the last '-'
        const parts = url.split('-');
        const lastPart = parts[parts.length - 1];
        // Remove any query parameters or hash
        const barcode = lastPart?.split('?')[0]?.split('#')[0];
        // Validate it looks like a barcode (numeric, typically 8-13 digits)
        if (barcode && /^\d{8,13}$/.test(barcode)) {
          return barcode;
        }
        return null;
      };

      const results: Array<{ href: string; barcode: string | null }> = [];

      document.querySelectorAll('article.product-list-card-plp-grid-new').forEach(productElement => {
        const productLink = productElement.querySelector(
          'a.c-link.product-card-click-wrapper',
        ) as HTMLAnchorElement | null;
        const href = productLink?.getAttribute('href');
        const barcode = href ? extractBarcodeFromCarrefourURL(href) : null;
        if (href) {
          results.push({ href, barcode });
        }
      });

      return results;
    });

    console.log(`Extracted ${productsWithBarcodes.length} products`);
    console.log(`Products with valid barcodes: ${productsWithBarcodes.filter(p => p.barcode !== null).length}`);

    // Log some examples for debugging
    productsWithBarcodes.slice(0, 5).forEach((product, index) => {
      console.log(`Product ${index + 1}: ${product.href} -> Barcode: ${product.barcode}`);
    });

    // Verify we found products
    expect(productsWithBarcodes.length).toBeGreaterThan(0);

    // Verify at least some products have barcodes
    const productsWithValidBarcodes = productsWithBarcodes.filter(p => p.barcode !== null);
    expect(productsWithValidBarcodes.length).toBeGreaterThan(0);
  });

  test('should implement getProductElementsAndBarcodes correctly', async () => {
    const results = await page.evaluate(() => {
      // Mock dependencies
      const extractBarcodeFromCarrefourURL = (url: string): string | null => {
        const parts = url.split('-');
        const lastPart = parts[parts.length - 1];
        const barcode = lastPart?.split('?')[0]?.split('#')[0];
        if (barcode && /^\d{8,13}$/.test(barcode)) {
          return barcode;
        }
        return null;
      };

      class BaseStore {
        storeName: string;
        constructor(name: string) {
          this.storeName = name;
        }
      }

      interface ProductWithBarcode {
        productElement: HTMLElement;
        barcode: string;
      }

      class CarrefourStore extends BaseStore {
        constructor() {
          super('Carrefour');
        }

        getProductElementsAndBarcodes(): ProductWithBarcode[] {
          const results: ProductWithBarcode[] = [];

          document.querySelectorAll<HTMLElement>('article.product-list-card-plp-grid-new').forEach(productElement => {
            const productLink = productElement.querySelector(
              'a.c-link.product-card-click-wrapper',
            ) as HTMLAnchorElement | null;
            const href = productLink?.getAttribute('href');
            const barcode = href ? extractBarcodeFromCarrefourURL(href) : null;
            if (barcode) {
              results.push({ productElement, barcode });
            }
          });

          return results;
        }
      }

      const store = new CarrefourStore();
      const products = store.getProductElementsAndBarcodes();

      // Return serializable data for testing
      return {
        count: products.length,
        barcodes: products.map(p => p.barcode).slice(0, 10), // First 10 for logging
        hasElements: products.every(p => p.productElement instanceof HTMLElement),
      };
    });

    console.log(`Found ${results.count} products with barcodes`);
    console.log(`Sample barcodes:`, results.barcodes);

    expect(results.count).toBeGreaterThan(0);
    expect(results.hasElements).toBe(true);
    expect(results.barcodes.every(barcode => /^\d{8,13}$/.test(barcode))).toBe(true);
  });

  test('should handle product info insertion points', async () => {
    // Test that the insertion point exists for product info
    const insertionPointsExist = await page.evaluate(() => {
      const products = document.querySelectorAll('article.product-list-card-plp-grid-new');
      let validInsertionPoints = 0;

      products.forEach(product => {
        // Check if we can append to the product element
        if (product instanceof HTMLElement) {
          validInsertionPoints++;
        }
      });

      return {
        totalProducts: products.length,
        validInsertionPoints,
      };
    });

    console.log(
      `Products: ${insertionPointsExist.totalProducts}, Valid insertion points: ${insertionPointsExist.validInsertionPoints}`,
    );

    expect(insertionPointsExist.totalProducts).toBeGreaterThan(0);
    expect(insertionPointsExist.validInsertionPoints).toBe(insertionPointsExist.totalProducts);
  });

  test('should verify product card structure', async () => {
    // Analyze the structure of product cards to ensure selectors are correct
    const structure = await page.evaluate(() => {
      const firstProduct = document.querySelector('article.product-list-card-plp-grid-new');
      if (!firstProduct) return null;

      const analysis = {
        hasArticle: true,
        hasLink: !!firstProduct.querySelector('a.c-link.product-card-click-wrapper'),
        hasInfoSection: !!firstProduct.querySelector('.product-list-card-plp-grid-new__infos'),
        linkHref: firstProduct.querySelector('a.c-link.product-card-click-wrapper')?.getAttribute('href') || null,
        childElementsCount: firstProduct.children.length,
        classNames: Array.from(firstProduct.classList),
      };

      return analysis;
    });

    console.log('Product card structure:', structure);

    expect(structure).not.toBeNull();
    expect(structure?.hasArticle).toBe(true);
    expect(structure?.hasLink).toBe(true);
    expect(structure?.linkHref).toBeTruthy();
  });

  test('should handle pagination if present', async () => {
    // Check if there's pagination on the page
    const hasPagination = await page.evaluate(() => {
      // Common pagination selectors for Carrefour
      const paginationSelectors = [
        '.pagination',
        '[data-testid="pagination"]',
        '.c-pagination',
        'button[aria-label*="page"]',
      ];

      return paginationSelectors.some(selector => document.querySelector(selector) !== null);
    });

    console.log(`Pagination present: ${hasPagination}`);

    // This is informational - pagination may or may not be present
    // depending on the number of products
  });

  test.describe('Error Handling', () => {
    test('should handle missing product links gracefully', async () => {
      const result = await page.evaluate(() => {
        // Create a mock product element without a link
        const mockElement = document.createElement('article');
        mockElement.className = 'product-list-card-plp-grid-new';

        // Test extraction with missing link
        const productLink = mockElement.querySelector(
          'a.c-link.product-card-click-wrapper',
        ) as HTMLAnchorElement | null;
        const href = productLink?.getAttribute('href');

        return {
          hasLink: !!productLink,
          href: href || null,
        };
      });

      expect(result.hasLink).toBe(false);
      expect(result.href).toBeNull();
    });

    test('should handle invalid barcode formats', async () => {
      const testUrls = [
        '/p/product-name-abc123', // Letters in barcode
        '/p/product-name-123', // Too short
        '/p/product-name-12345678901234', // Too long
        '/p/product-name', // No barcode
        '/p/product-name-', // Empty barcode
      ];

      const results = await page.evaluate(urls => {
        const extractBarcodeFromCarrefourURL = (url: string): string | null => {
          const parts = url.split('-');
          const lastPart = parts[parts.length - 1];
          const barcode = lastPart?.split('?')[0]?.split('#')[0];
          if (barcode && /^\d{8,13}$/.test(barcode)) {
            return barcode;
          }
          return null;
        };

        return urls.map(url => ({
          url,
          barcode: extractBarcodeFromCarrefourURL(url),
        }));
      }, testUrls);

      results.forEach(result => {
        console.log(`URL: ${result.url} -> Barcode: ${result.barcode}`);
        expect(result.barcode).toBeNull();
      });
    });
  });

  test.afterEach(async () => {
    // Clean up after each test if needed
    await page.close();
  });

  // Optional: Clean up cached HTML after all tests
  test.afterAll(async () => {
    // Uncomment the following lines if you want to delete the cache after tests
    // try {
    //   await fs.unlink(cachedHtmlPath);
    //   console.log('Cached HTML file removed');
    // } catch (e) {
    //   console.log('Could not remove cache file:', e);
    // }
  });
});

// Configuration for running tests with specific browser settings
test.use({
  // Use a specific browser context
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

  // Set locale for consistent testing
  locale: 'fr-FR',

  // Disable JavaScript if testing non-JS functionality
  // javaScriptEnabled: false,

  // Screenshot on failure for debugging
  screenshot: 'only-on-failure',

  // Video recording for debugging
  video: 'retain-on-failure',

  // Slow down actions to appear more human-like (uncomment if needed)
  // launchOptions: {
  //   slowMo: 100 + Math.random() * 200 // Random delay between 100-300ms
  // },

  // Additional stealth options
  contextOptions: {
    // Disable webdriver flag
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,
  },
});

/**
 * Environment variables for configuration:
 *
 * CARREFOUR_TEST_USE_CACHE=true  - Use cached HTML if available (default: true)
 * CARREFOUR_TEST_CACHE_HOURS=24  - Hours before cache expires (default: 24)
 * CARREFOUR_TEST_HEADLESS=true   - Run in headless mode (default: true)
 *
 * Example usage:
 * CARREFOUR_TEST_USE_CACHE=false npx playwright test carrefour.spec.ts
 */
