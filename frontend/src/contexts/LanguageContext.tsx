'use client'

import React, { createContext, useContext, useState } from 'react'

interface LanguageContextType {
  language: string
  direction: 'ltr' | 'rtl'
  setLanguage: (lang: string) => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState('en')

  const direction = language === 'ur' || language === 'ar' ? 'rtl' : 'ltr'

  return (
    <LanguageContext.Provider value={{ language, direction, setLanguage }}>
      <div dir={direction} className={direction === 'rtl' ? 'font-urdu' : ''}>
        {children}
      </div>
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}