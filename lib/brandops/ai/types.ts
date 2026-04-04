export type AtlasAnalystSkillId =
  | "auto"
  | "executive_operator"
  | "marketing_performance"
  | "revenue_operator"
  | "pod_strategist";

export type AtlasAnalystResolvedSkillId = Exclude<AtlasAnalystSkillId, "auto">;
export type AtlasAnalystFeedbackVote = "helpful" | "not_helpful";

export type AtlasContextEntryType = "campaign" | "promotion" | "launch" | "incident" | "insight";
export type AtlasContextEntrySource = "manual" | "imported" | "analyst" | "system";
export type AtlasContextEntryImportance = "low" | "normal" | "high" | "critical";

export type AtlasAnalystReportId =
  | "financial"
  | "media"
  | "traffic"
  | "product-insights"
  | "sales"
  | "catalog"
  | "sanitization";

export interface AtlasAnalystRequestPayload {
  question: string;
  skill?: AtlasAnalystSkillId;
  pageContext?: string | null;
  periodLabel?: string | null;
  brandLabel?: string | null;
  from?: string | null;
  to?: string | null;
}

export interface AtlasAnalystExecutionInput extends AtlasAnalystRequestPayload {
  brandId: string;
}

export interface AtlasAnalystResponse {
  runId: string | null;
  skillId: AtlasAnalystResolvedSkillId;
  skillLabel: string;
  confidence: "low" | "medium" | "high";
  summary: string;
  answer: string;
  evidence: string[];
  actions: string[];
  risks: string[];
  followUps: string[];
  warnings: string[];
  usedReports: AtlasAnalystReportId[];
  generatedAt: string;
  periodLabel: string | null;
  feedbackVote: AtlasAnalystFeedbackVote | null;
}

export interface AtlasAnalystHistoryItem extends AtlasAnalystResponse {
  question: string;
  pageContext: string | null;
}

export interface AtlasContextEntryPayload {
  entryType: AtlasContextEntryType;
  title: string;
  summary: string;
  details?: string | null;
  source?: AtlasContextEntrySource;
  eventDate?: string | null;
  importance?: AtlasContextEntryImportance;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface AtlasContextEntry extends AtlasContextEntryPayload {
  id: string;
  brandId: string;
  userId: string;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AtlasAnalystHistoryResponse {
  runs: AtlasAnalystHistoryItem[];
  contextItems?: AtlasContextEntry[];
}

export interface AtlasContextEntryListResponse {
  entries: AtlasContextEntry[];
}

export interface AtlasAnalystFeedbackPayload {
  runId: string;
  vote: AtlasAnalystFeedbackVote;
  note?: string | null;
}
