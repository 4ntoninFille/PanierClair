console.log('Content script loaded');

let panierclairEnabled = false;

// Function to extract the barcode from the URL
function extractBarcodeFromURL(url: string): string | null {
  const match = url.match(/\/(\d+)$/);
  return match ? match[1] : null;
}

function createProductInfo(barcode: string, name: string, nutriScore: string, ecoScore: string): HTMLElement {
  const infoElement = document.createElement('div');
  infoElement.className = 'panierclair-info';
  infoElement.style.cssText = `
        background-color: #f0f0f0;
        padding: 10px;
        margin-top: 10px;
        border-radius: 5px;
        width: 100%;
        box-sizing: border-box;
        position: relative;
    `;

  // Function to get Nutri-Score image path
  const getNutriScoreImage = (score: string): string => {
    const normalizedScore = score.toUpperCase();
    if (normalizedScore === 'UNKNOWN') {
      return chrome.runtime.getURL('assets/nutriscore/nutriscore-unknown.svg');
    }
    if (normalizedScore === 'NOT-APPLICABLE') {
      return chrome.runtime.getURL('assets/nutriscore/nutriscore-not-applicable.svg');
    }
    const extensionUrl = chrome.runtime.getURL(`assets/nutriscore/nutriscore-${normalizedScore.toLowerCase()}.svg`);
    return extensionUrl;
  };

  // Function to get Eco-Score image path
  const getEcoScoreImage = (score: string): string => {
    const normalizedScore = score.toUpperCase();
    if (normalizedScore === 'UNKNOWN') {
      return chrome.runtime.getURL('assets/ecoscore/green-score-unknown.svg');
    }
    if (normalizedScore === 'NOT-APPLICABLE') {
      return chrome.runtime.getURL('assets/ecoscore/green-score-not-applicable.svg');
    }
    let extensionUrl;
    // Handle special case for A+ if it exists
    if (normalizedScore === 'A+') {
      extensionUrl = chrome.runtime.getURL('assets/ecoscore/green-score-a-plus.svg');
    } else {
      extensionUrl = chrome.runtime.getURL(`assets/ecoscore/green-score-${normalizedScore.toLowerCase()}.svg`);
    }
    return extensionUrl;
  };

  // Function to get score display with image
  const getScoreDisplay = (score: string, isEcoScore: boolean = false): string => {
    const imagePath = isEcoScore ? getEcoScoreImage(score) : getNutriScoreImage(score);
    return `<img src="${imagePath}" alt="${score.toUpperCase()} Score" style="height: 50px; vertical-align: middle;" />`;
  };

  // Create OpenFoodFacts URL
  const openFoodFactsUrl = `https://fr.openfoodfacts.org/produit/${barcode}`;

  infoElement.innerHTML = `
      <div>
        <a href="${openFoodFactsUrl}" target="_blank" rel="noopener noreferrer" style="position: absolute; top: 8px; right: 8px; color: #007bff; text-decoration: none; font-size: 18px; font-weight: bold; z-index: 1;">
          ?
        </a>
        <div style="display: flex; gap: 20px; align-items: center;">
            ${getScoreDisplay(nutriScore, false)}
            ${getScoreDisplay(ecoScore, true)}
        </div>
      </div>
    `;
  return infoElement;
}

function createLoader(): HTMLElement {
  const loader = document.createElement('div');
  loader.className = 'loader';
  loader.style.cssText = `
        background-color: #e0e0e0;
        height: 50px;
        width: 100%;
        margin-top: 10px;
        border-radius: 5px;
        position: relative;
        overflow: hidden;
    `;
  const shine = document.createElement('div');
  shine.style.cssText = `
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        height: 100%;
        width: 100%;
        background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.2) 20%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.2) 80%, rgba(255,255,255,0) 100%);
        animation: shine 1.5s infinite;
    `;
  loader.appendChild(shine);
  return loader;
}
function processProduct(
  productElement: HTMLElement,
  productInfo: { barcode: string; name: string; nutriScore: string; ecoScore: string },
) {
  if (productElement.dataset.processed) return;

  console.log('Product Info:', productInfo);
  // Create the product information element
  const infoElement = createProductInfo(
    productInfo.barcode,
    productInfo.name,
    productInfo.nutriScore,
    productInfo.ecoScore,
  );
  // Find the price element
  const priceElement = productElement.querySelector('.stime-product--footer__prices');

  if (priceElement) {
    // Create a container for the new elements
    const container = document.createElement('div');
    container.style.cssText = `
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
        `;
    // Append the info element to the container
    container.appendChild(infoElement);
    // If there's a price element, move it into the container
    if (priceElement.parentNode) {
      priceElement.parentNode.insertBefore(container, priceElement);
      container.appendChild(priceElement);
    }
  } else {
    console.log('Price element not found');
  }

  productElement.dataset.processed = 'true';
}

