import { HeroSection } from "./HeroSection";
import { CountdownSection } from "./CountdownSection";
import { ShlokaSection } from "./ShlokaSection";
import { ProductGridSection } from "./ProductGridSection";
import { AttributeGridSection } from "./AttributeGridSection";
import { UrgencyBannerSection } from "./UrgencyBannerSection";
import { RichTextSection } from "./RichTextSection";
import { ImageGallerySection } from "./ImageGallerySection";
import { FaqAccordionSection } from "./FaqAccordionSection";

const SECTION_COMPONENTS = {
  hero: HeroSection,
  countdown: CountdownSection,
  shloka: ShlokaSection,
  product_grid: ProductGridSection,
  attribute_grid: AttributeGridSection,
  urgency_banner: UrgencyBannerSection,
  rich_text: RichTextSection,
  image_gallery: ImageGallerySection,
  faq_accordion: FaqAccordionSection,
};

export const SectionRenderer = ({ section, campaign }) => {
  const Component = SECTION_COMPONENTS[section.type];
  if (!Component || section.enabled === false) return null;
  return <Component config={section.config || {}} theme={campaign.theme} campaign={campaign} />;
};

export default SectionRenderer;
