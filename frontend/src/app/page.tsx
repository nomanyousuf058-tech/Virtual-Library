'use client'

import { useState } from 'react'
import { BookOpen, Users, Video, Mic, Search, Globe } from 'lucide-react'

export default function Home() {
  const [language, setLanguage] = useState('en')

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-800">ReadVerse</span>
            </div>
            
            <nav className="hidden md:flex space-x-8">
              <a href="/books" className="text-gray-600 hover:text-blue-600 transition-colors">Books</a>
              <a href="/live" className="text-gray-600 hover:text-blue-600 transition-colors">Live Sessions</a>
              <a href="/audiobooks" className="text-gray-600 hover:text-blue-600 transition-colors">Audiobooks</a>
              <a href="/marketplace" className="text-gray-600 hover:text-blue-600 transition-colors">Marketplace</a>
            </nav>

            <div className="flex items-center space-x-4">
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value)}
                className="border rounded px-3 py-1 text-sm"
              >
                <option value="en">English</option>
                <option value="ur">اردو</option>
                <option value="ar">العربية</option>
              </select>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Sign In
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-800 mb-6">
          Revolutionize Your Reading Experience
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
          Discover, read, and experience books like never before with live author sessions, 
          AI-powered narration, and a global community of readers and writers.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <button className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg hover:bg-blue-700 transition-colors">
            Start Reading Free
          </button>
          <button className="border border-blue-600 text-blue-600 px-8 py-4 rounded-lg text-lg hover:bg-blue-50 transition-colors">
            Join Live Session
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">10,000+</div>
            <div className="text-gray-600">Books Available</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">500+</div>
            <div className="text-gray-600">Live Sessions Daily</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">50+</div>
            <div className="text-gray-600">Languages Supported</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">100K+</div>
            <div className="text-gray-600">Active Readers</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-gray-800 mb-16">Why Choose ReadVerse?</h2>
          
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Live Author Sessions</h3>
              <p className="text-gray-600">Interactive reading sessions with your favorite authors in real-time</p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mic className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">AI Narration</h3>
              <p className="text-gray-600">Professional-quality audiobooks with emotional AI voices</p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Multi-language</h3>
              <p className="text-gray-600">Full RTL support for Urdu and Arabic with seamless translation</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}