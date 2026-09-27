import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FreeToken Chat Hub',
  description: 'Enterprise FreeToken Multi-Model Chat Hub',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-[#09090B] text-white">
        {children}
      </body>
    </html>
  )
}
