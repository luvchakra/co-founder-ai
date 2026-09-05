export type OperationUsage = {
  operation: string;
  runs: number;
  cost: number;
};

export type WorkspaceUsage = {
  workspaceId: string;
  periodStart: string;
  periodEnd: string;
  totalRuns: number;
  totalCost: number;
  byOperation: OperationUsage[];
};

export type OperationCostSample = {
  average: number;
  min: number;
  max: number;
  sampleSize: number;
};
