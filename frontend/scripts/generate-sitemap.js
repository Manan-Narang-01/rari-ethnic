#!/usr/bin/env node
/**
 * Generates public/sitemap.xml from live data. This is a CRA static-build
 * app with no server, so a sitemap can't be produced per-request -- it has
 * to be a file baked in at build time instead. Run before each production
 * build/deploy (`yarn sitemap`), pointed at the real backend and site URL:
 *
 *   SITE_URL=https://yourdomain.com REACT_APP_BACKEND_URL=https://api.yourdomain.com yarn sitemap
 *
 * Never run automatically as part of `yarn start`/`yarn build` -- it needs a
 * reachable backend, which local dev may not always have, and the generated
 * file is meant to reflect the production catalog, not whatever's in a
 * developer's local database.
 */
const fs = require("fs");
const path = require("path");

const SITE_URL = (process.env.SITE_URL || "https://example.com").replace(/\/$/, "");
const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "http://localhost:8001").replace(/\/$/, "");
const API = `${BACKEND_URL}/api`;

if (!process.env.SITE_URL) {
  console.warn(`SITE_URL not set -- using placeholder "${SITE_URL}". Set SITE_URL to your real domain before deploying this sitemap.`);
}

const STATIC_ROUTES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.5" },
  { path: "/contact", changefreq: "monthly", priority: "0.4" },
  { path: "/size-guide", changefreq: "monthly", priority: "0.4" },
];

const xmlEscape = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const urlEntry = ({ loc, lastmod, changefreq, priority }) => `  <url>
    <loc>${xmlEscape(loc)}</loc>
${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ""}    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

async function main() {
  const entries = STATIC_ROUTES.map((r) => urlEntry({ loc: `${SITE_URL}${r.path}`, changefreq: r.changefreq, priority: r.priority }));

  const [categories, products, activeCampaign] = await Promise.all([
    fetch(`${API}/categories`).then((r) => r.json()).catch(() => []),
    fetch(`${API}/products`).then((r) => r.json()).catch(() => []),
    fetch(`${API}/campaigns/active`).then((r) => r.json()).catch(() => null),
  ]);

  for (const c of categories) {
    entries.push(urlEntry({ loc: `${SITE_URL}/shop/${c.key}`, changefreq: "weekly", priority: "0.8" }));
  }
  for (const p of products) {
    entries.push(urlEntry({
      loc: `${SITE_URL}/product/${p.slug}`,
      lastmod: p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : undefined,
      changefreq: "weekly",
      priority: "0.7",
    }));
  }
  if (activeCampaign) {
    entries.push(urlEntry({ loc: `${SITE_URL}/navratri`, changefreq: "daily", priority: "0.9" }));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;

  const outPath = path.join(__dirname, "..", "public", "sitemap.xml");
  fs.writeFileSync(outPath, xml, "utf8");
  console.log(`Wrote ${outPath} with ${STATIC_ROUTES.length} static + ${categories.length} category + ${products.length} product URLs${activeCampaign ? " + 1 active event" : ""}.`);
}

main().catch((err) => {
  console.error("Sitemap generation failed:", err);
  process.exit(1);
});
