import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan, In } from 'typeorm';
import { Book } from '../content/entities/book.entity';
import { User } from '../auth/entities/user.entity';
import { Payment } from '../payments/entities/payment.entity';
import { LiveSession } from '../live/entities/live-session.entity';
import { ContentReport } from '../moderation/entities/content-report.entity';
import { AIUsage } from '../ai/entities/ai-usage.entity';

interface DashboardStats {
  total: {
    users: number;
    books: number;
    revenue: number;
    sessions: number;
  };
  recent: {
    newUsers: number;
    newBooks: number;
    revenue: number;
  };
  growth: {
    userGrowth: number;
    revenueGrowth: number;
    contentGrowth: number;
  };
}

interface UserStats {
  total: number;
  byRole: { role: string; count: number }[];
  active: number;
  newToday: number;
}

interface ContentStats {
  totalBooks: number;
  byLanguage: { language: string; count: number }[];
  byCategory: { category: string; count: number }[];
  pendingReview: number;
}

interface FinancialStats {
  totalRevenue: number;
  revenueByType: { type: string; amount: number }[];
  pendingPayouts: number;
  platformEarnings: number;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Book)
    private bookRepository: Repository<Book>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(LiveSession)
    private liveSessionRepository: Repository<LiveSession>,
    @InjectRepository(ContentReport)
    private contentReportRepository: Repository<ContentReport>,
    @InjectRepository(AIUsage)
    private aiUsageRepository: Repository<AIUsage>,
  ) {}

  async getDashboardStats(period: 'day' | 'week' | 'month' = 'week'): Promise<DashboardStats> {
    const now = new Date();
    const startDate = this.getStartDate(period);

    const [
      totalUsers,
      totalBooks,
      totalRevenue,
      totalSessions,
      recentUsers,
      recentBooks,
      recentRevenue,
      previousPeriodStats,
    ] = await Promise.all([
      this.userRepository.count(),
      this.bookRepository.count({ where: { isPublished: true } }),
      this.paymentRepository
        .createQueryBuilder('payment')
        .select('SUM(payment.amount)', 'total')
        .where('payment.status = :status', { status: 'completed' })
        .getRawOne(),
      this.liveSessionRepository.count(),
      
      this.userRepository.count({ where: { createdAt: MoreThan(startDate) } }),
      this.bookRepository.count({ 
        where: { 
          createdAt: MoreThan(startDate),
          isPublished: true 
        } 
      }),
      this.paymentRepository
        .createQueryBuilder('payment')
        .select('SUM(payment.amount)', 'total')
        .where('payment.status = :status', { status: 'completed' })
        .andWhere('payment.createdAt > :startDate', { startDate })
        .getRawOne(),

      this.getPreviousPeriodStats(period, startDate),
    ]);

    const growth = this.calculateGrowth(
      { users: recentUsers, revenue: recentRevenue.total || 0, content: recentBooks },
      previousPeriodStats
    );

    return {
      total: {
        users: totalUsers,
        books: totalBooks,
        revenue: parseFloat(totalRevenue.total) || 0,
        sessions: totalSessions,
      },
      recent: {
        newUsers: recentUsers,
        newBooks: recentBooks,
        revenue: parseFloat(recentRevenue.total) || 0,
      },
      growth,
    };
  }

  async getUserStats(): Promise<UserStats> {
    const [total, byRole, active, newToday] = await Promise.all([
      this.userRepository.count(),
      this.userRepository
        .createQueryBuilder('user')
        .select('user.role', 'role')
        .addSelect('COUNT(user.id)', 'count')
        .groupBy('user.role')
        .getRawMany(),
      this.userRepository.count({
        where: { lastLogin: MoreThan(this.getStartDate('week')) },
      }),
      this.userRepository.count({
        where: { createdAt: MoreThan(this.getStartDate('day')) },
      }),
    ]);

    return {
      total,
      byRole: byRole.map(item => ({
        role: item.role,
        count: parseInt(item.count),
      })),
      active,
      newToday,
    };
  }

  async getContentStats(): Promise<ContentStats> {
    const [
      totalBooks,
      byLanguage,
      byCategory,
      pendingReview,
    ] = await Promise.all([
      this.bookRepository.count({ where: { isPublished: true } }),
      this.bookRepository
        .createQueryBuilder('book')
        .select('book.language', 'language')
        .addSelect('COUNT(book.id)', 'count')
        .where('book.isPublished = :isPublished', { isPublished: true })
        .groupBy('book.language')
        .getRawMany(),
      this.bookRepository
        .createQueryBuilder('book')
        .leftJoin('book.categories', 'category')
        .select('category.name', 'category')
        .addSelect('COUNT(book.id)', 'count')
        .where('book.isPublished = :isPublished', { isPublished: true })
        .groupBy('category.name')
        .getRawMany(),
      this.bookRepository.count({ 
        where: { 
          requiresReview: true,
          isPublished: false 
        } 
      }),
    ]);

    return {
      totalBooks,
      byLanguage: byLanguage.map(item => ({
        language: item.language,
        count: parseInt(item.count),
      })),
      byCategory: byCategory.map(item => ({
        category: item.category,
        count: parseInt(item.count),
      })),
      pendingReview,
    };
  }

  async getFinancialStats(): Promise<FinancialStats> {
    const [
      totalRevenue,
      revenueByType,
      pendingPayouts,
      platformEarnings,
    ] = await Promise.all([
      this.paymentRepository
        .createQueryBuilder('payment')
        .select('SUM(payment.amount)', 'total')
        .where('payment.status = :status', { status: 'completed' })
        .getRawOne(),
      this.paymentRepository
        .createQueryBuilder('payment')
        .select('payment.type', 'type')
        .addSelect('SUM(payment.amount)', 'total')
        .where('payment.status = :status', { status: 'completed' })
        .groupBy('payment.type')
        .getRawMany(),
      this.paymentRepository
        .createQueryBuilder('payment')
        .select('SUM(payment.amount)', 'total')
        .where('payment.status = :status', { status: 'pending_payout' })
        .getRawOne(),
      this.paymentRepository
        .createQueryBuilder('payment')
        .select('SUM(payment.platformFee)', 'total')
        .where('payment.status = :status', { status: 'completed' })
        .getRawOne(),
    ]);

    return {
      totalRevenue: parseFloat(totalRevenue.total) || 0,
      revenueByType: revenueByType.map(item => ({
        type: item.type,
        amount: parseFloat(item.total) || 0,
      })),
      pendingPayouts: parseFloat(pendingPayouts.total) || 0,
      platformEarnings: parseFloat(platformEarnings.total) || 0,
    };
  }

  async getModerationQueue(): Promise<any[]> {
    return this.contentReportRepository.find({
      where: { status: 'pending' },
      relations: ['reportedBy', 'content'],
      order: { severity: 'DESC', createdAt: 'DESC' },
      take: 50,
    });
  }

  async getAIUsageStats(): Promise<any> {
    const stats = await this.aiUsageRepository
      .createQueryBuilder('usage')
      .select('usage.service', 'service')
      .addSelect('usage.operation', 'operation')
      .addSelect('SUM(usage.cost)', 'totalCost')
      .addSelect('SUM(usage.tokens)', 'totalTokens')
      .addSelect('COUNT(usage.id)', 'totalRequests')
      .groupBy('usage.service')
      .addGroupBy('usage.operation')
      .getRawMany();

    return stats.map(item => ({
      service: item.service,
      operation: item.operation,
      totalCost: parseFloat(item.totalCost) || 0,
      totalTokens: parseInt(item.totalTokens) || 0,
      totalRequests: parseInt(item.totalRequests) || 0,
    }));
  }

  async getSystemHealth(): Promise<any> {
    // Check database connection
    const dbStatus = await this.checkDatabaseHealth();
    
    // Check external services
    const [stripeStatus, elasticsearchStatus, aiServiceStatus] = await Promise.all([
      this.checkStripeHealth(),
      this.checkElasticsearchHealth(),
      this.checkAIServiceHealth(),
    ]);

    return {
      database: dbStatus,
      stripe: stripeStatus,
      elasticsearch: elasticsearchStatus,
      aiService: aiServiceStatus,
      timestamp: new Date(),
      uptime: process.uptime(),
    };
  }

  private async checkDatabaseHealth(): Promise<{ status: string; responseTime: number }> {
    const start = Date.now();
    try {
      await this.userRepository.query('SELECT 1');
      return { status: 'healthy', responseTime: Date.now() - start };
    } catch (error) {
      return { status: 'unhealthy', responseTime: Date.now() - start };
    }
  }

  private async checkStripeHealth(): Promise<{ status: string }> {
    // Implement actual Stripe health check
    return { status: 'healthy' };
  }

  private async checkElasticsearchHealth(): Promise<{ status: string }> {
    // Implement actual Elasticsearch health check
    return { status: 'healthy' };
  }

  private async checkAIServiceHealth(): Promise<{ status: string }> {
    // Implement actual AI service health check
    return { status: 'healthy' };
  }

  private getStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'day':
        return new Date(now.setDate(now.getDate() - 1));
      case 'week':
        return new Date(now.setDate(now.getDate() - 7));
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1));
      default:
        return new Date(now.setDate(now.getDate() - 7));
    }
  }

  private async getPreviousPeriodStats(period: string, currentStartDate: Date): Promise<any> {
    const previousStartDate = new Date(currentStartDate);
    switch (period) {
      case 'day':
        previousStartDate.setDate(previousStartDate.getDate() - 1);
        break;
      case 'week':
        previousStartDate.setDate(previousStartDate.getDate() - 7);
        break;
      case 'month':
        previousStartDate.setMonth(previousStartDate.getMonth() - 1);
        break;
    }

    const [users, revenue, content] = await Promise.all([
      this.userRepository.count({
        where: { createdAt: Between(previousStartDate, currentStartDate) },
      }),
      this.paymentRepository
        .createQueryBuilder('payment')
        .select('SUM(payment.amount)', 'total')
        .where('payment.status = :status', { status: 'completed' })
        .andWhere('payment.createdAt BETWEEN :start AND :end', {
          start: previousStartDate,
          end: currentStartDate,
        })
        .getRawOne(),
      this.bookRepository.count({
        where: { 
          createdAt: Between(previousStartDate, currentStartDate),
          isPublished: true 
        },
      }),
    ]);

    return {
      users,
      revenue: parseFloat(revenue.total) || 0,
      content,
    };
  }

  private calculateGrowth(current: any, previous: any) {
    return {
      userGrowth: previous.users ? ((current.users - previous.users) / previous.users) * 100 : 0,
      revenueGrowth: previous.revenue ? ((current.revenue - previous.revenue) / previous.revenue) * 100 : 0,
      contentGrowth: previous.content ? ((current.content - previous.content) / previous.content) * 100 : 0,
    };
  }
}