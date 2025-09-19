import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class AIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateSummary(text: string, length: 'short' | 'long' = 'short') {
    const prompt = `Generate a ${length} summary: ${text.substring(0, 2000)}`;
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: length === 'short' ? 100 : 300,
    });

    return response.choices[0].message.content;
  }
}