import { LeadStatus } from './types';

export const STATUS_COLORS: Record<LeadStatus, string> = {
  [LeadStatus.NEW_LEAD]: 'bg-blue-50 text-blue-700 border-blue-200',
  [LeadStatus.QUALIFIED_LEAD]: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  [LeadStatus.CALL_BOOKED]: 'bg-purple-50 text-purple-700 border-purple-200',
  [LeadStatus.SHOWED_UP]: 'bg-pink-50 text-pink-700 border-pink-200',
  [LeadStatus.PROPOSAL_SENT]: 'bg-orange-50 text-orange-700 border-orange-200',
  [LeadStatus.CLOSED]: 'bg-green-50 text-green-700 border-green-200',
};

export const PIPELINE_STAGES = [
  LeadStatus.NEW_LEAD,
  LeadStatus.QUALIFIED_LEAD,
  LeadStatus.CALL_BOOKED,
  LeadStatus.SHOWED_UP,
  LeadStatus.PROPOSAL_SENT,
  LeadStatus.CLOSED
];

export const META_CONFIG = {
  PIXEL_ID: '3829128450726044',
  ACCESS_TOKEN: 'EAAUYyxZAFhq0BP5v7ZB9b9duQbjnA9bS7CZBPtNqN3JaVErT2wioJM3ipC1XNb7GP2EPmlCkdRIxUSCoTASY0zZBdW6MM2MOZBRBpqb4BDLOs0uujp3KmaHlKeDuZB6jTfpJeZBEQQ3pnuu3ifIZCIKJp8gnZCMWA5KZBFvRSNPaT8JoiEpLaZC1Dg5OwYFXnym0HGLrQZDZD',
  // IMPORTANT: Left empty for Production. Add a code here only when testing in Events Manager.
  TEST_EVENT_CODE: '' 
};

export const GOOGLE_SHEET_CONFIG = {
  SHEET_ID: '1oEqCa5YxNAbIb2dirAVUFpAtG6SG47d8tZitylUE7_0',
  // Strictly fetching only the two requested tabs using exact GIDs
  SHEET_TABS: [
    { name: 'Pool Installation 1', gid: '1894242769' }, 
    { name: 'Pool Installation 2', gid: '827160642' }   
  ],
  // Keywords to look for in the Header Row (Row 1) to automatically map columns
  // This allows different forms to have different layouts.
  HEADER_MAPPING: {
    ID: ['id', 'lead_id'],
    CREATED_TIME: ['created_time', 'time', 'date'],
    NAME: ['full_name', 'fullname', 'name'],
    // Added support for split names
    FIRST_NAME: ['first_name', 'firstname', 'first'],
    LAST_NAME: ['last_name', 'lastname', 'last'],
    EMAIL: ['email', 'work_email', 'user_email'],
    PHONE: ['phone', 'phone_number', 'mobile', 'contact'],
    PLATFORM: ['platform', 'source'],
    FORM_NAME: ['form_name', 'form_id'],
    CAMPAIGN_NAME: ['campaign_name', 'campaign'],
    AD_NAME: ['ad_name', 'ad', 'ad_id'],
    STATUS: ['status', 'stage']
  }
};