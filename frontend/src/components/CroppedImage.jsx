// Renders an image respecting an optional admin-set crop ({x, y, width,
// height} as percentages of the original image, matching react-easy-crop's
// onCropComplete output exactly -- see backend app/models/image_crop.py).
// With no crop, it's a plain <img className="object-cover">, identical to
// the site's default behavior. Must be placed inside a `relative
// overflow-hidden` container that defines the visible tile's size/aspect --
// same contract as a plain <img class="w-full h-full object-cover">.
const FALLBACK_SRC = "/brand/logo-transparent.png";
const onImgError = (e) => {
  if (e.currentTarget.src.endsWith(FALLBACK_SRC)) return; // avoid a loop if the fallback itself 404s
  e.currentTarget.src = FALLBACK_SRC;
};

export const CroppedImage = ({ src, crop, alt = "", className = "", loading = "lazy" }) => {
  if (!crop) {
    return <img src={src} alt={alt} loading={loading} onError={onImgError} className={`w-full h-full object-cover ${className}`} />;
  }

  const scaleX = 100 / crop.width;
  const scaleY = 100 / crop.height;

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      onError={onImgError}
      className={`absolute ${className}`}
      style={{
        width: `${scaleX * 100}%`,
        height: `${scaleY * 100}%`,
        left: `${-crop.x * scaleX}%`,
        top: `${-crop.y * scaleY}%`,
        maxWidth: "none",
        maxHeight: "none",
      }}
    />
  );
};

export default CroppedImage;
