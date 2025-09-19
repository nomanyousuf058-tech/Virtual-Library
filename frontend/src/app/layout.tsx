import './globals.css'
import { Inter, Noto_Nastaliq_Urdu } from 'next/font/google'
import { LanguageProvider } from '@/contexts/LanguageContext'

const inter = Inter({ subsets: ['latin'] })
const urdu = Noto_Nastaliq_Urdu({ 
  subsets: ['arabic'],
  variable: '--font-urdu',
  weight: ['400', '700']
})

export const metadata = {
  title: 'ReadVerse - Virtual Library Platform',
  description: 'Your complete digital reading experience with live sessions, AI narration, and global community',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.className} ${urdu.variable}`}>
      <body>
        <LanguageProvider>
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {children}
          </div>
        </LanguageProvider>
      </body>
    </html>
  )
}