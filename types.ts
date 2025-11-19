export enum LeadStatus {
  NEW_LEAD = 'New Lead',
  QUALIFIED_LEAD = 'Qualified Lead',
  CALL_BOOKED = 'Call Booked',
  SHOWED_UP = 'Showed Up',
  PROPOSAL_SENT = 'Proposal Sent',
  CLOSED = 'Closed'
}

export enum LeadSource {
  META_INSTANT_FORM = 'Meta Instant Form',
  WEBSITE_IMPORT = 'Website Import',
  MANUAL_ENTRY = 'Manual Entry',
  CSV_UPLOAD = 'CSV Upload'
}

export interface CapiLog {
  status: 'success' | 'error' | 'pending';
  timestamp: string;
  eventName: string;
  payload?: any;
  response?: any;
  errorMessage?: string;
}

export interface Lead {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  company?: string;
  status: LeadStatus;
  source: LeadSource;
  createdAt: string; // ISO Date string
  updatedAt: string;
  metaLeadId?: string; // ID from Meta for CAPI matching
  notes?: string;
  aiSummary?: string;
  value: number; // Deal value in INR
  
  // New Meta Data Fields
  formId?: string;
  formName?: string;
  campaignName?: string;
  adsetName?: string;
  adName?: string;
  platform?: string;
  
  // Store all other questions/answers here
  customFields?: Record<string, string>;

  // CAPI Feedback State
  capiLog?: CapiLog;
}

export interface AnalyticsData {
  totalLeads: number;
  conversionRate: number;
  revenue: number;
  leadsByStatus: { name: string; value: number; color: string }[];
  leadsBySource: { name: string; value: number }[];
}

export interface ImportResult {
  success: boolean;
  count: number;
  message: string;
}