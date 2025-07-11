export interface PatchCriteria {
  partitionKey: [string, string | number | boolean];
  sortKey?: [string, string | number | boolean];
  patchExpression: string;
  values: Record<string, string | number | boolean>;
}
