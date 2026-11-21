export const ISSUE_CATEGORIES = [
  'roads_potholes',
  'waste_management',
  'street_lighting',
  'water_drainage',
  'public_health',
  'traffic_safety',
] as const;

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export const ISSUE_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;

export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];

export const ISSUE_STATUSES = ['reported', 'in_progress', 'resolved'] as const;

export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const MUNICIPAL_DEPARTMENTS = [
  'Roads & Infrastructure Division',
  'Solid Waste Management Department',
  'Street Lighting & Electrical Wing',
  'Water Supply & Drainage Board',
  'Public Health & Sanitation Cell',
  'Traffic & Public Safety Authority',
] as const;

export type MunicipalDepartment = (typeof MUNICIPAL_DEPARTMENTS)[number];

export interface TriageResult {
  readonly category: IssueCategory;
  readonly priority: IssuePriority;
  readonly urgencyScore: number;
  readonly department: MunicipalDepartment;
  readonly slaHours: number;
  readonly summary: string;
  readonly rationale: string;
  readonly source: 'gemini' | 'deterministic';
  readonly model?: string;
}

export interface StatusEvent {
  readonly status: IssueStatus;
  readonly timestamp: string;
  readonly actor: 'citizen' | 'system' | 'admin';
  readonly note: string;
}

export interface CivicIssue {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly location: string;
  readonly category: IssueCategory;
  readonly priority: IssuePriority;
  readonly urgencyScore: number;
  readonly department: MunicipalDepartment;
  readonly slaHours: number;
  readonly status: IssueStatus;
  readonly aiSummary: string;
  readonly aiRationale: string;
  readonly triageSource: 'gemini' | 'deterministic';
  readonly hasImage: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly timeline: readonly StatusEvent[];
}

export interface IssueFilters {
  readonly query?: string;
  readonly status?: IssueStatus | 'all';
  readonly priority?: IssuePriority | 'all';
  readonly department?: MunicipalDepartment | 'all';
}

export interface IssueAnalytics {
  readonly total: number;
  readonly reported: number;
  readonly inProgress: number;
  readonly resolved: number;
  readonly criticalOpen: number;
  readonly resolutionRate: number;
  readonly overdueOpen: number;
  readonly medianResolutionHours: number | null;
  readonly byPriority: Readonly<Record<IssuePriority, number>>;
  readonly departmentProgress: readonly DepartmentProgress[];
}

export interface DepartmentProgress {
  readonly department: MunicipalDepartment;
  readonly open: number;
  readonly resolved: number;
}

export interface SlaState {
  readonly dueAt: string;
  readonly hoursRemaining: number;
  readonly breached: boolean;
}