// Function to process all product items in the grid
function processProductGrid(): void {
  const productItems = document.querySelectorAll<HTMLElement>('[data-testid="product-layout"]');
  const barcodes: string[] = [];

  productItems.forEach(productElement => {
    if (!productElement.dataset.loaderAdded) {
      const productLink = productElement.querySelector(
        'a.link.link--link.productCard__link',
      ) as HTMLAnchorElement | null;
      if (productLink) {
        const href = productLink.getAttribute('href');
        if (href) {
          const barcode = extractBarcodeFromURL(href);
          console.log('Barcode found:', barcode);
          if (barcode) {
            barcodes.push(barcode);
            // Add loader to product element just above the price element
            const loader = createLoader();
            const priceElement = productElement.querySelector('.stime-product--footer__prices');
            if (priceElement && priceElement.parentNode) {
              priceElement.parentNode.insertBefore(loader, priceElement);
            } else {
              productElement.appendChild(loader);
            }
            productElement.dataset.loaderAdded = 'true';
          }
        }
      }
    }
  });

  if (barcodes.length > 0) {
    // Send message to background script with the extracted barcodes
    console.log('ready to send message');
    chrome.runtime.sendMessage({ type: 'getProductsInfo', barcodes: barcodes }, response => {
      if (response && response.products) {
        productItems.forEach(productElement => {
          const productLink = productElement.querySelector(
            'a.link.link--link.productCard__link',
          ) as HTMLAnchorElement | null;
          const href = productLink?.getAttribute('href');
          const barcode = href ? extractBarcodeFromURL(href) : null;
          if (!barcode) return;
          const productInfo = response.products.find((product: { barcode: string }) => product.barcode === barcode);
          console.log('processing product:', productInfo);
          const loader = productElement.querySelector('.loader');
          // Remove loader
          if (loader) {
            loader.remove();
          }
          if (productInfo) {
            processProduct(productElement, productInfo);
          }
        });
      }
    });
  }
}

// Utility function for debouncing
function debounce<T extends (...args: unknown[]) => void>(func: T, delay: number): T {
  let timer: NodeJS.Timeout | null = null;
  return ((...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  }) as T;
}

// MutationObserver to handle dynamic changes
const observer = new MutationObserver(
  debounce(() => {
    observer.disconnect(); // Temporarily disconnect to avoid loops
    if (panierclairEnabled) {
      console.log('PanierClair is enabled');
      processProductGrid();
    } else {
      console.log('PanierClair is disabled');
    }
    observer.observe(document.body, { childList: true, subtree: true }); // Reconnect observer
  }, 200), // Debounce delay (adjust as needed)
);

// Observe the body for changes
observer.observe(document.body, { childList: true, subtree: true });

chrome.runtime.onMessage.addListener(message => {
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

chrome.storage.local.get(['panierclairEnabled'], result => {
  panierclairEnabled = result.panierclairEnabled !== undefined ? result.panierclairEnabled : true;
  document.querySelectorAll('.panierclair-info').forEach(el => {
    (el as HTMLElement).style.display = panierclairEnabled ? '' : 'none';
  });
  if (panierclairEnabled) {
    console.log('PanierClair is enabled');
    processProductGrid();
  } else {
    console.log('PanierClair is disabled: ', result.panierclairEnabled);
  }
});

console.log('Content script done');
