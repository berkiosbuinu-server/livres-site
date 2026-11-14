import { NextResponse } from "next/server";
import catalogue from "@/lib/catalogue.json";

export const revalidate = 300;

type GithubAsset = { name: string; browser_download_url: string; size: number; content_type: string };
type GithubRelease = { id: number; name: string | null; tag_name: string; body: string | null; published_at: string | null; created_at: string; draft: boolean; assets: GithubAsset[] };

const REPO = process.env.GITHUB_REPOSITORY || "berkiosbuinu-server/livres";
const PER_PAGE = 25;
const COVER_RE = /\.(png|jpe?g|webp)$/i;

async function fetchAllReleases(): Promise<GithubRelease[]> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  // Jeton facultatif : évite la limite de 60 requêtes/heure de l'API publique GitHub.
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const all: GithubRelease[] = [];
  for (let p = 1; p <= 10; p++) {
    const response = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100&page=${p}`, { headers, next: { revalidate: 300 } });
    if (!response.ok) throw new Error(String(response.status));
    const chunk = (await response.json()) as GithubRelease[];
    all.push(...chunk);
    if (chunk.length < 100) break;
  }
  return all.filter((release) => !release.draft);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requested = Math.floor(Number(searchParams.get("page") || "1"));
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1;

  try {
    const releases = await fetchAllReleases();
    const metadata = catalogue as Array<{ slug: string; title: string; description: string; author: string; pages: number; filename: string; cover: string }>;
    const books = releases.flatMap((release) => {
      const pdfs = release.assets.filter((asset) => asset.name.toLowerCase().endsWith(".pdf"));
      return pdfs.map((pdf) => {
        const stem = pdf.name.replace(/\.pdf$/i, "");
        const cover = release.assets.find((asset) => COVER_RE.test(asset.name) && asset.name.replace(COVER_RE, "").toLowerCase() === stem.toLowerCase());
        const known = metadata.find((item) => item.slug.toLowerCase() === stem.toLowerCase());
        return {
          id: `${release.id}-${pdf.name}`,
          title: known?.title || pdf.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " "),
          description: known?.description || release.body?.slice(0, 220) || "Un ouvrage de la bibliothèque BERKIOS.",
          author: known?.author || "BERKIOS",
          pages: known?.pages ?? null,
          filename: pdf.name,
          size: pdf.size,
          release: release.name || release.tag_name,
          publishedAt: release.published_at || release.created_at,
          pdfUrl: pdf.browser_download_url,
          coverUrl: cover?.browser_download_url || null,
        };
      });
    }).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime() || a.title.localeCompare(b.title, "fr"));

    const start = (page - 1) * PER_PAGE;
    return NextResponse.json({
      books: books.slice(start, start + PER_PAGE),
      page,
      perPage: PER_PAGE,
      total: books.length,
      hasNext: start + PER_PAGE < books.length,
      repository: REPO,
    }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
  } catch (err) {
    const status = err instanceof Error ? err.message : "";
    const message = status === "404"
      ? `Dépôt ${REPO} introuvable. Vérifiez qu'il est public et que son nom est correct.`
      : status === "403"
        ? "Limite de l'API GitHub atteinte. Réessayez dans quelques minutes."
        : "Impossible de joindre GitHub pour le moment.";
    return NextResponse.json({ books: [], page, perPage: PER_PAGE, total: 0, hasNext: false, error: message }, { status: 502 });
  }
}
