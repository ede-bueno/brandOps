export type AtlasAnalystSkillId =
  | "auto"
  | "executive_operator"
  | "marketing_performance"
  | "revenue_operator"
  | "pod_strategist";

export type AtlasAnalystResolvedSkillId = Exclude<AtlasAnalystSkillId, "auto">;
export type AtlasAnalystFeedbackVote = "helpful" | "not_helpful";
export type AtlasBrandLearningStatus = "running" | "completed" | "failed";
export type AtlasBrandLearningFeedbackVote = "aligned" | "needs_review";
export type AtlasBrandLearningScope = "all" | "180d" | "90d" | "30d" | "analysis_window";

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

export interface AtlasBrandLearningSnapshot {
  id: string;
  brandId: string;
  runId: string | null;
  scopeLabel: string;
  scopeKey?: AtlasBrandLearningScope | null;
  periodFrom?: string | null;
  periodTo?: string | null;
  summary: string;
  confidence: "low" | "medium" | "high";
  businessProfile: string;
  nicheProfile: string;
  performanceBaseline: string;
  operationalRisks: string[];
  recurringErrors: string[];
  growthOpportunities: string[];
  evidenceSources: string[];
  dataGaps: string[];
  businessSignals: string[];
  seasonalityPatterns: string[];
  campaignPatterns: string[];
  catalogPatterns: string[];
  priorityStack: string[];
  nextMilestones: string[];
  watchItems: string[];
  relearnTriggers: string[];
  generatedAt: string;
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

export interface AtlasBrandLearningRun {
  id: string;
  brandId: string;
  status: AtlasBrandLearningStatus;
  scopeLabel: string;
  model: string | null;
  temperature: number | null;
  summary: string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface AtlasBrandLearningResponse {
  snapshot: AtlasBrandLearningSnapshot | null;
  previousSnapshot?: AtlasBrandLearningSnapshot | null;
  runs: AtlasBrandLearningRun[];
  feedback?: AtlasBrandLearningFeedbackSummary | null;
}

export interface AtlasBrandLearningFeedbackPayload {
  snapshotId: string;
  vote: AtlasBrandLearningFeedbackVote;
  note?: string | null;
}

export interface AtlasBrandLearningRequestPayload {
  scope?: AtlasBrandLearningScope;
}

export interface AtlasBrandLearningFeedbackSummary {
  snapshotId: string;
  currentVote: AtlasBrandLearningFeedbackVote | null;
  alignedCount: number;
  needsReviewCount: number;
}
