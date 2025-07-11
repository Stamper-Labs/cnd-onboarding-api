export interface IndexCriteria {
  indexExpression: string;
  indexName: string;
  filterExpression?: string;
  values: Record<string, string | number | boolean>;
}
