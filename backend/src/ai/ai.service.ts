import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { DeepSeek } from 'deepseek';
import { AICostTrackerService } from './ai-cost-tracker.service';

@Injectable()
export class AIService {
  private openai: OpenAI;
  private deepseek: DeepSeek;
  private logger = new Logger(AIService.name);

  constructor(
    private configService: ConfigService,
    private costTracker: AICostTrackerService
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    });

    this.deepseek = new DeepSeek({
      apiKey: this.configService.get('DEEPSEEK_API_KEY'),
    });
  }

  async generateSummary(text: string, options: {
    length: 'short' | 'medium' | 'long';
    language: string;
    userId: string;
  }): Promise<{ summary: string; cost: number }> {
    const prompt = this.buildSummaryPrompt(text, options.length, options.language);
    
    try {
      // Check user's AI usage quota
      const canProceed = await this.costTracker.checkUserQuota(options.userId, 'summary');
      if (!canProceed) {
        throw new Error('AI usage quota exceeded');
      }

      const startTime = Date.now();
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.getTokenLimit(options.length),
        temperature: 0.7,
      });

      const usage = response.usage;
      const cost = this.calculateCost(usage, 'gpt-3.5-turbo');
      const duration = Date.now() - startTime;

      // Track usage and cost
      await this.costTracker.trackUsage({
        userId: options.userId,
        service: 'openai',
        operation: 'summary',
        tokens: usage.total_tokens,
        cost,
        duration,
      });

      return {
        summary: response.choices[0].message.content,
        cost,
      };
    } catch (error) {
      this.logger.error('Error generating summary:', error);
      throw new Error('Failed to generate summary');
    }
  }

  async generateTTS(text: string, options: {
    voice: string;
    language: string;
    userId: string;
  }): Promise<{ audioUrl: string; cost: number }> {
    try {
      const canProceed = await this.costTracker.checkUserQuota(options.userId, 'tts');
      if (!canProceed) {
        throw new Error('TTS usage quota exceeded');
      }

      const startTime = Date.now();
      const response = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: options.voice as any,
        input: text,
      });

      // Calculate cost (TTS pricing: $0.015 per 1K characters)
      const cost = (text.length / 1000) * 0.015;
      const duration = Date.now() - startTime;

      await this.costTracker.trackUsage({
        userId: options.userId,
        service: 'openai',
        operation: 'tts',
        tokens: text.length,
        cost,
        duration,
      });

      // Convert response to buffer and upload to S3
      const buffer = Buffer.from(await response.arrayBuffer());
      const audioUrl = await this.uploadToStorage(buffer, 'mp3');

      return { audioUrl, cost };
    } catch (error) {
      this.logger.error('Error generating TTS:', error);
      throw new Error('Failed to generate TTS');
    }
  }

  async translateText(text: string, options: {
    sourceLang: string;
    targetLang: string;
    userId: string;
  }): Promise<{ translation: string; cost: number }> {
    try {
      const canProceed = await this.costTracker.checkUserQuota(options.userId, 'translation');
      if (!canProceed) {
        throw new Error('Translation usage quota exceeded');
      }

      const prompt = this.buildTranslationPrompt(text, options.sourceLang, options.targetLang);
      
      const startTime = Date.now();
      const response = await this.deepseek.chat.completions.create({
        model: 'deepseek-translator',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: Math.ceil(text.length * 2), // Estimate output length
        temperature: 0.3,
      });

      const usage = response.usage;
      const cost = this.calculateCost(usage, 'deepseek-translator');
      const duration = Date.now() - startTime;

      await this.costTracker.trackUsage({
        userId: options.userId,
        service: 'deepseek',
        operation: 'translation',
        tokens: usage.total_tokens,
        cost,
        duration,
      });

      return {
        translation: response.choices[0].message.content,
        cost,
      };
    } catch (error) {
      this.logger.error('Error translating text:', error);
      throw new Error('Failed to translate text');
    }
  }

  private buildSummaryPrompt(text: string, length: string, language: string): string {
    const lengthInstructions = {
      short: '1-2 sentences',
      medium: '1 paragraph',
      long: '3-4 paragraphs'
    };

    return `
      Create a ${lengthInstructions[length]} summary of the following text in ${language}.
      Focus on the main ideas and key points.
      
      Text: "${text.substring(0, 3000)}" 
      
      Summary:
    `.trim();
  }

  private buildTranslationPrompt(text: string, sourceLang: string, targetLang: string): string {
    return `
      Translate the following text from ${sourceLang} to ${targetLang}.
      Maintain the original meaning, tone, and style.
      For technical or cultural terms, provide the most appropriate equivalent.
      
      Text: "${text}"
      
      Translation:
    `.trim();
  }

  private getTokenLimit(length: string): number {
    const limits = {
      short: 100,
      medium: 200,
      long: 400
    };
    return limits[length];
  }

  private calculateCost(usage: any, model: string): number {
    const pricing = {
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 }, // per 1K tokens
      'deepseek-translator': { input: 0.001, output: 0.0015 },
    };

    const rates = pricing[model];
    if (!rates) return 0;

    const inputCost = (usage.prompt_tokens / 1000) * rates.input;
    const outputCost = (usage.completion_tokens / 1000) * rates.output;
    
    return inputCost + outputCost;
  }

  private async uploadToStorage(buffer: Buffer, extension: string): Promise<string> {
    // Implementation for uploading to AWS S3 or similar
    // Returns the public URL of the uploaded file
    return `https://storage.example.com/audio/${Date.now()}.${extension}`;
  }
}