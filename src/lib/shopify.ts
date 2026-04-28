export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  images: {
    edges: Array<{
      node: {
        url: string;
        altText: string | null;
      };
    }>;
  };
}

const PRODUCTS_QUERY = `
  query GetProducts($first: Int!) {
    products(first: $first, sortKey: BEST_SELLING) {
      edges {
        node {
          id
          title
          handle
          description
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 1) {
            edges {
              node {
                url
                altText
              }
            }
          }
        }
      }
    }
  }
`;

const MOCK_PRODUCTS: ShopifyProduct[] = [
  {
    id: "mock-1",
    title: "Plecak dziecięcy z odblaskami",
    handle: "plecak-dzieciecy",
    description: "Lekki plecak dla dzieci w wieku 3-8 lat, z odblaskami i regulowanymi szelkami.",
    priceRange: { minVariantPrice: { amount: "79.00", currencyCode: "PLN" } },
    images: { edges: [{ node: { url: "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=400&h=400&fit=crop", altText: "Plecak dziecięcy" } }] },
  },
  {
    id: "mock-2",
    title: "Kask rowerowy dla dzieci",
    handle: "kask-rowerowy",
    description: "Certyfikowany kask rowerowy EN 1078, regulowany, rozmiary S/M.",
    priceRange: { minVariantPrice: { amount: "129.00", currencyCode: "PLN" } },
    images: { edges: [{ node: { url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop", altText: "Kask rowerowy" } }] },
  },
  {
    id: "mock-3",
    title: "Zestaw farb do malowania palcami",
    handle: "farby-palce",
    description: "Bezpieczne, zmywalne farby do malowania palcami — 12 kolorów, idealne od 1. roku życia.",
    priceRange: { minVariantPrice: { amount: "49.00", currencyCode: "PLN" } },
    images: { edges: [{ node: { url: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=400&fit=crop", altText: "Farby dla dzieci" } }] },
  },
  {
    id: "mock-4",
    title: "Mata piankowa do zabawy",
    handle: "mata-piankowa",
    description: "Dwustronna mata piankowa 180×200 cm, grubość 1,5 cm, antypoślizgowa.",
    priceRange: { minVariantPrice: { amount: "199.00", currencyCode: "PLN" } },
    images: { edges: [{ node: { url: "https://images.unsplash.com/photo-1566454825481-9c31e24f8b91?w=400&h=400&fit=crop", altText: "Mata piankowa" } }] },
  },
  {
    id: "mock-5",
    title: "Butelka termiczna dla dzieci",
    handle: "butelka-termiczna",
    description: "Stalowa butelka termiczna 350 ml, utrzymuje temperaturę 12h, BPA-free.",
    priceRange: { minVariantPrice: { amount: "59.00", currencyCode: "PLN" } },
    images: { edges: [{ node: { url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop", altText: "Butelka termiczna" } }] },
  },
  {
    id: "mock-6",
    title: "Gra planszowa dla całej rodziny",
    handle: "gra-planszowa",
    description: "Klasyczna gra strategiczna dla 2-6 graczy, wiek 6+, czas gry ok. 45 minut.",
    priceRange: { minVariantPrice: { amount: "89.00", currencyCode: "PLN" } },
    images: { edges: [{ node: { url: "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=400&h=400&fit=crop", altText: "Gra planszowa" } }] },
  },
  {
    id: "mock-7",
    title: "Krem z filtrem SPF 50+ dla dzieci",
    handle: "krem-spf-dzieci",
    description: "Wodoodporny krem słoneczny dla dzieci od 6. miesiąca życia, hipoalergiczny.",
    priceRange: { minVariantPrice: { amount: "39.00", currencyCode: "PLN" } },
    images: { edges: [{ node: { url: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=400&fit=crop", altText: "Krem SPF" } }] },
  },
  {
    id: "mock-8",
    title: "Skakanki ze zliczaniem obrotów",
    handle: "skakanki",
    description: "Regulowana skakanka z licznikiem obrotów i ergonomicznymi uchwytami.",
    priceRange: { minVariantPrice: { amount: "29.00", currencyCode: "PLN" } },
    images: { edges: [{ node: { url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop", altText: "Skakanki" } }] },
  },
];

export async function getShopifyProducts(limit = 8): Promise<ShopifyProduct[]> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN;

  if (!domain || !token || domain === "your-store.myshopify.com") {
    return MOCK_PRODUCTS.slice(0, limit);
  }

  try {
    const res = await fetch(`https://${domain}/api/2024-01/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": token,
      },
      body: JSON.stringify({ query: PRODUCTS_QUERY, variables: { first: limit } }),
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];

    const json = await res.json();
    return json?.data?.products?.edges?.map((e: { node: ShopifyProduct }) => e.node) ?? [];
  } catch {
    return [];
  }
}

export function formatPrice(amount: string, currencyCode: string): string {
  const num = parseFloat(amount);
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: currencyCode }).format(num);
}
