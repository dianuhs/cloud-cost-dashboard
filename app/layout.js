import './globals.css'

export const metadata = {
  title: 'FinOps Cloud Cost Dashboard',
  description: 'Analyze and optimize your cloud costs with insights and projections',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  )
}