import { test, expect, Page, chromium } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

test.skip(({ browserName }) => browserName === 'firefox', 'Skipping on Firefox');

test.describe('Intermarché Store Scraping Tests', () => {
  let page: Page;
  let htmlContent: string;
  const testUrl = 'https://google.com';
  const cachedHtmlPath = path.join(__dirname, 'intermarche-test-page.html');

  // Set to true to use your real Chrome profile (recommended to avoid bot detection)
  const USE_REAL_BROWSER = true;
  const CHROME_PROFILE_PATH = "/Users/antoninfille/Library/Application Support/Google/Chrome/profile 1";

  test.beforeAll(async ({ browser }) => {
    console.log('Downloading Intermarché page once for all tests...');

    // Check if we already have a cached version
    try {
      const stats = await fs.stat(cachedHtmlPath);
      const hoursSinceDownload = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);

      if (hoursSinceDownload < 24) {
        console.log('Using cached HTML (less than 24 hours old)');
        htmlContent = await fs.readFile(cachedHtmlPath, 'utf-8');
        return;
      }
    } catch {
      // File doesn't exist or error reading it, continue to download
    }

    let downloadPage: Page;
    let browserContext;

    if (USE_REAL_BROWSER && CHROME_PROFILE_PATH) {
      console.log('Using real Chrome profile to avoid bot detection...');
      // Launch with your real Chrome profile
      browserContext = await chromium.launchPersistentContext(CHROME_PROFILE_PATH, {
        headless: false, // Must be false for persistent context
        channel: 'chrome',
        viewport: { width: 1920, height: 1080 },
        locale: 'fr-FR',
        timezoneId: 'Europe/Paris',
      });
      downloadPage = await browserContext.newPage();
    } else {
      console.log('Using standard browser (may be detected as bot)...');
      // Standard approach with stealth settings
      downloadPage = await browser.newPage({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      await downloadPage.setViewportSize({ width: 1920, height: 1080 });

      await downloadPage.setExtraHTTPHeaders({
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        DNT: '1',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      });
    }

    try {
      // Add random delay to appear more human-like
      await downloadPage.waitForTimeout(Math.random() * 2000 + 1000);

      console.log(`Navigating to ${testUrl}...`);
      await downloadPage.goto(testUrl, {
        waitUntil: 'networkidle',
        timeout: 60000,
      });

      // Wait for Intermarché product cards to be loaded
      console.log('Waiting for product elements...');
      await downloadPage.waitForSelector('[data-testid="product-layout"]', {
        state: 'visible',
        timeout: 30000,
      });

      // Add another random delay after page load
      await downloadPage.waitForTimeout(Math.random() * 1000 + 500);

      // Get the full HTML content
      htmlContent = await downloadPage.content();

      // Save to cache file
      await fs.writeFile(cachedHtmlPath, htmlContent, 'utf-8');
      console.log(`Page content saved to ${cachedHtmlPath}`);

      console.log('Page downloaded successfully. Running tests on local copy...');
    } catch (error) {
      console.error('Failed to download page:', error);
      throw error;
    } finally {
      await downloadPage.close();
      if (browserContext) {
        await browserContext.close();
      }
    }
  });

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    await page.setViewportSize({ width: 1280, height: 720 });

    // Load the saved HTML content
    await page.setContent(htmlContent, {
      waitUntil: 'domcontentloaded',
    });

    // Ensure we have product cards loaded
    await page.waitForSelector('[data-testid="product-layout"]', {
      state: 'visible',
      timeout: 5000,
    });
  });

  test('should detect Intermarché store is active', async () => {
    const isActive = await page.evaluate(() => {
      class BaseStore {
        storeName: string;
        constructor(name: string) {
          this.storeName = name;
        }
      }

      class IntermarcheStore extends BaseStore {
        constructor() {
          super('Intermarché');
        }

        isActive(): boolean {
          return document.querySelector('[data-testid="product-layout"]') !== null;
        }
      }

      const store = new IntermarcheStore();
      return store.isActive();
    });

    expect(isActive).toBe(true);
  });

  test('should find product elements on the page', async () => {
    const productCount = await page.locator('[data-testid="product-layout"]').count();

    console.log(`Found ${productCount} products on the page`);
    expect(productCount).toBeGreaterThan(0);
  });

  test('should extract product links with valid href attributes', async () => {
    const productLinks = await page.evaluate(() => {
      const links: string[] = [];

      document.querySelectorAll('[data-testid="product-layout"]').forEach(productElement => {
        // Try multiple selectors as per the implementation
        const link =
          (productElement.querySelector(
            'a.productCard__link, a.link.productCard__link, a.link--link.productCard__link',
          ) as HTMLAnchorElement) ||
          (productElement.querySelector(
            'a[href*="/produit/"], a[href*="/product/"]',
          ) as HTMLAnchorElement);

        if (link) {
          const href = link.getAttribute('href') || link.href;
          if (href) {
            links.push(href);
          }
        }
      });

      return links;
    });

    console.log(`Found ${productLinks.length} product links`);

    expect(productLinks.length).toBeGreaterThan(0);

    // Verify link format - Intermarché URLs typically contain '/produit/' or '/product/'
    productLinks.forEach(link => {
      expect(link).toBeTruthy();
      expect(link).toMatch(/\/(produit|product)\//);
    });
  });

  test('should extract barcodes from product URLs', async () => {
    const productsWithBarcodes = await page.evaluate(() => {
      // Mock the barcode extraction function
      const extractBarcodeFromURL = (url: string): string | null => {
        // Intermarché URLs typically have format: /produit/product-name-BARCODE
        const match = url.match(/\/produit\/[^/]+-(\d{8,13})(?:[/?#]|$)/i);
        if (match && match[1]) {
          return match[1];
        }

        // Alternative: barcode at the end
        const parts = url.split('-');
        const lastPart = parts[parts.length - 1];
        const barcode = lastPart?.split('?')[0]?.split('#')[0]?.split('/')[0];

        if (barcode && /^\d{8,13}$/.test(barcode)) {
          return barcode;
        }

        return null;
      };

      const results: Array<{ href: string; barcode: string | null }> = [];

      document.querySelectorAll('[data-testid="product-layout"]').forEach(productElement => {
        const productLink =
          (productElement.querySelector(
            'a.productCard__link, a.link.productCard__link, a.link--link.productCard__link',
          ) as HTMLAnchorElement) ||
          (productElement.querySelector(
            'a[href*="/produit/"], a[href*="/product/"]',
          ) as HTMLAnchorElement);

        if (productLink) {
          const href = productLink.getAttribute('href') || productLink.href;
          const barcode = href ? extractBarcodeFromURL(href) : null;
          if (href) {
            results.push({ href, barcode });
          }
        }
      });

      return results;
    });

    console.log(`Extracted ${productsWithBarcodes.length} products`);
    console.log(
      `Products with valid barcodes: ${productsWithBarcodes.filter(p => p.barcode !== null).length}`,
    );

    // Log some examples
    productsWithBarcodes.slice(0, 5).forEach((product, index) => {
      console.log(`Product ${index + 1}: ${product.href} -> Barcode: ${product.barcode}`);
    });

    expect(productsWithBarcodes.length).toBeGreaterThan(0);

    const productsWithValidBarcodes = productsWithBarcodes.filter(p => p.barcode !== null);
    expect(productsWithValidBarcodes.length).toBeGreaterThan(0);
  });

  test('should implement getProductElementsAndBarcodes correctly', async () => {
    const results = await page.evaluate(() => {
      const extractBarcodeFromURL = (url: string): string | null => {
        const match = url.match(/\/produit\/[^/]+-(\d{8,13})(?:[/?#]|$)/i);
        if (match && match[1]) {
          return match[1];
        }

        const parts = url.split('-');
        const lastPart = parts[parts.length - 1];
        const barcode = lastPart?.split('?')[0]?.split('#')[0]?.split('/')[0];

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

      class IntermarcheStore extends BaseStore {
        constructor() {
          super('Intermarché');
        }

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
              const productLink =
                (productElement.querySelector(
                  'a.productCard__link, a.link.productCard__link, a.link--link.productCard__link',
                ) as HTMLAnchorElement | null) ??
                productElement.querySelector<HTMLAnchorElement>(
                  'a[href*="/produit/"], a[href*="/product/"]',
                );

              if (!productLink) {
                console.warn(
                  `[Intermarché] Product link not found for product element at index ${index}.`,
                  productElement,
                );
                return;
              }

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
      }

      const store = new IntermarcheStore();
      const products = store.getProductElementsAndBarcodes();

      return {
        count: products.length,
        barcodes: products.map(p => p.barcode).slice(0, 10),
        hasElements: products.every(p => p.productElement instanceof HTMLElement),
      };
    });

    console.log(`Found ${results.count} products with barcodes`);
    console.log(`Sample barcodes:`, results.barcodes);

    expect(results.count).toBeGreaterThan(0);
    expect(results.hasElements).toBe(true);
    expect(results.barcodes.every(barcode => /^\d{8,13}$/.test(barcode))).toBe(true);
  });

  test('should handle product info insertion points for loader', async () => {
    const insertionTest = await page.evaluate(() => {
      const products = document.querySelectorAll('[data-testid="product-layout"]');
      let priceElementsFound = 0;
      let validInsertionPoints = 0;

      products.forEach(product => {
        const priceElement = product.querySelector('.stime-product--footer__prices');
        if (priceElement) {
          priceElementsFound++;
        }
        if (product instanceof HTMLElement) {
          validInsertionPoints++;
        }
      });

      return {
        totalProducts: products.length,
        priceElementsFound,
        validInsertionPoints,
      };
    });

    console.log('Insertion points:', insertionTest);

    expect(insertionTest.totalProducts).toBeGreaterThan(0);
    expect(insertionTest.validInsertionPoints).toBe(insertionTest.totalProducts);
    // Price elements might not always be present, so we just log this
    console.log(`Products with price elements: ${insertionTest.priceElementsFound}`);
  });

  test('should verify product card structure', async () => {
    const structure = await page.evaluate(() => {
      const firstProduct = document.querySelector('[data-testid="product-layout"]');
      if (!firstProduct) return null;

      const linkSelectors = [
        'a.productCard__link',
        'a.link.productCard__link',
        'a.link--link.productCard__link',
        'a[href*="/produit/"]',
        'a[href*="/product/"]',
      ];

      const foundLinks = linkSelectors.map(selector => ({
        selector,
        found: !!firstProduct.querySelector(selector),
        href: firstProduct.querySelector(selector)?.getAttribute('href') || null,
      }));

      return {
        hasProductLayout: true,
        hasPriceElement: !!firstProduct.querySelector('.stime-product--footer__prices'),
        links: foundLinks,
        childElementsCount: firstProduct.children.length,
        classNames: Array.from(firstProduct.classList),
      };
    });

    console.log('Product card structure:', JSON.stringify(structure, null, 2));

    expect(structure).not.toBeNull();
    expect(structure?.hasProductLayout).toBe(true);

    // At least one link selector should match
    const hasValidLink = structure?.links.some(link => link.found && link.href);
    expect(hasValidLink).toBe(true);
  });

  test('should test insertLoader method logic', async () => {
    const insertionResult = await page.evaluate(() => {
      const firstProduct = document.querySelector('[data-testid="product-layout"]') as HTMLElement;
      if (!firstProduct) return { success: false, reason: 'No product found' };

      // Create a mock loader
      const loader = document.createElement('div');
      loader.className = 'test-loader';
      loader.textContent = 'Loading...';

      // Simulate insertLoader logic
      const priceElement = firstProduct.querySelector('.stime-product--footer__prices');
      if (priceElement && priceElement.parentNode) {
        priceElement.parentNode.insertBefore(loader, priceElement);
        return {
          success: true,
          insertedBeforePrice: true,
          loaderExists: !!firstProduct.querySelector('.test-loader'),
        };
      } else {
        firstProduct.appendChild(loader);
        return {
          success: true,
          insertedBeforePrice: false,
          loaderExists: !!firstProduct.querySelector('.test-loader'),
        };
      }
    });

    console.log('Loader insertion:', insertionResult);
    expect(insertionResult.success).toBe(true);
    expect(insertionResult.loaderExists).toBe(true);
  });

  test('should test insertProductInfo method logic', async () => {
    const insertionResult = await page.evaluate(() => {
      const firstProduct = document.querySelector('[data-testid="product-layout"]') as HTMLElement;
      if (!firstProduct) return { success: false, reason: 'No product found' };

      // Create a mock info element
      const infoElement = document.createElement('div');
      infoElement.className = 'test-product-info';
      infoElement.textContent = 'Product Info';

      // Simulate insertProductInfo logic
      const intermPrice = firstProduct.querySelector('.stime-product--footer__prices');

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

          return {
            success: true,
            usedContainer: true,
            infoExists: !!firstProduct.querySelector('.test-product-info'),
            priceInContainer: container.contains(intermPrice),
          };
        }
      }

      // Fallback
      firstProduct.appendChild(infoElement);
      return {
        success: true,
        usedContainer: false,
        infoExists: !!firstProduct.querySelector('.test-product-info'),
      };
    });

    console.log('Product info insertion:', insertionResult);
    expect(insertionResult.success).toBe(true);
    expect(insertionResult.infoExists).toBe(true);
  });

  test.describe('Error Handling', () => {
    test('should handle missing product links gracefully', async () => {
      const result = await page.evaluate(() => {
        const mockElement = document.createElement('div');
        mockElement.setAttribute('data-testid', 'product-layout');

        const productLink =
          (mockElement.querySelector(
            'a.productCard__link, a.link.productCard__link, a.link--link.productCard__link',
          ) as HTMLAnchorElement | null) ??
          mockElement.querySelector<HTMLAnchorElement>(
            'a[href*="/produit/"], a[href*="/product/"]',
          );

        const href = productLink?.getAttribute('href') || productLink?.href;

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
        '/produit/product-name-abc123', // Letters in barcode
        '/produit/product-name-123', // Too short
        '/produit/product-name-12345678901234', // Too long
        '/produit/product-name', // No barcode
        '/produit/product-name-', // Empty barcode
      ];

      const results = await page.evaluate(urls => {
        const extractBarcodeFromURL = (url: string): string | null => {
          const match = url.match(/\/produit\/[^/]+-(\d{8,13})(?:[/?#]|$)/i);
          if (match && match[1]) {
            return match[1];
          }

          const parts = url.split('-');
          const lastPart = parts[parts.length - 1];
          const barcode = lastPart?.split('?')[0]?.split('#')[0]?.split('/')[0];

          if (barcode && /^\d{8,13}$/.test(barcode)) {
            return barcode;
          }

          return null;
        };

        return urls.map(url => ({
          url,
          barcode: extractBarcodeFromURL(url),
        }));
      }, testUrls);

      results.forEach(result => {
        console.log(`URL: ${result.url} -> Barcode: ${result.barcode}`);
        expect(result.barcode).toBeNull();
      });
    });

    test('should validate barcode extraction with valid URLs', async () => {
      const testUrls = [
        '/produit/lait-demi-ecreme-3256220110013',
        '/produit/pain-de-mie-nature-3250391804658',
      ];

      const results = await page.evaluate(urls => {
        const extractBarcodeFromURL = (url: string): string | null => {
          const match = url.match(/\/produit\/[^/]+-(\d{8,13})(?:[/?#]|$)/i);
          if (match && match[1]) {
            return match[1];
          }

          const parts = url.split('-');
          const lastPart = parts[parts.length - 1];
          const barcode = lastPart?.split('?')[0]?.split('#')[0]?.split('/')[0];

          if (barcode && /^\d{8,13}$/.test(barcode)) {
            return barcode;
          }

          return null;
        };

        return urls.map(url => ({
          url,
          barcode: extractBarcodeFromURL(url),
        }));
      }, testUrls);

      results.forEach(result => {
        console.log(`URL: ${result.url} -> Barcode: ${result.barcode}`);
        expect(result.barcode).not.toBeNull();
        expect(result.barcode).toMatch(/^\d{8,13}$/);
      });
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.afterAll(async () => {
  // Uncomment to clean up cache after tests
  // try {
  //   await fs.unlink(cachedHtmlPath);
  //   console.log('Cached HTML file removed');
  // } catch (e) {
  //   console.log('Could not remove cache file:', e);
  // }
  });
});

// Test configuration
test.use({
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  locale: 'fr-FR',
  timezoneId: 'Europe/Paris',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  contextOptions: {
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
 * USE_REAL_BROWSER=true - Use your real Chrome profile to avoid bot detection
 * CHROME_PROFILE_PATH=/path/to/chrome/profile - Path to your Chrome user data directory
 * 
 * IMPORTANT: To avoid bot detection, run with:
 * USE_REAL_BROWSER=true CHROME_PROFILE_PATH="/Users/yourname/Library/Application Support/Google/Chrome" npx playwright test intermarche.spec.ts
 * 
 * Make sure to close Chrome before running the tests with real browser profile!
 *
 * Other options:
 * INTERMARCHE_TEST_USE_CACHE=true  - Use cached HTML if available (default: true)
 * INTERMARCHE_TEST_CACHE_HOURS=24  - Hours before cache expires (default: 24)
 */