/**
 * Shared UI components for the PanierClair extension
 */

import { ProductInfo } from './types';
import { getScoreDisplay, createOpenFoodFactsURL } from './utils';

/**
 * Creates the product info element with scores and OpenFoodFacts link
 */
export function createProductInfo(
  barcode: string,
  name: string,
  nutriScore: string,
  ecoScore: string,
  novaGroup: string,
  isCompact: boolean,
): HTMLElement {
  const infoElement = document.createElement('div');
  infoElement.className = 'panierclair-info';

  // Create OpenFoodFacts URL
  const openFoodFactsUrl = createOpenFoodFactsURL(barcode);

  // Interrogation link
  const interrogationLink = `<a href="${openFoodFactsUrl}" target="_blank" rel="noopener noreferrer" class="interrogation-link"><svg fill="#00a63e" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 416.979 416.979" xml:space="preserve"><g><path d="M356.004,61.156c-81.37-81.47-213.377-81.551-294.848-0.182c-81.47,81.371-81.552,213.379-0.181,294.85 c81.369,81.47,213.378,81.551,294.849,0.181C437.293,274.636,437.375,142.626,356.004,61.156z M237.6,340.786 c0,3.217-2.607,5.822-5.822,5.822h-46.576c-3.215,0-5.822-2.605-5.822-5.822V167.885c0-3.217,2.607-5.822,5.822-5.822h46.576 c3.215,0,5.822,2.604,5.822,5.822V340.786z M208.49,137.901c-18.618,0-33.766-15.146-33.766-33.765 c0-18.617,15.147-33.766,33.766-33.766c18.619,0,33.766,15.148,33.766,33.766C242.256,122.755,227.107,137.901,208.49,137.901z"></path></g></svg></a>`;

  // Normalize scores for data attributes (lowercase, handle special cases)
  const normalizedNutri = nutriScore.toLowerCase();
  const normalizedEco = ecoScore.toLowerCase(); // A+ becomes a+
  const normalizedNova = novaGroup.toLowerCase();

  // Add data attributes for filtering
  infoElement.setAttribute('data-nutriscore', normalizedNutri);
  infoElement.setAttribute('data-ecoscore', normalizedEco);
  infoElement.setAttribute('data-nova', normalizedNova);

  infoElement.innerHTML += `
    ${interrogationLink}
    <div style="width: 100%; display: flex; flex-direction: row; align-items: center; justify-content: flex-start; position: relative;">
      <div class="score-row">
      	<a href="${openFoodFactsUrl}#panel_group_nutrition" target="_blank" rel="noopener noreferrer">
        	${getScoreDisplay(nutriScore, 'nutri', isCompact ? 'icon' : 'full').replace('<svg', '<svg class="score-svg"')}
        </a>
        <a href="${openFoodFactsUrl}#panel_environment_card" target="_blank" rel="noopener noreferrer">
        	${getScoreDisplay(ecoScore, 'eco', isCompact ? 'icon' : 'full').replace('<svg', '<svg class="score-svg"')}
        </a>
        <a href="${openFoodFactsUrl}#panel_nova" target="_blank" rel="noopener noreferrer">
        	${getScoreDisplay(novaGroup, 'nova', isCompact ? 'icon' : 'full').replace('<svg', '<svg class="score-svg"')}
        </a>
      </div>
    </div>
  `;
  return infoElement;
}

/**
 * Creates a loading shimmer element
 */
export function createLoader(): HTMLElement {
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

/**
 * Processes a single product element by adding PanierClair info
 */
export function processProductElement(
  productElement: HTMLElement,
  productInfo: ProductInfo,
  isCompact: boolean,
  insertionStrategy: (element: HTMLElement, infoElement: HTMLElement) => void,
): void {
  if (productElement.dataset.processed) return;

  console.log('Product Info:', productInfo);
  const infoElement = createProductInfo(
    productInfo.barcode,
    productInfo.name,
    productInfo.nutriScore,
    productInfo.ecoScore,
    productInfo.novaGroup,
    isCompact,
  );

  // Add data attributes to product element for filtering
  const normalizedNutri = productInfo.nutriScore.toLowerCase();
  const normalizedEco = productInfo.ecoScore.toLowerCase(); // A+ becomes a+
  const normalizedNova = productInfo.novaGroup.toLowerCase();
  productElement.setAttribute('data-panierclair-nutriscore', normalizedNutri);
  productElement.setAttribute('data-panierclair-ecoscore', normalizedEco);
  productElement.setAttribute('data-panierclair-nova', normalizedNova);

  insertionStrategy(productElement, infoElement);
  productElement.dataset.processed = 'true';
}
