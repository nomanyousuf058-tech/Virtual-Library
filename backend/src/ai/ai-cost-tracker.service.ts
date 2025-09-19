import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIUsage } from './entities/ai-usage.entity';

@Injectable()
export class AICostTrackerService {
  constructor(
    @InjectRepository(AIUsage)
    private readonly aiUsageRepository: Repository<AIUsage>,
  ) {}

  async checkUserQuota(userId: string, operation: string): Promise<boolean> {
    // Get today's usage for this user
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await this.aiUsageRepository
      .createQueryBuilder('usage')
      .where('usage.userId = :userId', { userId })
      .andWhere('usage.timestamp >= :today', { today })
      .select('SUM(usage.cost)', 'totalCost')
      .getRawOne();

    const totalCost = parseFloat(usage.totalCost) || 0;
    
    // Define quotas based on user role or subscription
    const quota = this.getUserQuota(userId, operation);
    
    return totalCost < quota;
  }

  async trackUsage(data: {
    userId: string;
    service: string;
    operation: string;
    tokens: number;
    cost: number;
    duration: number;
  }): Promise<void> {
    const usage = this.aiUsageRepository.create({
      userId: data.userId,
      service: data.service,
      operation: data.operation,
      tokens: data.tokens,
      cost: data.cost,
      duration: data.duration,
      timestamp: new Date(),
    });

    await this.aiUsageRepository.save(usage);
  }

  private getUserQuota(userId: string, operation: string): number {
    // Implement logic to get user's quota based on:
    // - User role (reader, writer, etc.)
    // - Subscription tier
    // - Operation type
    // Default to $5 daily quota
    return 5.0;
  }

  async getMonthlyUsage(userId: string): Promise<{ totalCost: number; usageByService: any }> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usage = await this.aiUsageRepository
      .createQueryBuilder('usage')
      .where('usage.userId = :userId', { userId })
      .andWhere('usage.timestamp >= :startOfMonth', { startOfMonth })
      .select('service')
      .addSelect('SUM(cost)', 'totalCost')
      .addSelect('SUM(tokens)', 'totalTokens')
      .groupBy('service')
      .getRawMany();

    const totalCost = usage.reduce((sum, item) => sum + parseFloat(item.totalCost), 0);
    
    return {
      totalCost,
      usageByService: usage,
    };
  }
}