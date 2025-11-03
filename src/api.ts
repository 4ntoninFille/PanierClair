const BASE_URL = 'https://aletheia-server-1038641305939.europe-west9.run.app/api/v1/aletheia/products';

export type ProductInfo = {
  barcode: string;
  name: string;
  nutriScore: string;
  ecoScore: string;
  novaGroup: string;
};

const convertProductInfo = (data: {
  code: string;
  product_name: string;
  nutriscore_grade: string;
  ecoscore_grade: string;
  nova_group: string;
}): ProductInfo => {
  return {
    barcode: data.code,
    name: data.product_name,
    nutriScore: data.nutriscore_grade || 'Na',
    ecoScore: data.ecoscore_grade || 'Na',
    novaGroup: data.nova_group || 'Na',
  };
};

export async function getProductInfo(barcode: string): Promise<ProductInfo> {
  const url = `${BASE_URL}/${barcode}`;
  console.log('API call to URL: ', url);
  const response = await fetch(url);
  const data = await response.json();
  return convertProductInfo(data);
}

export async function getProductsInfo(barcodes: string[]): Promise<{ products_info: ProductInfo[] }> {
  const url = `${BASE_URL}/search`;
  console.log('API call to URL: ', url);
  console.log('length ', barcodes.length);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ products: barcodes }),
  });
  const data = await response.json();
  console.log('resp ', data.products_info);
  return {
    products_info: data.products_info.map(convertProductInfo),
  };
  return data;
}
