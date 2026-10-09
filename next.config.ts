import 'dotenv/config';
import crypto from 'crypto';
import type { NextConfig } from 'next';

// Em produção multi-instância (ENFORCE_STRICT_HMAC_ENV=true), exige SESSION_HMAC_SECRET real definido no ambiente.
// Nos demais ambientes (preview/dev/build local), gera segredo efêmero em memória apenas se não estiver definido.
const rawHmacSecret = process.env.SESSION_HMAC_SECRET?.trim() || '';
if (!rawHmacSecret || rawHmacSecret.length < 32) {
  if (process.env.ENFORCE_STRICT_HMAC_ENV === 'true') {
    throw new Error(
      '[FATAL SECURITY] SESSION_HMAC_SECRET (mínimo 32 caracteres) é obrigatório quando ENFORCE_STRICT_HMAC_ENV=true.'
    );
  }
  process.env.SESSION_HMAC_SECRET = crypto.randomBytes(48).toString('base64');
}

const nextConfig: NextConfig = {
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'motion'],
    webpackMemoryOptimizations: true,
  },
  images: {
    // CORREÇÃO DE SEGURANÇA: Restringe domínios permitidos no otimizador de imagens do Next.js (remove hostname: '**')
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
