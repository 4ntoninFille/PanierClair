import { test, expect, Page } from '@playwright/test';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';

// Add stealth plugin
chromium.use(stealth());

// Helper functions for human-like behavior
const randomDelay = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

async function humanLikeMouseMove(page: Page) {
  const x = randomDelay(100, 800);
  const y = randomDelay(100, 600);
  await page.mouse.move(x, y, { steps: randomDelay(10, 20) });
  await page.waitForTimeout(randomDelay(100, 500));
}

async function humanLikeScroll(page: Page) {
  await page.evaluate(() => {
    window.scrollBy({
      top: Math.random() * 200,
      behavior: 'smooth',
    });
  });
  await page.waitForTimeout(randomDelay(500, 1500));
}

async function humanLikeType(page: Page, selector: string, text: string) {
  // Move mouse to element first
  const element = await page.$(selector);
  if (element) {
    const box = await element.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: randomDelay(5, 10) });
      await page.waitForTimeout(randomDelay(200, 500));
    }
  }

  await page.click(selector);
  await page.waitForTimeout(randomDelay(300, 800));

  // Clear existing content naturally
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.waitForTimeout(randomDelay(100, 300));

  // Type each character with random delays
  for (const char of text) {
    await page.keyboard.type(char);
    await page.waitForTimeout(randomDelay(80, 200));
  }
}

async function humanLikeClick(page: Page, selector: string) {
  // Move mouse to element naturally
  const element = await page.$(selector);
  if (element) {
    const box = await element.boundingBox();
    if (box) {
      // Move to a random point within the element
      const targetX = box.x + randomDelay(5, box.width - 5);
      const targetY = box.y + randomDelay(5, box.height - 5);

      await page.mouse.move(targetX, targetY, { steps: randomDelay(10, 20) });
      await page.waitForTimeout(randomDelay(200, 500));
      await page.mouse.click(targetX, targetY);
    }
  } else {
    // Fallback to regular click if element not found
    await page.click(selector);
  }
}

