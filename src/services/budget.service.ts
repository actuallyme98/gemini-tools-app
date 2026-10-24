export type BudgetSummary = {
  currency?: "USD" | "CREDIT";
  owner: string;
  periodStart: string;
  periodEnd: string;
  timezone: string;
  limitUsd: number;
  defaultWeeklyUsd: number;
  overrideUsd: number | null;
  policyVersion: number;
  spentUsd: number;
  reservedUsd: number;
  availableUsd: number;
  usedPercent: number;
};
export type BudgetDetails = BudgetSummary & {
  nextCursor: number | null;
  totalEntries: number;
  periods: string[];
  entries: {
    id: string;
    requestId: string;
    provider: string;
    model: string;
    operation: string;
    status: string;
    reservedUsd: number;
    costUsd?: number;
    basis?: string;
    createdAt: string;
    canReconcile: boolean;
    priceSource: string;
  }[];
};
export type PriceRule = {
  provider: string;
  model: string;
  operation: string;
  reserveUsd: number;
  requestUsd?: number;
  inputUsdPerMillion?: number;
  outputUsdPerMillion?: number;
  imageUsd?: number;
  source: string;
};
export type BudgetPolicy = {
  currency?: "USD" | "CREDIT";
  defaultWeeklyUsd: number;
  prices: PriceRule[];
  updatedAt: string;
};
export const usd = (value: number, currency: "USD" | "CREDIT" = "USD") =>
  currency === "CREDIT"
    ? `${new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(value)} credit`
    : new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      }).format(value);
export const budgetDate = (value: string) =>
  new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Bangkok" });
