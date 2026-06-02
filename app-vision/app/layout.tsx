import type { Metadata, Viewport } from 'next'
import './globals.css'

export const viewport: Viewport = {
  themeColor: '#0d0d0b',
}

export const metadata: Metadata = {
  title: 'vision · libreyolo detector',
  description: 'Real-time object detection, segmentation, and pose estimation powered by LibreYOLO',
  openGraph: {
    title: 'vision · libreyolo detector',
    description: 'Real-time computer vision in your browser',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Bebas+Neue&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg text-fg antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
