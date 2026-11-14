import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bibliothèque BERKIOS — Livres gratuits",
  description: "Découvrez, consultez et téléchargez gratuitement les livres et guides BERKIOS.",
  metadataBase: new URL("https://livres.berkios.online"),
  openGraph: { title: "Bibliothèque BERKIOS", description: "Des livres gratuits pour apprendre, créer et progresser.", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}
