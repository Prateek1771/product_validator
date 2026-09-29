import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";
import "./globals.css";

const plex = IBM_Plex_Sans({ variable: "--font-plex", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: "%s · MKT·INTEL" },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "market research", "AI market research", "market research agent", "competitor analysis", "competitive intelligence",
    "market trends", "pricing analysis", "competitor profiles", "sales battlecards",
  ],
  authors: [{ name: "Prateek Hitli", url: "https://github.com/Prateek1771" }],
  creator: "Prateek Hitli",
  category: "business",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website", siteName: SITE_NAME, locale: "en_US", url: "/",
    title: SITE_TITLE, description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESCRIPTION },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  formatDetection: { email: false, address: false, telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#07090c" },
    { media: "(prefers-color-scheme: light)", color: "#f4f6f8" },
  ],
  colorScheme: "dark light",
};

// Runs before paint so the saved theme never flashes.
const THEME_BOOT = `try{document.documentElement.dataset.theme=localStorage.getItem("theme")||"dark"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${plex.variable} ${mono.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="min-h-full font-sans text-[14px]">
        <a href="#main" className="fixed top-2 left-2 z-50 -translate-y-16 rounded bg-amber px-3 py-2 font-mono text-[12px] text-amber-ink transition focus:translate-y-0">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
