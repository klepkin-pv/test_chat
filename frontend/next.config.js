/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/chat',
  assetPrefix: '/chat',
  trailingSlash: false,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || '',
    NEXT_PUBLIC_PUBLIC_ORIGIN: process.env.PUBLIC_ORIGIN || '',
    NEXT_PUBLIC_APP_PROTOCOL: process.env.APP_PROTOCOL || 'http',
    NEXT_PUBLIC_APP_HOST: process.env.APP_HOST || 'localhost',
    NEXT_PUBLIC_NGINX_PORT: process.env.NGINX_PORT || '5176',
    NEXT_PUBLIC_FRONTEND_PORT: process.env.FRONTEND_PORT || '5175',
    NEXT_PUBLIC_BACKEND_PORT: process.env.BACKEND_PORT || process.env.PORT || '4000'
  }
}

module.exports = nextConfig;
