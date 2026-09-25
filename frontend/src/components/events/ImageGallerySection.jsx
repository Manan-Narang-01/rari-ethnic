import { CroppedImage } from "@/components/CroppedImage";
import { eventTheme } from "./theme";

export const ImageGallerySection = ({ config, theme }) => {
  const t = eventTheme(theme);
  const images = config.images || [];
  if (images.length === 0) return null;

  return (
    <section className={`container-x py-16 border-t ${t.divider}`}>
      {config.heading && (
        <h2 className="font-display text-3xl sm:text-4xl text-center mb-10">{config.heading}</h2>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {images.map((img, i) => (
          <div key={i} className="relative aspect-square overflow-hidden rounded-sm fade-up" style={{ animationDelay: `${i * 60}ms` }}>
            <CroppedImage src={img.image} crop={img.image_crop} alt={img.caption || ""} />
            {img.caption && (
              <div className={`absolute inset-x-0 bottom-0 ${t.festive ? "bg-[#2A0A12]/80" : "bg-[#2A2E30]/70"} text-white text-xs px-3 py-2`}>
                {img.caption}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default ImageGallerySection;
