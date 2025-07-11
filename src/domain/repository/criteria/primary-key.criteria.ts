export interface PrimaryKeyCriteria {
  primaryKeyExpression: string;
  filterExpression: string;
  values: Record<string, string | number | boolean>;
}
