import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: "Don't Bet On It | The Squad Betting Platform",
  description: 'A risk-free social betting platform where friends and communities wager on custom topics using strictly virtual Betcoins.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>{children}</body>
    </html>
  )
}
