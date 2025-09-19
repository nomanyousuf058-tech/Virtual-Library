import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

interface TranslationResources {
  [key: string]: {
    [key: string]: string;
  };
}

@Injectable()
export class I18nService {
  private resources: TranslationResources = {};

  constructor() {
    this.loadTranslations();
  }

  private loadTranslations() {
    const locales = ['en', 'ur', 'ar'];
    locales.forEach(locale => {
      try {
        const filePath = path.join(__dirname, '..', '..', 'locales', `${locale}.json`);
        this.resources[locale] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (error) {
        console.warn(`Failed to load translations for ${locale}:`, error.message);
      }
    });
  }

  translate(key: string, locale: string = 'en', params: Record<string, any> = {}): string {
    let translation = this.resources[locale]?.[key] || this.resources['en']?.[key] || key;

    // Replace parameters
    Object.keys(params).forEach(param => {
      translation = translation.replace(`{{${param}}}`, params[param]);
    });

    return translation;
  }

  isRTL(locale: string): boolean {
    return ['ur', 'ar'].includes(locale);
  }

  getSupportedLocales(): string[] {
    return Object.keys(this.resources);
  }
}