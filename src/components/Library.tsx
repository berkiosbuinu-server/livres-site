"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowLeft, ArrowRight, BookOpen, BookText, ExternalLink, FileText, Heart, LibraryBig, LoaderCircle, Search, ShieldCheck, X } from "lucide-react";

type Book = {
  id: string; title: string; description: string; author: string; pages: number | null;
  filename: string; size: number; release: string; publishedAt: string;
  pdfUrl: string; coverUrl: string | null;
};
type ApiResult = { books: Book[]; page: number; perPage: number; total: number; hasNext: boolean; error?: string };

const formatSize = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`;
const formatDate = (date: string) => new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" }).format(new Date(date));
const pdfProxy = (url: string) => `/api/pdf?url=${encodeURIComponent(url)}`;

export default function Library() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Book | null>(null);

  // Les navigateurs mobiles n'affichent pas un PDF dans un cadre : on l'ouvre alors dans un nouvel onglet.
  const openPreview = useCallback((book: Book) => {
    if (typeof navigator !== "undefined" && navigator.pdfViewerEnabled === false) {
      window.open(pdfProxy(book.pdfUrl), "_blank", "noopener");
      return;
    }
    setSelected(book);
  }, []);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/books?page=${targetPage}`);
      const result = (await response.json()) as ApiResult;
      if (!response.ok) throw new Error(result.error || "Le catalogue n'a pas pu être chargé.");
      setData(result); setPage(targetPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(1); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("fr");
    if (!q) return data?.books ?? [];
    return (data?.books ?? []).filter((book) => `${book.title} ${book.author} ${book.description}`.toLocaleLowerCase("fr").includes(q));
  }, [data, search]);

  return (
    <main>
      <div className="announcement"><span className="pulse" /> Bibliothèque ouverte · Tous les livres sont gratuits</div>
      <header className="topbar">
        <a className="brand" href="#" aria-label="BERKIOS, accueil">
          <span className="brand-mark"><BookOpen size={22} strokeWidth={2.2} /></span>
          <span>BERKIOS<span className="brand-light">.LIBRARY</span></span>
        </a>
        <nav><a href="#catalogue">Bibliothèque</a><a href="#apropos">À propos</a></nav>
        <a className="donate-small" href="https://wa.me/243820586551?text=Bonjour%2C%20je%20souhaite%20faire%20un%20don%20pour%20soutenir%20la%20biblioth%C3%A8que%20BERKIOS." target="_blank" rel="noreferrer"><Heart size={16} /> Faire un don</a>
      </header>

      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-content">
          <div className="eyebrow"><span className="eyebrow-line" /> LE SAVOIR EN LIBRE ACCÈS</div>
          <h1>Apprendre. Créer.<br /><span>Aller plus loin.</span></h1>
          <p className="hero-copy">Explorez la bibliothèque numérique BERKIOS : des livres, des guides et des exercices à consulter et télécharger gratuitement.</p>
          <a className="hero-cta" href="#catalogue">Explorer les livres <ArrowRight size={18} /></a>
          <div className="hero-stats">
            <div><strong>{data?.total ?? "—"}</strong><span>Livres disponibles</span></div>
            <i />
            <div><strong>100 %</strong><span>Gratuit</span></div>
            <i />
            <div><strong>PDF</strong><span>Lecture facile</span></div>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="book-stack back-book"><span>BERKIOS<br />GRAPHIC</span><small>GUIDE & PRATIQUE</small></div>
          <div className="book-stack middle-book"><span>APPRENDRE<br />À PROGRAMMER</span><small>BERKIOS CODE</small></div>
          <div className="book-stack front-book"><div className="cover-symbol">B.</div><span>LA BIBLIOTHÈQUE<br />DU SAVOIR</span><small>ÉDITION BERKIOS</small></div>
          <div className="floating-note"><BookText size={17} /> Savoir sans frontières</div>
        </div>
      </section>

      <section className="catalogue-section" id="catalogue">
        <div className="section-heading">
          <div><div className="eyebrow dark-eyebrow">LA COLLECTION</div><h2>La bibliothèque</h2><p>Des ressources pour apprendre à votre rythme.</p></div>
          <div className="search-box"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un livre..." aria-label="Rechercher un livre" />{search && <button onClick={() => setSearch("")} aria-label="Effacer"><X size={16} /></button>}</div>
        </div>

        {error && <div className="error-box"><strong>Catalogue indisponible</strong><span>{error}</span><button onClick={() => void load(page)}>Réessayer</button></div>}
        {loading && <div className="loading-state"><LoaderCircle className="spin" size={28} /><span>Chargement des livres depuis GitHub…</span></div>}
        {!loading && !error && filtered.length === 0 && <div className="empty-state"><LibraryBig size={34} /><strong>Aucun livre trouvé</strong><span>Essayez un autre mot-clé.</span></div>}

        {!loading && !error && filtered.length > 0 && <>
          <div className="results-line"><span>{search ? `${filtered.length} résultat(s) sur cette page` : `${data?.total ?? 0} livre(s) dans la collection`}</span><span className="live-label"><span /> Catalogue synchronisé avec GitHub</span></div>
          <div className="book-grid">
            {filtered.map((book, index) => <article className="book-card" key={book.id}>
              <div className="cover-wrap">
                {book.coverUrl ? <img src={book.coverUrl} alt={`Couverture de ${book.title}`} loading={index > 5 ? "lazy" : "eager"} /> :
                  <div className="cover-fallback"><span className="fallback-brand">B.</span><strong>{book.title}</strong><small>ÉDITION BERKIOS</small></div>}
                <span className="pdf-badge">PDF</span>
                <div className="cover-overlay"><button onClick={() => openPreview(book)}><BookOpen size={16} /> Aperçu</button></div>
              </div>
              <div className="book-info">
                <div className="book-meta"><span>{book.pages ? `${book.pages} pages` : "Livre numérique"}</span><span>·</span><span>{formatSize(book.size)}</span></div>
                <h3 title={book.title}>{book.title}</h3>
                <p className="book-author">{book.author}</p>
                <p className="book-description">{book.description}</p>
                <div className="book-actions">
                  <button className="preview-btn" onClick={() => openPreview(book)}><BookOpen size={15} /> Aperçu</button>
                  <a className="download-btn" href={book.pdfUrl} download={book.filename} rel="noopener"><ArrowDownToLine size={16} /> Télécharger</a>
                </div>
              </div>
            </article>)}
          </div>
          <div className="pagination">
            <button className="page-btn" disabled={page <= 1 || loading} onClick={() => void load(page - 1)}><ArrowLeft size={16} /> Précédent</button>
            <span>Page <strong>{page}</strong> · {data?.total ?? 0} livres</span>
            <button className="page-btn next-btn" disabled={!data?.hasNext || loading} onClick={() => void load(page + 1)}>Suivant <ArrowRight size={16} /></button>
          </div>
        </>}
      </section>

      <section className="donation-section" id="apropos">
        <div className="donation-icon"><Heart size={25} /></div>
        <div className="donation-text"><span className="eyebrow">SOUTENIR LE SAVOIR</span><h2>Un livre gratuit, un savoir qui grandit.</h2><p>La bibliothèque BERKIOS est gratuite. Si vous souhaitez soutenir la création et le partage de nouvelles ressources, votre contribution est la bienvenue.</p></div>
        <a className="whatsapp-btn" href="https://wa.me/243820586551?text=Bonjour%2C%20je%20souhaite%20faire%20un%20don%20pour%20soutenir%20la%20biblioth%C3%A8que%20BERKIOS." target="_blank" rel="noreferrer">Contacter sur WhatsApp <ExternalLink size={16} /></a>
      </section>

      <footer><a className="footer-brand" href="#"><span className="brand-mark"><BookOpen size={18} /></span> BERKIOS</a><span>© {new Date().getFullYear()} BERKIOS · Le savoir en libre accès.</span><span className="footer-note"><ShieldCheck size={14} /> Téléchargements gratuits</span></footer>

      {selected && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`Aperçu de ${selected.title}`} onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
        <div className="preview-modal">
          <div className="modal-header"><div><span className="modal-kicker">APERÇU DU LIVRE</span><h3>{selected.title}</h3></div><button className="close-modal" onClick={() => setSelected(null)} aria-label="Fermer"><X size={20} /></button></div>
          <iframe title={`Aperçu PDF : ${selected.title}`} src={pdfProxy(selected.pdfUrl)} />
          <div className="modal-footer"><span><FileText size={15} /> {selected.pages ? `${selected.pages} pages · ` : ""}{formatSize(selected.size)}</span><a className="download-btn" href={selected.pdfUrl} download={selected.filename} rel="noopener"><ArrowDownToLine size={16} /> Télécharger le PDF</a></div>
        </div>
      </div>}
    </main>
  );
}
