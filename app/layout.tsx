import type { Metadata } from 'next'
import { Space_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { CustomCursor } from '@/components/custom-cursor'
import './globals.css'

const spaceMono = Space_Mono({ 
  weight: ['400', '700'],
  subsets: ["latin"],
  variable: '--font-mono'
});

export const metadata: Metadata = {
  title: 'ObserV',
  description: 'From the initial idea to the finished digital product—with attention to every detail',
  alternates: {
    languages: {
      'ru': '/ru',
      'en': '/en',
    },
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${spaceMono.variable} font-mono antialiased`}>
        <CustomCursor />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
