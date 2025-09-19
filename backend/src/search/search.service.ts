import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In, MoreThan, LessThan, Between } from 'typeorm';
import { Book } from '../content/entities/book.entity';
import { Author } from '../content/entities/author.entity';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';

interface SearchFilters {
  categories?: string[];
  languages?: string[];
  priceRange?: { min: number; max: number };
  rating?: number;
  publicationDate?: Date;
  tags?: string[];
  author?: string;
}

interface SearchResult {
  books: Book[];
  authors: Author[];
  totalCount: number;
  facets: {
    categories: { name: string; count: number }[];
    languages: { name: string; count: number }[];
    priceRanges: { range: string; count: number }[];
  };
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private openai: OpenAI;

  constructor(
    @InjectRepository(Book)
    private bookRepository: Repository<Book>,
    @InjectRepository(Author)
    private authorRepository: Repository<Author>,
    private readonly elasticsearchService: ElasticsearchService,
    private configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    });
  }

  async searchBooks(
    query: string,
    filters: SearchFilters = {},
    page: number = 1,
    limit: number = 20,
  ): Promise<SearchResult> {
    const skip = (page - 1) * limit;
    
    try {
      // Try Elasticsearch first if available
      if (this.configService.get('ELASTICSEARCH_ENABLED') === 'true') {
        return await this.elasticSearch(query, filters, page, limit);
      }
      
      // Fallback to PostgreSQL search
      return await this.postgresSearch(query, filters, page, limit);
    } catch (error) {
      this.logger.error('Search error:', error);
      return await this.postgresSearch(query, filters, page, limit);
    }
  }

  private async postgresSearch(
    query: string,
    filters: SearchFilters,
    page: number,
    limit: number,
  ): Promise<SearchResult> {
    const queryBuilder = this.bookRepository
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.author', 'author')
      .leftJoinAndSelect('book.categories', 'category')
      .where('book.isPublished = :isPublished', { isPublished: true });

    // Apply text search
    if (query) {
      queryBuilder.andWhere(
        '(book.title ILIKE :query OR book.description ILIKE :query OR author.name ILIKE :query)',
        { query: `%${query}%` }
      );
    }

    // Apply filters
    if (filters.categories?.length) {
      queryBuilder.andWhere('category.id IN (:...categories)', {
        categories: filters.categories,
      });
    }

    if (filters.languages?.length) {
      queryBuilder.andWhere('book.language IN (:...languages)', {
        languages: filters.languages,
      });
    }

    if (filters.priceRange) {
      queryBuilder.andWhere('book.price BETWEEN :minPrice AND :maxPrice', {
        minPrice: filters.priceRange.min,
        maxPrice: filters.priceRange.max,
      });
    }

    if (filters.rating) {
      queryBuilder.andWhere('book.averageRating >= :rating', {
        rating: filters.rating,
      });
    }

    if (filters.tags?.length) {
      queryBuilder.andWhere('book.tags && :tags', { tags: filters.tags });
    }

    if (filters.author) {
      queryBuilder.andWhere('author.name ILIKE :authorName', {
        authorName: `%${filters.author}%`,
      });
    }

    // Get total count
    const totalCount = await queryBuilder.getCount();

    // Get paginated results
    const books = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Get facets for filtering
    const facets = await this.getSearchFacets();

    return {
      books,
      authors: [], // Could implement author search separately
      totalCount,
      facets,
    };
  }

  private async elasticSearch(
    query: string,
    filters: SearchFilters,
    page: number,
    limit: number,
  ): Promise<SearchResult> {
    const mustClauses: any[] = [
      { term: { isPublished: true } }
    ];

    if (query) {
      mustClauses.push({
        multi_match: {
          query,
          fields: ['title^3', 'description^2', 'author.name^2', 'tags^1.5'],
          fuzziness: 'AUTO',
        },
      });
    }

    // Add filter clauses
    const filterClauses: any[] = [];

    if (filters.categories?.length) {
      filterClauses.push({ terms: { 'categories.id': filters.categories } });
    }

    if (filters.languages?.length) {
      filterClauses.push({ terms: { language: filters.languages } });
    }

    if (filters.priceRange) {
      filterClauses.push({
        range: {
          price: {
            gte: filters.priceRange.min,
            lte: filters.priceRange.max,
          },
        },
      });
    }

    if (filters.rating) {
      filterClauses.push({
        range: {
          averageRating: {
            gte: filters.rating,
          },
        },
      });
    }

    if (filters.tags?.length) {
      filterClauses.push({ terms: { tags: filters.tags } });
    }

    const body = {
      query: {
        bool: {
          must: mustClauses,
          filter: filterClauses,
        },
      },
      aggs: {
        categories: {
          terms: { field: 'categories.name.keyword' },
        },
        languages: {
          terms: { field: 'language' },
        },
        price_ranges: {
          range: {
            field: 'price',
            ranges: [
              { to: 5 },
              { from: 5, to: 10 },
              { from: 10, to: 20 },
              { from: 20 },
            ],
          },
        },
      },
      from: (page - 1) * limit,
      size: limit,
    };

    const { body: response } = await this.elasticsearchService.search({
      index: 'books',
      body,
    });

    const books = response.hits.hits.map((hit: any) => hit._source);
    const totalCount = response.hits.total.value;

    // Transform aggregations to facets
    const facets = {
      categories: response.aggregations.categories.buckets.map(
        (bucket: any) => ({
          name: bucket.key,
          count: bucket.doc_count,
        }),
      ),
      languages: response.aggregations.languages.buckets.map(
        (bucket: any) => ({
          name: bucket.key,
          count: bucket.doc_count,
        }),
      ),
      priceRanges: response.aggregations.price_ranges.buckets.map(
        (bucket: any) => ({
          range: `${bucket.from || 0}-${bucket.to || '∞'}`,
          count: bucket.doc_count,
        }),
      ),
    };

    return {
      books,
      authors: [],
      totalCount,
      facets,
    };
  }

  async semanticSearch(
    query: string,
    filters: SearchFilters = {},
    page: number = 1,
    limit: number = 20,
  ): Promise<SearchResult> {
    try {
      // Generate embedding for the query
      const embedding = await this.generateEmbedding(query);
      
      // Search using vector similarity
      const books = await this.bookRepository
        .createQueryBuilder('book')
        .leftJoinAndSelect('book.author', 'author')
        .leftJoinAndSelect('book.categories', 'category')
        .where('book.isPublished = :isPublished', { isPublished: true })
        .orderBy('book.embedding <=> :embedding', 'ASC')
        .setParameter('embedding', `[${embedding.join(',')}]`)
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();

      const totalCount = books.length; // This is approximate for vector search

      return {
        books,
        authors: [],
        totalCount,
        facets: await this.getSearchFacets(),
      };
    } catch (error) {
      this.logger.error('Semantic search error:', error);
      // Fallback to traditional search
      return this.searchBooks(query, filters, page, limit);
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    return response.data[0].embedding;
  }

  private async getSearchFacets() {
    // Implement logic to get search facets from database
    // This would typically involve aggregation queries
    return {
      categories: [],
      languages: [],
      priceRanges: [],
    };
  }

  async getSearchSuggestions(query: string): Promise<string[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const suggestions = await this.bookRepository
      .createQueryBuilder('book')
      .select('DISTINCT book.title', 'title')
      .where('book.title ILIKE :query', { query: `%${query}%` })
      .andWhere('book.isPublished = :isPublished', { isPublished: true })
      .orderBy('book.title', 'ASC')
      .limit(10)
      .getRawMany();

    return suggestions.map(s => s.title);
  }

  async getPopularSearches(limit: number = 10): Promise<string[]> {
    // This would typically come from analytics or search log data
    return [
      'science fiction',
      'romance',
      'mystery',
      'self-help',
      'programming',
      'history',
      'biography',
      'fantasy',
      'business',
      'cooking'
    ];
  }
}