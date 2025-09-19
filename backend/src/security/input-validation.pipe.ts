import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { sanitize } from 'class-sanitizer';

@Injectable()
export class InputValidationPipe implements PipeTransform<any> {
  async transform(value: any, metadata: any) {
    const { metatype } = metadata;
    
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Sanitize input
    sanitize(value);

    const object = plainToClass(metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      const errorMessages = errors
        .map(err => Object.values(err.constraints || {}))
        .flat();
      
      throw new BadRequestException(`Validation failed: ${errorMessages.join(', ')}`);
    }

    return value;
  }

  private toValidate(metatype: any): boolean {
    const types = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}