import { HeroSectionEditor } from "./HeroSectionEditor";
import { CountdownSectionEditor } from "./CountdownSectionEditor";
import { ShlokaSectionEditor } from "./ShlokaSectionEditor";
import { ProductGridSectionEditor } from "./ProductGridSectionEditor";
import { AttributeGridSectionEditor } from "./AttributeGridSectionEditor";
import { UrgencyBannerSectionEditor } from "./UrgencyBannerSectionEditor";
import { RichTextSectionEditor } from "./RichTextSectionEditor";
import { ImageGallerySectionEditor } from "./ImageGallerySectionEditor";
import { FaqAccordionSectionEditor } from "./FaqAccordionSectionEditor";

const EDITORS = {
  hero: HeroSectionEditor,
  countdown: CountdownSectionEditor,
  shloka: ShlokaSectionEditor,
  product_grid: ProductGridSectionEditor,
  attribute_grid: AttributeGridSectionEditor,
  urgency_banner: UrgencyBannerSectionEditor,
  rich_text: RichTextSectionEditor,
  image_gallery: ImageGallerySectionEditor,
  faq_accordion: FaqAccordionSectionEditor,
};

export const SectionEditor = ({ section, onChange }) => {
  const Editor = EDITORS[section.type];
  if (!Editor) return <p className="text-sm text-[#7E1F35]">Unknown section type "{section.type}".</p>;
  return <Editor config={section.config || {}} onChange={(config) => onChange({ ...section, config })} />;
};

export default SectionEditor;
