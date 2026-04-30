import type { ShopifyProduct } from "@/lib/shopify";
import { formatPrice } from "@/lib/shopify";
import { ImageWithFallback } from "./image-with-fallback";
import { ShoppingCart } from "lucide-react";

interface ShopifyProductCardProps {
  product: ShopifyProduct;
  storeUrl: string;
}

export function ShopifyProductCard({ product, storeUrl }: ShopifyProductCardProps) {
  const image = product.images.edges[0]?.node;
  const price = formatPrice(
    product.priceRange.minVariantPrice.amount,
    product.priceRange.minVariantPrice.currencyCode
  );
  const href = `${storeUrl}/products/${product.handle}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-xl border border-border bg-white shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
    >
      <div className="relative aspect-square bg-accent overflow-hidden">
        {image ? (
          <ImageWithFallback
            src={image.url}
            alt={image.altText || product.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-muted-foreground/20">
            🛍️
          </div>
        )}
      </div>
      <div className="flex flex-col flex-1 p-3">
        <h3 className="font-heading font-bold text-[13px] text-foreground leading-snug group-hover:text-[#e60100] transition-colors duration-150 line-clamp-2 mb-1">
          {product.title}
        </h3>
        {product.description && (
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 flex-1">
            {product.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/60">
          <span className="text-[13px] font-bold text-foreground">{price}</span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-[#e60100] px-2.5 py-1 text-[10px] font-semibold text-white">
            <ShoppingCart size={10} />
            Kup
          </span>
        </div>
      </div>
    </a>
  );
}
