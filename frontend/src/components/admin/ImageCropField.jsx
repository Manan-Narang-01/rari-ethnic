import { useState, useCallback, useRef } from "react";
import Cropper from "react-easy-crop";
import { uploadImage } from "@/lib/api";
import { toast } from "sonner";
import { ImageUp, Loader2, Crop as CropIcon, RotateCcw } from "lucide-react";
import { CroppedImage } from "@/components/CroppedImage";

// Shared image field for every image-upload spot in the Admin Dashboard:
// paste-a-URL / upload-from-computer (unchanged from before), plus an
// Instagram-style crop/zoom editor. The crop is stored as {x, y, width,
// height} percentages of the original image (see backend
// app/models/image_crop.py) and is only ever written when the admin
// explicitly clicks Save in the editor -- never computed automatically.
//
// `aspect` is the width/height ratio of the box this image will actually be
// displayed in on the live site (e.g. 1 for a square tile, 3/4 for a
// portrait banner) -- pass the real value so what the admin sees while
// cropping matches the live result.
export const ImageCropField = ({ label, value, onChange, crop, onCropChange, aspect = 1 }) => {
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftPosition, setDraftPosition] = useState({ x: 0, y: 0 });
  const [draftZoom, setDraftZoom] = useState(1);
  const [pendingCrop, setPendingCrop] = useState(null);
  // react-easy-crop re-fires onCropComplete whenever its controlled crop/zoom
  // props change -- including the ones we set programmatically on reset --
  // which would otherwise silently overwrite the intentional `null` below.
  const suppressNextCropComplete = useRef(false);

  const applyNewImage = (url) => {
    onChange(url);
    onCropChange?.(null); // a new image invalidates any crop chosen for the old one
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      applyNewImage(url);
      toast.success("Image uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const openEditor = () => {
    setDraftPosition({ x: 0, y: 0 });
    setDraftZoom(1);
    setPendingCrop(crop || null);
    setEditing(true);
  };

  const onCropComplete = useCallback((croppedAreaPercent) => {
    if (suppressNextCropComplete.current) {
      suppressNextCropComplete.current = false;
      return;
    }
    setPendingCrop({
      x: croppedAreaPercent.x,
      y: croppedAreaPercent.y,
      width: croppedAreaPercent.width,
      height: croppedAreaPercent.height,
    });
  }, []);

  const save = () => {
    onCropChange?.(pendingCrop);
    setEditing(false);
  };

  const resetCrop = () => {
    suppressNextCropComplete.current = true;
    setPendingCrop(null);
    setDraftPosition({ x: 0, y: 0 });
    setDraftZoom(1);
  };

  return (
    <div>
      <label className="label-caps">{label}</label>
      <div className="flex gap-4 items-start mt-1">
        {value && (
          <div className="relative w-28 overflow-hidden rounded-sm bg-[#DDD5C4] shrink-0" style={{ aspectRatio: aspect }}>
            <CroppedImage src={value} crop={crop} alt="" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <input
            value={value ?? ""}
            onChange={(e) => applyNewImage(e.target.value)}
            placeholder="Paste an image URL, or upload one below"
            className="w-full border-b border-[#8B9A9F]/40 bg-transparent py-2 outline-none focus:border-[#A0684E] text-sm"
          />
          <div className="mt-1.5 flex items-center gap-4 flex-wrap">
            <label className="inline-flex items-center gap-1.5 text-xs text-[#A0684E] cursor-pointer">
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImageUp size={13} />}
              {uploading ? "Uploading…" : "Choose file…"}
              <input type="file" accept="image/*" onChange={onFile} className="hidden" />
            </label>
            {value && (
              <button
                type="button"
                onClick={openEditor}
                className="inline-flex items-center gap-1.5 text-xs text-[#A0684E] hover:text-[#8C4A3B]"
              >
                <CropIcon size={13} /> Adjust crop
              </button>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-[#2A2E30]/80 flex items-center justify-center p-4">
          <div className="bg-[#E8E3D7] rounded-sm w-full max-w-lg p-5">
            <p className="label-caps mb-3">Adjust crop</p>
            <div className="relative w-full h-72 sm:h-80 bg-[#2A2E30] rounded-sm overflow-hidden">
              <Cropper
                image={value}
                crop={draftPosition}
                zoom={draftZoom}
                aspect={aspect}
                onCropChange={setDraftPosition}
                onZoomChange={setDraftZoom}
                onCropComplete={(_areaPixels, areaPercent) => onCropComplete(areaPercent)}
              />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-xs text-[#6E7B85] w-10 shrink-0">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={draftZoom}
                onChange={(e) => setDraftZoom(Number(e.target.value))}
                className="w-full accent-[#A0684E]"
              />
            </div>
            <div className="mt-5 flex flex-wrap justify-between gap-2">
              <button
                type="button"
                onClick={resetCrop}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-[#6E7B85] hover:text-[#2A2E30]"
              >
                <RotateCcw size={13} /> Reset to uncropped
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 border border-[#8B9A9F]/40 rounded-sm text-xs uppercase tracking-widest hover:bg-[#DDD5C4]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={save}
                  className="px-4 py-2 bg-[#A0684E] text-[#E8E3D7] rounded-sm text-xs uppercase tracking-widest hover:bg-[#8C4A3B]"
                >
                  Save crop
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageCropField;
