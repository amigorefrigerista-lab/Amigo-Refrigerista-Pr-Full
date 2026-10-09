import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { SupabaseAuthProvider } from "@/contexts/SupabaseAuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

export const metadata: Metadata = {
  title: "Amigo Refrigerista Full",
  description: "Ferramenta de administração para técnicos de Refrigeração e Climatização.",
  openGraph: {
    title: "Amigo Refrigerista Full",
    description: "Ferramenta de administração para técnicos de Refrigeração e Climatização.",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AmigoRefri',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
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
  const nonce = headerList.get("x-nonce") || undefined;

  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var savedTheme = localStorage.getItem('amigo_refrigerista_theme_mode');
                  var root = document.documentElement;
                  if (savedTheme === 'light' || savedTheme === 'dark') {
                    root.classList.remove('dark', 'light');
                    root.classList.add(savedTheme);
                    root.setAttribute('data-theme', savedTheme);
                  }
                } catch (e) {}
                window.addEventListener('beforeinstallprompt', function(e) {
                  e.preventDefault();
                  window.__amigoDeferredPrompt = e;
                  window.dispatchEvent(new CustomEvent('amigo-pwa-ready'));
                });
                window.addEventListener('appinstalled', function() {
                  window.__amigoDeferredPrompt = null;
                  window.dispatchEvent(new CustomEvent('amigo-pwa-installed'));
                });
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').catch(function() {});
                  });
                }
              })();
            `,
          }}
        />
      </head>
      <body className="bg-slate-50 dark:bg-[#070e1c] text-slate-900 dark:text-slate-100 min-h-screen overflow-x-hidden transition-colors duration-200">
        <ThemeProvider>
          <SupabaseAuthProvider>
            {children}
          </SupabaseAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
