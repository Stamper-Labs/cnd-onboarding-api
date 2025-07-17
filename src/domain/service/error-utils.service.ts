import { Injectable } from '@nestjs/common';
import { ErrorObject } from '../entity/error-object';

@Injectable({})
export class ErrorUtilsService {
  static normalizeError(error: unknown): [Error, ErrorObject] {
    const safeError = error instanceof Error ? error : new Error(String(error));

    const serializedError: ErrorObject = {
      name: safeError.name,
      message: safeError.message,
      stack: safeError.stack,
    };

    return [safeError, serializedError];
  }
}
