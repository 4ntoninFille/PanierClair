/**
 * Common types and interfaces used across the PanierClair extension
 */

export interface ProductInfo {
  barcode: string;
  name: string;
  nutriScore: string;
  ecoScore: string;
}

export interface ProductWithBarcode {
  productElement: HTMLElement;
  barcode: string;
}

export interface ProductResponse {
  products: ProductInfo[];
}

export interface ChromeMessage {
  type: string;
  enabled?: boolean;
  barcodes?: string[];
}

export interface StorageResult {
  panierclairEnabled?: boolean;
}

export type ScoreType = 'nutriscore' | 'ecoscore';

export interface ScoreImageConfig {
  type: ScoreType;
  score: string;
}