test.describe('IntermarcheStore Tests', () => {
  test('isActive should return true when product-layout elements exist', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div data-testid="product-layout">
            <h3>Product 1</h3>
          </div>
          <div data-testid="product-layout">
            <h3>Product 2</h3>
          </div>
        </body>
      </html>
    `);

    const isActive = await page.evaluate(() => {
      class IntermarcheStore {
        isActive(): boolean {
          return document.querySelector('[data-testid="product-layout"]') !== null;
        }
      }
      const store = new IntermarcheStore();
      return store.isActive();
    });

    expect(isActive).toBe(true);
  });

  test('isActive should return false when no product-layout elements exist', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div class="other-element">No products here</div>
        </body>
      </html>
    `);

    const isActive = await page.evaluate(() => {
      class IntermarcheStore {
        isActive(): boolean {
          return document.querySelector('[data-testid="product-layout"]') !== null;
        }
      }
      const store = new IntermarcheStore();
      return store.isActive();
    });

    expect(isActive).toBe(false);
  });

  test('getProductElementsAndBarcodes should find products with valid barcodes', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div data-testid="product-layout">
            <a class="link link--link productCard__link" href="/product/test-123456789">Product 1</a>
          </div>
          <div data-testid="product-layout">
            <a class="link link--link productCard__link" href="/product/another-987654321">Product 2</a>
          </div>
        </body>
      </html>
    `);

    const results = await page.evaluate(() => {
      // Mock extractBarcodeFromURL function
      function extractBarcodeFromURL(url: string): string | null {
        const match = url.match(/\/product\/.*-(\d+)$/);
        return match ? match[1] : null;
      }

      interface ProductWithBarcode {
        productElement: HTMLElement;
        barcode: string;
      }

      class IntermarcheStore {
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
      }

      const store = new IntermarcheStore();
      const products = store.getProductElementsAndBarcodes();

      return {
        count: products.length,
        barcodes: products.map(p => p.barcode),
        hasValidElements: products.every(p => p.productElement instanceof HTMLElement),
      };
    });

    expect(results.count).toBe(2);
    expect(results.barcodes).toEqual(['123456789', '987654321']);
    expect(results.hasValidElements).toBe(true);
  });

  test('getProductElementsAndBarcodes should skip products without valid links or barcodes', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div data-testid="product-layout">
            <!-- No link -->
          </div>
          <div data-testid="product-layout">
            <a class="link link--link productCard__link" href="/invalid-url">Product without barcode</a>
          </div>
          <div data-testid="product-layout">
            <a class="different-class" href="/product/valid-123">Wrong class</a>
          </div>
        </body>
      </html>
    `);

    const results = await page.evaluate(() => {
      function extractBarcodeFromURL(url: string): string | null {
        const match = url.match(/\/product\/.*-(\d+)$/);
        return match ? match[1] : null;
      }

      interface ProductWithBarcode {
        productElement: HTMLElement;
        barcode: string;
      }

      class IntermarcheStore {
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
      }

      const store = new IntermarcheStore();
      return store.getProductElementsAndBarcodes().length;
    });

    expect(results).toBe(0);
  });

  test('insertLoader should insert before price element when it exists', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="product-container">
            <div class="stime-product--footer__prices">€2.99</div>
          </div>
        </body>
      </html>
    `);

    await page.evaluate(() => {
      class IntermarcheStore {
        insertLoader(productElement: HTMLElement, loader: HTMLElement): void {
          const priceElement = productElement.querySelector('.stime-product--footer__prices');
          if (priceElement && priceElement.parentNode) {
            priceElement.parentNode.insertBefore(loader, priceElement);
          } else {
            productElement.appendChild(loader);
          }
        }
      }

      const store = new IntermarcheStore();
      const productElement = document.getElementById('product-container')!;
      const loader = document.createElement('div');
      loader.id = 'test-loader';
      loader.textContent = 'Loading...';

      store.insertLoader(productElement, loader);
    });

    // Verify loader was inserted before price
    const loader = page.locator('#test-loader');
    await expect(loader).toBeVisible();
    await expect(loader).toHaveText('Loading...');

    // Verify loader comes before price element
    const elementOrder = await page.evaluate(() => {
      const container = document.getElementById('product-container')!;
      const children = Array.from(container.children);
      const loaderIndex = children.findIndex(child => child.id === 'test-loader');
      const priceIndex = children.findIndex(child => child.classList.contains('stime-product--footer__prices'));
      return { loaderIndex, priceIndex };
    });

    expect(elementOrder.loaderIndex).toBeLessThan(elementOrder.priceIndex);
  });

  test('insertLoader should append to product element when price element not found', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="product-container">
            <h3>Product without price</h3>
          </div>
        </body>
      </html>
    `);

    await page.evaluate(() => {
      class IntermarcheStore {
        insertLoader(productElement: HTMLElement, loader: HTMLElement): void {
          const priceElement = productElement.querySelector('.stime-product--footer__prices');
          if (priceElement && priceElement.parentNode) {
            priceElement.parentNode.insertBefore(loader, priceElement);
          } else {
            productElement.appendChild(loader);
          }
        }
      }

      const store = new IntermarcheStore();
      const productElement = document.getElementById('product-container')!;
      const loader = document.createElement('div');
      loader.id = 'fallback-loader';
      loader.textContent = 'Fallback Loading...';

      store.insertLoader(productElement, loader);
    });

    const loader = page.locator('#fallback-loader');
    await expect(loader).toBeVisible();
    await expect(loader).toHaveText('Fallback Loading...');
  });

  test('insertProductInfo should create container with correct styling and structure', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="product-container">
            <div class="stime-product--footer__prices">€4.99</div>
          </div>
        </body>
      </html>
    `);

    await page.evaluate(() => {
      class IntermarcheStore {
        insertProductInfo(productElement: HTMLElement, infoElement: HTMLElement): void {
          const intermPrice = productElement.querySelector('.stime-product--footer__prices');

          if (intermPrice) {
            const container = document.createElement('div');
            container.id = 'info-container';
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

      const store = new IntermarcheStore();
      const productElement = document.getElementById('product-container')!;
      const infoElement = document.createElement('div');
      infoElement.id = 'product-info';
      infoElement.textContent = 'Nutri-Score: A';

      store.insertProductInfo(productElement, infoElement);
    });

    // Verify container exists and has correct styling
    const container = page.locator('#info-container');
    await expect(container).toBeVisible();

    const containerStyles = await container.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        width: styles.width,
        display: styles.display,
        flexDirection: styles.flexDirection,
        alignItems: styles.alignItems,
      };
    });

    expect(containerStyles.display).toBe('flex');
    expect(containerStyles.flexDirection).toBe('column');
    expect(containerStyles.alignItems).toBe('center');

    // Verify info element is visible
    const infoElement = page.locator('#product-info');
    await expect(infoElement).toBeVisible();
    await expect(infoElement).toHaveText('Nutri-Score: A');

    // Verify price element is now inside container
    const priceInContainer = container.locator('.stime-product--footer__prices');
    await expect(priceInContainer).toBeVisible();
    await expect(priceInContainer).toHaveText('€4.99');
  });

  test('insertProductInfo should fallback to appendChild when price element not found', async ({ page }) => {
    // Mock console.log to capture the message
    let consoleMessage = '';
    page.on('console', msg => {
      if (msg.type() === 'log') {
        consoleMessage = msg.text();
      }
    });

    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="product-container">
            <h3>Product without price</h3>
          </div>
        </body>
      </html>
    `);

    await page.evaluate(() => {
      class IntermarcheStore {
        insertProductInfo(productElement: HTMLElement, infoElement: HTMLElement): void {
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

      const store = new IntermarcheStore();
      const productElement = document.getElementById('product-container')!;
      const infoElement = document.createElement('div');
      infoElement.id = 'fallback-info';
      infoElement.textContent = 'Fallback Info';

      store.insertProductInfo(productElement, infoElement);
    });

    // Verify console message was logged
    expect(consoleMessage).toBe('Intermarché price element not found');

    // Verify info element was appended to product container
    const infoElement = page.locator('#fallback-info');
    await expect(infoElement).toBeVisible();
    await expect(infoElement).toHaveText('Fallback Info');
  });

  test('complete integration test with multiple products', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div data-testid="product-layout" id="product1">
            <a class="link link--link productCard__link" href="/product/milk-123456789">Milk</a>
            <div class="stime-product--footer__prices">€1.50</div>
          </div>
          <div data-testid="product-layout" id="product2">
            <a class="link link--link productCard__link" href="/product/bread-987654321">Bread</a>
            <div class="stime-product--footer__prices">€2.20</div>
          </div>
        </body>
      </html>
    `);

    const testResults = await page.evaluate(() => {
      function extractBarcodeFromURL(url: string): string | null {
        const match = url.match(/\/product\/.*-(\d+)$/);
        return match ? match[1] : null;
      }

      interface ProductWithBarcode {
        productElement: HTMLElement;
        barcode: string;
      }

      class IntermarcheStore {
        isActive(): boolean {
          return document.querySelector('[data-testid="product-layout"]') !== null;
        }

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

        insertProductInfo(productElement: HTMLElement, infoElement: HTMLElement): void {
          const intermPrice = productElement.querySelector('.stime-product--footer__prices');

          if (intermPrice) {
            const container = document.createElement('div');
            container.className = 'info-container';
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
            productElement.appendChild(infoElement);
          }
        }
      }

      const store = new IntermarcheStore();

      // Test isActive
      const isActive = store.isActive();

      // Test getProductElementsAndBarcodes
      const products = store.getProductElementsAndBarcodes();

      // Test insertProductInfo for each product
      products.forEach((product, index) => {
        const infoElement = document.createElement('div');
        infoElement.className = 'product-info';
        infoElement.textContent = `Info for product ${index + 1}`;
        store.insertProductInfo(product.productElement, infoElement);
      });

      return {
        isActive,
        productCount: products.length,
        barcodes: products.map(p => p.barcode),
        infoContainersCount: document.querySelectorAll('.info-container').length,
      };
    });

    expect(testResults.isActive).toBe(true);
    expect(testResults.productCount).toBe(2);
    expect(testResults.barcodes).toEqual(['123456789', '987654321']);
    expect(testResults.infoContainersCount).toBe(2);

    // Verify both info containers are visible
    await expect(page.locator('.info-container')).toHaveCount(2);
    await expect(page.locator('.product-info').first()).toHaveText('Info for product 1');
    await expect(page.locator('.product-info').last()).toHaveText('Info for product 2');
  });

  // INTERNET MARCHE STORE - E2E TESTS

  test('navigate through store selection and validate structure', async () => {
    // Create a persistent user data directory
    const userDataDir = './user_data_intermarche';

    const browser = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      slowMo: randomDelay(50, 150),
      viewport: { width: 1920, height: 1080 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      locale: 'fr-FR',
      timezoneId: 'Europe/Paris',
      permissions: ['geolocation'],
      geolocation: { latitude: 48.8566, longitude: 2.3522 },
      colorScheme: 'light',
      deviceScaleFactor: 1,
      hasTouch: false,
      acceptDownloads: false,
      extraHTTPHeaders: {
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Sec-Ch-Ua': '"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-User': '?1',
        'Sec-Fetch-Dest': 'document',
      },
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=BlockInsecurePrivateNetworkRequests',
        '--window-size=1920,1080',
        '--start-maximized',
      ],
    });

    const page = await browser.newPage();

    // Enhanced init script
    await page.addInitScript(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true,
      });

      // Delete automation properties
      // Remove webdriver property from navigator prototype safely
      const navProto = (navigator as unknown as { __proto__?: Record<string, unknown> }).__proto__;
      if (navProto && Object.prototype.hasOwnProperty.call(navProto, 'webdriver')) {
        delete (navProto as Record<string, unknown>)['webdriver'];
      }

      // Mock plugins with more realistic data (typed locally)
      type FakePlugin = { name: string; filename: string; description: string };
      type FakePluginArray = {
        length: number;
        [index: number]: FakePlugin;
        item(i: number): FakePlugin | undefined;
        namedItem(name: string): FakePlugin | null;
        refresh(): void;
      };
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const pluginArray = {
            length: 5,
            0: { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            1: { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
            2: { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
            3: {
              name: 'Chromium PDF Plugin',
              filename: 'internal-pdf-viewer',
              description: 'Portable Document Format',
            },
            4: {
              name: 'Microsoft Edge PDF Plugin',
              filename: 'internal-pdf-viewer',
              description: 'Portable Document Format',
            },
          } as unknown as FakePluginArray;
          pluginArray.item = (i: number) => pluginArray[i];
          pluginArray.namedItem = (name: string) => {
            for (let i = 0; i < pluginArray.length; i++) {
              if (pluginArray[i].name === name) return pluginArray[i];
            }
            return null;
          };
          pluginArray.refresh = () => {};
          return pluginArray;
        },
        configurable: true,
      });

      // Set realistic languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['fr-FR', 'fr', 'en-US', 'en'],
        configurable: true,
      });

      Object.defineProperty(navigator, 'language', {
        get: () => 'fr-FR',
        configurable: true,
      });

      // Mock chrome object more completely (assigned via unknown cast)
      const fakeChrome = {
        runtime: {
          connect: () => {},
          sendMessage: () => {},
          onMessage: { addListener: () => {} },
        },
        app: {
          isInstalled: false,
          getDetails: () => null,
        },
        webstore: {
          onInstallStageChanged: {},
          onDownloadProgress: {},
        },
        csi: () => {},
        loadTimes: () => ({
          requestTime: Date.now() / 1000,
          startLoadTime: Date.now() / 1000,
          commitLoadTime: Date.now() / 1000 + 0.5,
          finishDocumentLoadTime: Date.now() / 1000 + 1,
          finishLoadTime: Date.now() / 1000 + 1.5,
          firstPaintTime: Date.now() / 1000 + 0.8,
          firstPaintAfterLoadTime: 0,
          navigationType: 'Other',
          wasFetchedViaSpdy: false,
          wasNpnNegotiated: true,
          npnNegotiatedProtocol: 'h2',
          wasAlternateProtocolAvailable: false,
          connectionInfo: 'h2',
        }),
      } as unknown;
      (window as unknown as { chrome?: unknown }).chrome = fakeChrome;

      // Override permissions using correct parameter typing
      const originalQuery = navigator.permissions.query.bind(navigator.permissions);
      navigator.permissions.query = (parameters: PermissionDescriptor): Promise<PermissionStatus> => {
        if ((parameters as PermissionDescriptor).name === 'notifications') {
          return Promise.resolve({ state: 'prompt', onchange: null } as PermissionStatus);
        }
        return originalQuery(parameters);
      };

      // Screen properties
      Object.defineProperty(screen, 'colorDepth', { get: () => 24 });
      Object.defineProperty(screen, 'pixelDepth', { get: () => 24 });
      Object.defineProperty(window.screen, 'width', { get: () => 1920 });
      Object.defineProperty(window.screen, 'height', { get: () => 1080 });
      Object.defineProperty(window.screen, 'availWidth', { get: () => 1920 });
      Object.defineProperty(window.screen, 'availHeight', { get: () => 1040 });

      // Hardware concurrency
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });

      // Device memory
      Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });

      // Platform
      Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });

      // Vendor
      Object.defineProperty(navigator, 'vendor', { get: () => 'Google Inc.' });

      // Max touch points
      Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });

      // Connection
      Object.defineProperty(navigator, 'connection', {
        get: () => ({
          effectiveType: '4g',
          rtt: 50,
          downlink: 10,
          saveData: false,
        }),
      });

      // Battery-like object typing local to this script
      type BatteryLike = {
        charging: boolean;
        chargingTime: number;
        dischargingTime: number;
        level: number;
        addEventListener: (...args: unknown[]) => void;
        removeEventListener: (...args: unknown[]) => void;
        dispatchEvent: (e: Event) => boolean;
      };
      (navigator as unknown as { getBattery?: () => Promise<BatteryLike> }).getBattery = () =>
        Promise.resolve({
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 0.99,
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true,
        } as BatteryLike);

      // WebGL Vendor
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function (parameter: number) {
        if (parameter === 37445) return 'Intel Inc.';
        if (parameter === 37446) return 'Intel Iris OpenGL Engine';
        return getParameter.apply(this, [parameter]);
      };

      const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = function (parameter: number) {
        if (parameter === 37445) return 'Intel Inc.';
        if (parameter === 37446) return 'Intel Iris OpenGL Engine';
        return getParameter2.apply(this, [parameter]);
      };

      // Canvas fingerprint protection using rest parameters instead of 'arguments'
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function (this: HTMLCanvasElement, ...args: unknown[]): string {
        const context = this.getContext('2d');
        if (context) {
          const imageData = context.getImageData(0, 0, this.width, this.height);
          for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] = imageData.data[i] ^ 2;
          }
          context.putImageData(imageData, 0, 0);
        }
        return (originalToDataURL as (...a: unknown[]) => string).apply(this, args);
      };

      // Media devices
      if (navigator.mediaDevices) {
        navigator.mediaDevices.enumerateDevices = () =>
          Promise.resolve([
            {
              deviceId: 'default',
              kind: 'audioinput',
              label: 'Default Audio Device',
              groupId: 'default',
            } as MediaDeviceInfo,
            {
              deviceId: 'communications',
              kind: 'audioinput',
              label: 'Communications Device',
              groupId: 'communications',
            } as MediaDeviceInfo,
            {
              deviceId: 'default',
              kind: 'audiooutput',
              label: 'Default Audio Device',
              groupId: 'default',
            } as MediaDeviceInfo,
          ]);
      }

      // Remove other automation traces safely without using 'any'
      const winRecord = window as unknown as Record<string, unknown>;
      delete winRecord['cdc_adoQpoasnfa76pfcZLmcfl_Array'];
      delete winRecord['cdc_adoQpoasnfa76pfcZLmcfl_Promise'];
      delete winRecord['cdc_adoQpoasnfa76pfcZLmcfl_Symbol'];
    });

    try {
      // Start with blank page and wait
      await page.goto('about:blank');
      await page.waitForTimeout(randomDelay(1000, 2000));

      // Simulate some activity on blank page
      await humanLikeMouseMove(page);
      await page.waitForTimeout(randomDelay(500, 1000));

      // Navigate to the main page
      await page.goto('https://www.intermarche.com', {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      // Wait for page to settle with human-like behavior
      await page.waitForTimeout(randomDelay(3000, 5000));
      await humanLikeMouseMove(page);
      await humanLikeScroll(page);
      await page.waitForTimeout(randomDelay(1000, 2000));

      // Wait for body to be ready
      await page.waitForSelector('body', { state: 'attached', timeout: 30000 });

      // More human-like interaction
      await humanLikeMouseMove(page);
      await page.waitForTimeout(randomDelay(1000, 2000));

      // Handle cookie consent with human-like behavior
      try {
        const cookieButton = await page.$('[class="didomi-continue-without-agreeing"]');
        if (cookieButton) {
          await humanLikeScroll(page);
          await page.waitForTimeout(randomDelay(1000, 2000));
          await humanLikeClick(page, '[class="didomi-continue-without-agreeing"]');
          await page.waitForTimeout(randomDelay(2000, 3000));
        }
      } catch {
        console.log('Cookie consent not found or already handled');
      }

      // More human-like browsing before store selection
      await humanLikeScroll(page);
      await humanLikeMouseMove(page);
      await page.waitForTimeout(randomDelay(2000, 4000));

      // Click store selection button
      await humanLikeClick(page, '[data-testid="btn-header-prehome-store"]');
      await page.waitForTimeout(randomDelay(2000, 3000));

      // Enter postal code with human-like typing
      await humanLikeType(page, '[class="selectAddressForStore__input"]', '75001');
      await page.waitForTimeout(randomDelay(1500, 2500));

      // Select first store
      await humanLikeClick(page, '[data-test-auto="choisirBtn"]');
      await page.waitForTimeout(randomDelay(3000, 4000));

      // Confirm store selection if needed
      try {
        const confirmButton = await page.$('[data-test-auto="choisirBtn"]');
        if (confirmButton) {
          await humanLikeClick(page, '[data-test-auto="choisirBtn"]');
          await page.waitForTimeout(randomDelay(3000, 4000));
        }
      } catch {
        console.log('Second store confirmation not needed');
      }

      // Final human-like interactions
      await humanLikeScroll(page);
      await humanLikeMouseMove(page);

      // Check the page structure
      const pageStructure = await page.evaluate(() => {
        const results = {
          currentUrl: window.location.href,
          hasProductLayouts: false,
          productLayoutCount: 0,
          hasStoreInfo: false,
          pageTitle: document.title,
          alternativeProductSelectors: {
            dataTestId: document.querySelectorAll('[data-testid*="product"]').length,
            productClass: document.querySelectorAll('[class*="product"]').length,
            cardClass: document.querySelectorAll('[class*="card"]').length,
          },
        };

        const productLayouts = document.querySelectorAll('[data-testid="product-layout"]');
        results.hasProductLayouts = productLayouts.length > 0;
        results.productLayoutCount = productLayouts.length;
        results.hasStoreInfo = document.querySelector('[class*="store"], [class*="magasin"]') !== null;

        return results;
      });

      console.log('Page structure after store selection:', pageStructure);

      // Take a screenshot for debugging
      await page.screenshot({ path: 'intermarche-after-store-selection.png', fullPage: true });

      expect(pageStructure.currentUrl).toContain('intermarche.com');
    } catch (error) {
      console.error('Store selection process failed:', error);
      await page.screenshot({ path: 'intermarche-store-selection-failed.png', fullPage: true });
      throw error;
    } finally {
      await browser.close();
    }
  });
});

// test('step by step store selection process', async ({ page }) => {
//   console.log('Starting step by step store selection...');

//   // Step 1: Go to main page
//   await page.goto('https://www.intermarche.com');
//   await page.waitForLoadState('networkidle');
//   console.log('✅ Loaded main page');

//   // Step 2: Find and click store selection button
//   console.log('Looking for store selection button...');
//   // TODO: Add store selection click action here
//   // ________________________________

//   await page.waitForLoadState('networkidle');
//   await page.waitForTimeout(2000);
//   console.log('✅ Store selection clicked');

//   // Step 3: Enter postal code
//   console.log('Looking for location input...');
//   // TODO: Add postal code input action here
//   // ________________________________

//   await page.waitForLoadState('networkidle');
//   await page.waitForTimeout(2000);
//   console.log('✅ Postal code entered');

//   // Step 4: Select first store
//   console.log('Looking for store list...');
//   // TODO: Add store selection click action here
//   // ________________________________

//   await page.waitForLoadState('networkidle');
//   await page.waitForTimeout(2000);
//   console.log('✅ Store selected');

//   // Step 5: Navigate to products
//   console.log('Navigating to product search...');
//   await page.goto('https://www.intermarche.com/magasin/recherche?q=lait');
//   await page.waitForLoadState('networkidle');
//   await page.waitForTimeout(5000);

//   // Step 6: Analyze the final page
//   const finalAnalysis = await page.evaluate(() => {
//     return {
//       url: window.location.href,
//       title: document.title,
//       hasProducts: document.querySelectorAll('[data-testid="product-layout"]').length > 0,
//       productCount: document.querySelectorAll('[data-testid="product-layout"]').length,
//       alternativeProducts: {
//         anyProduct: document.querySelectorAll('[class*="product"]').length,
//         anyCard: document.querySelectorAll('[class*="card"]').length,
//       },
//       hasErrors: document.querySelector('.error, [class*="error"]') !== null
//     };
//   });

//   console.log('Final page analysis:', finalAnalysis);
//   await page.screenshot({ path: 'intermarche-final-state.png', fullPage: true });

//   expect(finalAnalysis.url).toContain('intermarche.com');
//   expect(finalAnalysis.hasErrors).toBe(false);
// });
