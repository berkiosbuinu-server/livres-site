import { NextResponse } from "next/server";

// Relais des PDF GitHub (aperçu dans le navigateur). Le téléchargement, lui, passe directement par GitHub.
const ALLOWED_HOSTS = new Set(["github.com", "objects.githubusercontent.com", "release-assets.githubusercontent.com", "github-releases.githubusercontent.com"]);
const REPO = (process.env.GITHUB_REPOSITORY || "berkiosbuinu-server/livres").toLowerCase();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "URL du PDF manquante." }, { status: 400 });

  let source: URL;
  try { source = new URL(raw); } catch { return NextResponse.json({ error: "URL invalide." }, { status: 400 }); }
  // Seuls les PDF des Releases de CE dépôt sont relayés (le site ne devient pas un proxy ouvert).
  const expectedPrefix = `/${REPO}/releases/download/`;
  if (source.protocol !== "https:" || source.hostname !== "github.com" || !source.pathname.toLowerCase().startsWith(expectedPrefix) || !source.pathname.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Source de fichier non autorisée." }, { status: 403 });
  }

  try {
    const upstreamHeaders: Record<string, string> = {};
    const range = request.headers.get("range");
    if (range) upstreamHeaders.Range = range;

    const upstream = await fetch(source.toString(), { redirect: "follow", headers: upstreamHeaders, cache: "no-store" });
    if (!upstream.ok && upstream.status !== 206) return NextResponse.json({ error: "Le fichier PDF est momentanément indisponible." }, { status: upstream.status });
    const finalUrl = new URL(upstream.url);
    if (!ALLOWED_HOSTS.has(finalUrl.hostname)) return NextResponse.json({ error: "Redirection non autorisée." }, { status: 403 });

    const filename = decodeURIComponent(source.pathname.split("/").pop() || "livre.pdf").replace(/["\r\n\\]/g, "");
    const download = searchParams.get("download") === "1";
    const headers: Record<string, string> = {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "Accept-Ranges": "bytes",
      "X-Content-Type-Options": "nosniff",
    };
    for (const name of ["content-length", "content-range"]) {
      const value = upstream.headers.get(name);
      if (value) headers[name] = value;
    }
    return new NextResponse(upstream.body, { status: upstream.status, headers });
  } catch {
    return NextResponse.json({ error: "Erreur lors du chargement du PDF." }, { status: 502 });
  }
}
