import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { SupabaseAuthProvider } from "@/contexts/SupabaseAuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CspScriptProvider } from "@/components/CspScriptProvider";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Amigo Refrigerista Full",
  description: "Ferramenta de administração para técnicos de Refrigeração e Climatização.",
  applicationName: "Amigo Refrigerista Full",
  openGraph: {
    title: "Amigo Refrigerista Full",
    description: "Ferramenta de administração para técnicos de Refrigeração e Climatização.",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AmigoRefri',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/icon-192.png'],
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#070e1c",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerList = await headers();
  const nonce = headerList.get("x-nonce") || "";

  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AmigoRefri" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        suppressHydrationWarning
        className="bg-slate-50 dark:bg-[#070e1c] text-slate-900 dark:text-slate-100 min-h-screen overflow-x-hidden transition-colors duration-200"
      >
        <CspScriptProvider nonce={nonce}>
          <ThemeProvider>
            <SupabaseAuthProvider>
              {children}
            </SupabaseAuthProvider>
          </ThemeProvider>
        </CspScriptProvider>
      </body>
    </html>
  );
}

