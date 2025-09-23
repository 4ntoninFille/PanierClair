/**
 * Shared UI components for the PanierClair extension
 */

import { ProductInfo } from './types';
import { getScoreDisplay, createOpenFoodFactsURL } from './utils';

/**
 * Creates the product info element with scores and OpenFoodFacts link
 */
export function createProductInfo(barcode: string, name: string, nutriScore: string, ecoScore: string): HTMLElement {
  const infoElement = document.createElement('div');
  infoElement.className = 'panierclair-info';
  infoElement.style.cssText = `
    background-color: #f0f0f0;
    padding: 10px 24px 10px 10px; /* reduced right padding for ? link */
    margin-top: 10px;
    border-radius: 5px;
    width: 100%;
    box-sizing: border-box;
    position: relative;
    min-height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  // Add responsive SVG style and interrogation link style
  const style = document.createElement('style');
  style.textContent = `
    .panierclair-info { position: relative; }
    .panierclair-info .score-svg, .panierclair-info .score-row img {
      max-width: 100px;
      max-height: 60px;
      min-width: 24px;
      min-height: 16px;
      width: auto;
      height: auto;
      box-sizing: border-box;
      display: block;
      transition: max-width 0.2s, max-height 0.2s;
      flex-shrink: 1;
      vertical-align: middle;
      aspect-ratio: auto;
      object-fit: contain;
      margin-bottom: 0 !important;
    }
    .panierclair-info .score-row {
      max-width: calc(100% - 24px); /* leave less space for ? link */
      width: 100%;
      display: flex;
      gap: 12px;
      align-items: center; /* vertical center alignment */
      justify-content: flex-start;
      overflow: hidden;
      flex-wrap: nowrap;
    }
    .panierclair-info .interrogation-link {
      position: absolute;
      top: 8px;
      right: 8px;
      color: #00A248 !important;
      text-decoration: none;
      font-size: 18px;
      font-weight: bold;
      z-index: 2;
      background: #fff;
      border-radius: 50%;
      padding: 2px 8px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
    }
    @media (max-width: 400px) {
      .panierclair-info {
        padding-right: 18px !important;
      }
      .panierclair-info .score-svg, .panierclair-info .score-row img {
        max-width: 40px;
        max-height: 28px;
        min-width: 20px;
        min-height: 14px;
        width: auto;
        height: auto;
      }
      .panierclair-info .interrogation-link {
        font-size: 16px;
        top: 4px;
        right: 4px;
        padding: 1px 6px;
      }
      .panierclair-info .score-row {
        max-width: calc(100% - 18px);
      }
    }
    @media (max-width: 320px) {
      .panierclair-info {
        padding-right: 12px !important;
      }
      .panierclair-info .score-svg, .panierclair-info .score-row img {
        max-width: 28px;
        max-height: 18px;
        min-width: 14px;
        min-height: 10px;
        width: auto;
        height: auto;
      }
      .panierclair-info .score-row {
        max-width: calc(100% - 12px);
      }
    }
  `;
  infoElement.appendChild(style);

  // Create OpenFoodFacts URL
  const openFoodFactsUrl = createOpenFoodFactsURL(barcode);

  // Interrogation link outside score container
  const interrogationLink = `<a href="${openFoodFactsUrl}" target="_blank" rel="noopener noreferrer" class="interrogation-link">?</a>`;

  infoElement.innerHTML += `
    ${interrogationLink}
    <div style="width: 100%; display: flex; flex-direction: row; align-items: center; justify-content: flex-start; position: relative;">
      <div class="score-row">
        ${getScoreDisplay(nutriScore, false).replace('<svg', '<svg class="score-svg"')}
        ${getScoreDisplay(ecoScore, true).replace('<svg', '<svg class="score-svg"')}
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
  insertionStrategy: (element: HTMLElement, infoElement: HTMLElement) => void,
): void {
  if (productElement.dataset.processed) return;

  console.log('Product Info:', productInfo);
  const infoElement = createProductInfo(
    productInfo.barcode,
    productInfo.name,
    productInfo.nutriScore,
    productInfo.ecoScore,
  );

  insertionStrategy(productElement, infoElement);
  productElement.dataset.processed = 'true';
}
