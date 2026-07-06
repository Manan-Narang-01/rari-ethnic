import { Link } from "react-router-dom";
import { formatINR } from "@/lib/api";

export const ProductCard = ({ product, index = 0 }) => {
  const primary = product.images?.[0];
  const secondary = product.images?.[1] || primary;
  const discount =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round(
          ((product.compare_at_price - product.price) / product.compare_at_price) * 100
        )
      : null;

  return (
    <Link
      to={`/product/${product.slug}`}
      data-testid={`product-card-${product.slug}`}
      className="group block fade-up"
      style={{ animationDelay: `${Math.min(index * 60, 300)}ms` }}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-[#F3EDE4]">
        <img
          src={primary}
          alt={product.name}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 group-hover:opacity-0"
        />
        <img
          src={secondary}
          alt=""
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.is_new && (
            <span className="bg-[#185D64] text-[#FAF6F0] label-caps px-2 py-0.5 text-[10px]">
              New
            </span>
          )}
          {product.is_bestseller && (
            <span className="bg-[#7E1F35] text-[#FAF6F0] label-caps px-2 py-0.5 text-[10px]">
              Bestseller
            </span>
          )}
          {discount && (
            <span className="bg-[#DCA537] text-[#2B211E] label-caps px-2 py-0.5 text-[10px]">
              {discount}% off
            </span>
          )}
        </div>
        {product.stock <= 3 && product.stock > 0 && (
          <div className="absolute bottom-3 left-3 bg-[#FAF6F0]/95 backdrop-blur-sm px-2.5 py-1 rounded-sm flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7E1F35] pulse-dot" />
            <span className="text-[11px] font-medium text-[#7E1F35]">
              Only {product.stock} left
            </span>
          </div>
        )}
      </div>
      <div className="mt-4 text-left space-y-1">
        <h3 className="font-display text-lg sm:text-xl leading-tight text-[#2B211E] group-hover:text-[#7E1F35] transition-colors">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="font-body font-medium text-[#2B211E]">
            {formatINR(product.price)}
          </span>
          {product.compare_at_price && (
            <span className="text-xs text-[#6B5B55] line-through">
              {formatINR(product.compare_at_price)}
            </span>
          )}
        </div>
        {product.fabric && (
          <p className="text-xs text-[#6B5B55] font-body line-clamp-1">
            {product.fabric}
          </p>
        )}
      </div>
    </Link>
  );
};
