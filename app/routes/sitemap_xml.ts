import type { Route } from "./+types/sitemap_xml";

type Package = {
  name: string;
  latest_version: string;
};

export async function loader({
  request,
  context,
}: Route.LoaderArgs): Promise<Response> {
  const db = context.cloudflare.env.DB;
  const { results } = await db
    .prepare("SELECT name, latest_version FROM packages")
    .all<Package>();

  const urls = results.map(
    ({ name, latest_version }) =>
      `<url><loc>https://${new URL(request.url).hostname}/package/${name}/${latest_version}</loc></url>`,
  );

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://${new URL(request.url).hostname}/</loc></url>
${urls.join("\n")}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=300",
    },
  });
}
