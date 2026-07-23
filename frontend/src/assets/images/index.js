// Central manifest for locally-bundled content images (as opposed to
// product photos, which are admin-uploaded and served from object storage).
// Import everything here once, then reference `images.*` from components --
// no component should import an image file directly. To add an image: drop
// the file under the matching folder, import it below, and add one entry.
import homeHero from "./home/hero.jpg";
import homeCategoryKurtis from "./home/category-kurtis.jpg";
import homeCategorySuits from "./home/category-suits.jpg";
import homeCategoryLehengas from "./home/category-lehengas.jpg";
import homeInstagram1 from "./home/instagram-1.jpg";
import homeInstagram2 from "./home/instagram-2.jpg";
import homeInstagram3 from "./home/instagram-3.jpg";
import homeInstagram4 from "./home/instagram-4.jpg";

import aboutStory from "./about/story.jpg";
import aboutFabric from "./about/fabric.jpg";

import navratriHero from "./navratri/hero.jpg";
import navratriHeroSecondary from "./navratri/hero-secondary.jpg";

export const images = {
  home: {
    hero: homeHero,
    categories: {
      kurtis: homeCategoryKurtis,
      suits: homeCategorySuits,
      lehengas: homeCategoryLehengas,
    },
    instagram: [homeInstagram1, homeInstagram2, homeInstagram3, homeInstagram4],
  },
  about: {
    story: aboutStory,
    fabric: aboutFabric,
  },
  navratri: {
    hero: navratriHero,
    heroSecondary: navratriHeroSecondary,
  },
};

export default images;
