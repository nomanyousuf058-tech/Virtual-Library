import React, { useState, useCallback, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import SearchResults from './SearchResults';
import SearchFilters from './SearchFilters';
import SearchSuggestions from './SearchSuggestions';

interface SearchFilters {
  categories: string[];
  languages: string[];
  priceRange: { min: number; max: number };
  rating: number;
  tags: string[];
}

const SearchInterface: React.FC = () => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    categories: [],
    languages: [],
    priceRange: { min: 0, max: 100 },
    rating: 0,
    tags: [],
  });
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchType, setSearchType] = useState<'standard' | 'semantic'>('standard');
  
  const [debouncedQuery] = useDebounce(query, 300);

  const performSearch = useCallback(async (searchQuery: string, searchFilters: SearchFilters, page: number, type: string) => {
    if (!searchQuery && Object.keys(searchFilters).length === 0) {
      setSearchResults(null);
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          filters: searchFilters,
          page,
          limit: 20,
          type,
        }),
      });

      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
      } else {
        throw new Error('Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      // Show error to user
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedQuery || Object.keys(filters).length > 0) {
      performSearch(debouncedQuery, filters, 1, searchType);
    }
  }, [debouncedQuery, filters, searchType, performSearch]);

  const handleFilterChange = (newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    performSearch(debouncedQuery, filters, page, searchType);
  };

  return (
    <div className="search-interface">
      <div className="search-header">
        <div className="search-input-container">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search books, authors, or topics..."
            className="search-input"
          />
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as 'standard' | 'semantic')}
            className="search-type-selector"
          >
            <option value="standard">Standard Search</option>
            <option value="semantic">Semantic Search</option>
          </select>
        </div>
        
        <SearchSuggestions 
          query={query}
          onSuggestionClick={(suggestion) => setQuery(suggestion)}
        />
      </div>

      <div className="search-content">
        <div className="filters-sidebar">
          <SearchFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            availableFacets={searchResults?.facets}
          />
        </div>

        <div className="results-main">
          {isLoading ? (
            <div className="loading">Searching...</div>
          ) : searchResults ? (
            <SearchResults
              results={searchResults}
              currentPage={currentPage}
              onPageChange={handlePageChange}
            />
          ) : (
            <div className="search-prompt">
              <h3>Start searching for books</h3>
              <p>Try searching by title, author, genre, or topic</p>
              
              <div className="popular-searches">
                <h4>Popular Searches:</h4>
                {['Fiction', 'Science', 'History', 'Romance', 'Business'].map(
                  (term) => (
                    <button
                      key={term}
                      onClick={() => setQuery(term)}
                      className="popular-search-term"
                    >
                      {term}
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchInterface;