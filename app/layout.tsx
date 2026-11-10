import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import Shell from "@/components/Shell";
import { THEME_INIT } from "@/lib/theme-init";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cash Manager",
  description: "Finanze personali: conti, wallet, titoli, interessi netti e bollo",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Cash" },
};
export const viewport: Viewport = { themeColor: "#0b0b14", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={geist.variable} data-theme="dark" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_INIT }} /></head>
      <body>
        <StoreProvider>
          <Shell>{children}</Shell>
        </StoreProvider>
      </body>
    </html>
  );
}
