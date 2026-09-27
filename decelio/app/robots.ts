import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://decelio.fr';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard/'],
      },
      // Autoriser explicitement les bots IA d'Inférence (RAG)
      {
        userAgent: ['ChatGPT-User', 'OAI-SearchBot', 'PerplexityBot', 'ClaudeBot', 'Claude-SearchBot', 'Google-Extended'],
        allow: '/',
      },
      // Extraire pour l'entrainement si souhaité (Généralement autorisé pour gagner en visibilité)
      {
        userAgent: ['GPTBot'],
        allow: '/',
      }
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
