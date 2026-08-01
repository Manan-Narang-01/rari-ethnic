from pydantic import BaseModel, ConfigDict


class ImageCrop(BaseModel):
    """Crop rectangle as percentages of the original image (0-100), matching
    react-easy-crop's onCropComplete `croppedArea` output exactly so the admin
    editor and the stored value never need lossy conversion. Absent/None means
    the image renders uncropped (plain object-fit: cover) -- a crop is only
    ever written when an admin explicitly saves one, never computed or
    guessed automatically."""

    model_config = ConfigDict(extra="ignore")

    x: float = 0
    y: float = 0
    width: float = 100
    height: float = 100
