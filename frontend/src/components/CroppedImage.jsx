// Renders an image respecting an optional admin-set crop ({x, y, width,
// height} as percentages of the original image, matching react-easy-crop's
// onCropComplete output exactly -- see backend app/models/image_crop.py).
// With no crop, it's a plain <img className="object-cover">, identical to
// the site's default behavior. Must be placed inside a `relative
// overflow-hidden` container that defines the visible tile's size/aspect --
// same contract as a plain <img class="w-full h-full object-cover">.
export const CroppedImage = ({ src, crop, alt = "", className = "" }) => {
  if (!crop) {
    return <img src={src} alt={alt} className={`w-full h-full object-cover ${className}`} />;
  }

  const scaleX = 100 / crop.width;
  const scaleY = 100 / crop.height;

  return (
    <img
      src={src}
      alt={alt}
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
