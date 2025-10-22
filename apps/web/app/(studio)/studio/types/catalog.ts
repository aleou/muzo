export type Orientation = 'portrait' | 'landscape';

export type ProductCategory = {
  id: string;
  name: string;
  description: string;
  icon: string;
  orientations: Orientation[];
  productCount: number;
  products: CatalogProduct[];
};

export type CatalogProduct = {
  id: string;
  name: string;
  note?: string;
  category: string;
  fromPrice?: string;
  currency: string;
  options: ProductOption[];
  specs: ProductSpec[];
};

export type ProductOption = {
  reference: string;
  note?: string;
  type: string;
  default?: number;
};

export type ProductSpec = {
  note?: string;
  value: string;
};

export type CatalogResponse = {
  categories: ProductCategory[];
  orientation: Orientation | null;
};
