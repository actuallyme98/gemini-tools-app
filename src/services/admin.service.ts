import type { AgentUser } from "./agent.service";

export type PageResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};
export type AdminUser = AgentUser & {
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  hasPassword: boolean;
  googleLinked: boolean;
  usage: Record<string, { count: number; bytes: number }>;
};
export type AdminRun = {
  id: string;
  owner: string;
  ownerEmail: string;
  conversationId: string;
  state: string;
  operation: string;
  count: number;
  provider: string;
  imageModel?: string;
  productType: string;
  createdAt: string;
  updatedAt: string;
  requestId: string;
};
export type AdminStep = {
  id: string;
  index: number;
  type: string;
  state: string;
  error?: string;
  errorCode?: string;
  requestId: string;
  durationMs?: number;
};
export type AdminAudit = {
  id: string;
  actorEmail: string;
  action: string;
  target: string;
  createdAt: string;
  outcome: string;
  details: Record<string, unknown>;
  errorCode?: string;
};
export type Diagnostic = Record<string, string | number | boolean>;
export type DiagnosticPage = {
  items: Diagnostic[];
  nextCursor: number | null;
  scanned: number;
  malformed: number;
};
export type CompanySettings = {
  id: string;
  name: string;
  protectedAdminId: string;
  updatedAt: string;
  googleAllowedDomains: string[];
  googleAutoProvision: boolean;
  queuePaused: boolean;
};
export type AdminSettings = {
  company: CompanySettings;
  runtime: {
    agentEnabled: boolean;
    workerEnabled: boolean;
    concurrency: number;
    sessionHours: number;
    googleConfigured: boolean;
    logRetentionDays: number;
    logImageLimitBytes: number;
    assetEncryption: boolean;
    storagePrefix: string;
    providers: {
      providers: { id: string; available: boolean; capabilities: string[] }[];
    };
  };
};
export type AdminOverview = {
  totals: { _id: string; count: number }[];
  runs: { _id: string; count: number }[];
  steps: { _id: string; count: number }[];
  daily: { _id: string; count: number }[];
  storage: { count: number; bytes: number; backups: number }[];
  sessions: { count: number }[];
  queuePaused: boolean;
  generatedAt: string;
};
