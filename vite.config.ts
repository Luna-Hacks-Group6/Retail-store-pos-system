import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from 'vite-plugin-pwa';
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  /* Build optimizations for offline-first */
  build: {
    /* Inline small assets to reduce network requests */
    assetsInlineLimit: 4096,
    /* Generate source maps for debugging */
    sourcemap: mode === 'development',
    /* Optimize CSS */
    cssCodeSplit: false,
    /* Minify for production */
    minify: mode === 'production' ? 'esbuild' : false,
    rollupOptions: {
      output: {
        /* Consistent chunk naming for better caching */
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
          'vendor-query': ['@tanstack/react-query'],
        },
      },
    },
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      /* Include all static assets for offline use */
      includeAssets: [
        'favicon.ico',
        'robots.txt',
        'sitemap.xml',
        'pwa-192x192.png',
        'pwa-512x512.png',
      ],
      manifest: {
        name: 'CFI-POS - Professional Wholesale Point of Sale',
        short_name: 'CFI-POS',
        description: 'Professional wholesale point-of-sale system with inventory management, sales tracking, and real-time reporting. Works offline for uninterrupted business operations.',
        theme_color: '#1e293b',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        categories: ['business', 'productivity', 'finance'],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'New Sale',
            short_name: 'Sale',
            url: '/sales',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'Products',
            short_name: 'Products',
            url: '/products',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        /* Precache all built assets */
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,jpg,jpeg,gif,webp,woff,woff2,ttf,eot}'
        ],
        /* Maximum file size to precache (5MB) */
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        /* Navigation fallback for SPA */
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/supabase/],
        /* Runtime caching strategies */
        runtimeCaching: [
          {
            /* Cache API responses with network-first strategy */
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 5 // 5 minutes
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            /* Cache auth requests with network-only (security) */
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/.*/i,
            handler: 'NetworkOnly'
          },
          {
            /* Cache storage/file requests */
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'storage-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            /* Cache images with cache-first strategy */
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ],
        /* Clean up old caches */
        cleanupOutdatedCaches: true,
        /* Skip waiting for immediate activation */
        skipWaiting: true,
        clientsClaim: true
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  /* Optimize dependencies */
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
  },
}));
