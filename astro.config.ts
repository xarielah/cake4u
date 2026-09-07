// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { settings } from './src/config/site';

// https://astro.build/config
export default defineConfig({
  // SSG בלבד. אין שרת, אין DB. ראה CLAUDE.md סעיף 2.
  output: 'static',
  site: settings.seo.url,
  trailingSlash: 'ignore',

  integrations: [sitemap()],

  /**
   * Fonts API (יציב ב-Astro 7): מוריד את Heebo מ-Google Fonts בזמן build
   * ומגיש אותו מהדומיין שלנו. אין preconnect לגוגל ואין בקשת צד-שלישי
   * בנתיב הקריטי — זה מה שמאפשר לעמוד ב-LCP < 2.5s במובייל.
   */
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Heebo',
      cssVariable: '--font-heebo',
      weights: [400, 600, 800],
      styles: ['normal'],
      subsets: ['hebrew', 'latin'],
      display: 'swap',
      fallbacks: ['Arial', 'Helvetica', 'sans-serif'],
      optimizedFallbacks: true,
    },
  ],

  image: {
    // תמונות רספונסיביות כברירת מחדל
    layout: 'constrained',
    responsiveStyles: true,
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
