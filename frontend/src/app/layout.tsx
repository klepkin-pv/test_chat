import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Chat Real - Чат в реальном времени',
  description: 'Современное чат-приложение с WebSocket соединениями',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {children}
      </body>
    </html>
  )
}