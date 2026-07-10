import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, buildWaLink, formatINR } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { MessageCircle, Truck, ShieldCheck, RotateCcw, ChevronDown } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { toast } from "sonner";

export const ProductDetail = () => {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [activeImage, setActiveImage] = useState(0);
  const [size, setSize] = useState(null);
  const [openAcc, setOpenAcc] = useState("size");
  const { addItem } = useCart();

  useEffect(() => {
    setProduct(null);
    setActiveImage(0);
    setSize(null);
    api.get(`/products/${slug}`).then((r) => {
      setProduct(r.data);
      api
        .get("/products", { params: { category: r.data.category } })
        .then((rr) => setRelated(rr.data.filter((p) => p.slug !== slug).slice(0, 4)));
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [slug]);

  if (!product) {
    return (
      <div className="container-x py-20">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-[3/4] bg-[#DDD5C4] animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 bg-[#DDD5C4] w-2/3 animate-pulse" />
            <div className="h-6 bg-[#DDD5C4] w-1/3 animate-pulse" />
            <div className="h-24 bg-[#DDD5C4] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const onAdd = () => {
    if (product.sizes?.length > 0 && !size) {
      toast.error("Please pick a size");
      return;
    }
    addItem(product, size);
    toast.success("Added to cart");
  };

  const waMsg = `Hi Rari Ethnic! I'd like to ask about "${product.name}" (${product.slug}). Is size ${size || "..."} available?`;

  return (
    <div className="bg-[#E8E3D7]">
      <div className="container-x py-6">
        <div className="text-sm text-[#6E7B85]">
          <Link to="/" className="hover:text-[#A0684E]">Home</Link>
          <span className="mx-2">/</span>
          <Link to={`/shop/${product.category}`} className="hover:text-[#A0684E] capitalize">
            {product.category}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[#2A2E30]">{product.name}</span>
        </div>
      </div>

      <div className="container-x pb-16">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-14">
          {/* Images */}
          <div>
            <div className="relative aspect-[3/4] bg-[#DDD5C4] overflow-hidden">
              <img
                src={product.images[activeImage]}
                alt={product.name}
                data-testid="product-main-image"
                className="w-full h-full object-cover"
              />
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 mt-3">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    data-testid={`product-thumb-${i}`}
                    className={`w-20 aspect-[3/4] overflow-hidden border-2 transition ${
                      activeImage === i ? "border-[#A0684E]" : "border-transparent"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="md:sticky md:top-24 md:self-start">
            {product.is_bestseller && (
              <span className="label-caps text-[#A0684E]">Bestseller</span>
            )}
            <h1 data-testid="product-name" className="font-display text-3xl sm:text-4xl lg:text-5xl leading-tight mt-2">
              {product.name}
            </h1>
            <div className="mt-3 flex items-baseline gap-3">
              <span data-testid="product-price" className="font-display text-2xl text-[#A0684E]">
                {formatINR(product.price)}
              </span>
              {product.compare_at_price && (
                <>
                  <span className="text-sm text-[#6E7B85] line-through">
                    {formatINR(product.compare_at_price)}
                  </span>
                  <span className="text-xs bg-[#B58D3E] text-[#2A2E30] px-2 py-0.5">
                    Save {formatINR(product.compare_at_price - product.price)}
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-[#6E7B85] mt-1">Inclusive of all taxes</p>

            <p className="mt-6 text-[#2A2E30]/85 leading-relaxed max-w-md">
              {product.description}
            </p>

            {product.stock <= 3 && product.stock > 0 && (
              <div className="mt-5 inline-flex items-center gap-2 bg-[#A0684E]/8 border border-[#A0684E]/20 px-3 py-1.5 rounded-sm">
                <span className="w-2 h-2 rounded-full bg-[#A0684E] pulse-dot" />
                <span className="text-sm text-[#A0684E] font-medium" data-testid="stock-urgency">
                  Only {product.stock} left in stock
                </span>
              </div>
            )}

            {/* Sizes */}
            {product.sizes?.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-3">
                  <span className="label-caps text-[#2A2E30]">Size</span>
                  <Link to="/size-guide" className="text-xs underline underline-offset-4 text-[#A0684E]">
                    Size guide
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      data-testid={`size-option-${s}`}
                      onClick={() => setSize(s)}
                      className={`min-w-[46px] h-11 px-3 border text-sm transition ${
                        size === s
                          ? "bg-[#2A2E30] text-[#E8E3D7] border-[#2A2E30]"
                          : "border-[#2A2E30]/25 hover:border-[#2A2E30]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-8 space-y-3">
              <button
                data-testid="add-to-cart-button"
                onClick={onAdd}
                className="w-full bg-[#A0684E] text-[#E8E3D7] py-4 rounded-sm text-sm uppercase tracking-widest hover:bg-[#8C4A3B] transition-colors"
              >
                Add to Cart · {formatINR(product.price)}
              </button>
              <a
                href={buildWaLink(waMsg)}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="whatsapp-ask-button"
                className="w-full flex items-center justify-center gap-2 border border-[#25D366] text-[#25D366] py-4 rounded-sm text-sm uppercase tracking-widest hover:bg-[#25D366] hover:text-[#E8E3D7] transition-colors"
              >
                <MessageCircle size={16} /> Ask about this piece
              </a>
            </div>

            {/* Trust strip */}
            <div className="mt-8 grid grid-cols-3 gap-2 py-4 border-y border-[#2A2E30]/10 text-[11px] text-[#6E7B85]">
              <div className="flex flex-col items-center gap-1 text-center">
                <Truck size={16} className="text-[#A0684E]" />
                <span>Pan-India shipping</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <ShieldCheck size={16} className="text-[#A0684E]" />
                <span>COD available</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <RotateCcw size={16} className="text-[#A0684E]" />
                <span>7-day easy exchange</span>
              </div>
            </div>

            {/* Accordions */}
            <div className="mt-8 border-t border-[#2A2E30]/10">
              <Acc
                id="size"
                title="Fit & Size Notes"
                open={openAcc === "size"}
                onToggle={() => setOpenAcc(openAcc === "size" ? null : "size")}
              >
                <p>{product.fit_notes}</p>
                <p className="mt-2 text-[#6E7B85]">
                  Available sizes: {product.sizes.join(", ")}
                </p>
              </Acc>
              <Acc
                id="fabric"
                title="Fabric & Care"
                open={openAcc === "fabric"}
                onToggle={() => setOpenAcc(openAcc === "fabric" ? null : "fabric")}
              >
                <p><strong className="text-[#2A2E30]">Fabric.</strong> {product.fabric}</p>
                <p className="mt-2"><strong className="text-[#2A2E30]">Care.</strong> {product.care}</p>
              </Acc>
              <Acc
                id="occ"
                title="Occasions"
                open={openAcc === "occ"}
                onToggle={() => setOpenAcc(openAcc === "occ" ? null : "occ")}
              >
                <div className="flex flex-wrap gap-2">
                  {product.occasion?.map((o) => (
                    <span key={o} className="text-xs bg-[#DDD5C4] px-2.5 py-1 rounded-sm">
                      {o}
                    </span>
                  ))}
                </div>
              </Acc>
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-24">
            <div className="flex items-end justify-between mb-8">
              <div>
                <span className="label-caps text-[#A0684E]">Complete the look</span>
                <h2 className="font-display text-3xl mt-2">You may also love</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {related.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Acc = ({ title, open, onToggle, children }) => (
  <div className="border-b border-[#2A2E30]/10">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-4 text-left"
    >
      <span className="font-display text-lg">{title}</span>
      <ChevronDown
        size={16}
        className={`transition-transform text-[#6E7B85] ${open ? "rotate-180" : ""}`}
      />
    </button>
    {open && <div className="pb-4 text-sm text-[#2A2E30]/80 leading-relaxed">{children}</div>}
  </div>
);

export default ProductDetail;
