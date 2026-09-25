import { Helmet } from "react-helmet-async";

const SITE_NAME = "Rari Ethnic";
const DEFAULT_IMAGE = "/brand/logo.png";

// Single place every page sets its own <title>/description/canonical/OG/
// Twitter tags and (optionally) JSON-LD structured data, via react-helmet-async
// mutating the real document.head after mount -- this app is a CRA SPA with
// no server-side rendering, so per-route <head> tags don't exist until this
// runs; see docs/DEPLOYMENT.md and this component's own callers for the
// per-page copy.
export const Seo = ({ title, description, image, type = "website", noindex = false, jsonLd }) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Handcrafted Ethnic from Surat`;
  const canonical = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : undefined;
  const ogImage = image
    ? image.startsWith("http")
      ? image
      : `${typeof window !== "undefined" ? window.location.origin : ""}${image}`
    : `${typeof window !== "undefined" ? window.location.origin : ""}${DEFAULT_IMAGE}`;
  const jsonLdList = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {canonical && <link rel="canonical" href={canonical} />}
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow"} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      {canonical && <meta property="og:url" content={canonical} />}
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={ogImage} />

      {jsonLdList.map((data, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
};

export default Seo;
