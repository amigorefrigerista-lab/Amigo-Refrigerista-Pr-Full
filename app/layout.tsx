import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SupabaseAuthProvider } from "@/contexts/SupabaseAuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

export const metadata: Metadata = {
  title: "Amigo Refrigerista Full",
  description: "Ferramenta de aministração para técnicos de Refrigeração e Climatização.",
  openGraph: {
    title: "Amigo Refrigerista Full",
    description: "Ferramenta de aministração para técnicos de Refrigeração e Climatização.",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AmigoRefri',
  },
  icons: {
    icon: [
      { url: '/icon', type: 'image/png', sizes: '512x512' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
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
