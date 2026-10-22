import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Amigo Refrigerista Pro',
    short_name: 'AmigoRefri',
    description: 'Diagnósticos e Ordens de Serviço para técnicos em refrigeração.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#070e1c',
    theme_color: '#070e1c',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
