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
  // IMPORTANT: Get this from Events Manager > Test Events tab to see live events
  TEST_EVENT_CODE: 'TEST41673' 
};

export const GOOGLE_SHEET_CONFIG = {
  SHEET_ID: '1oEqCa5YxNAbIb2dirAVUFpAtG6SG47d8tZitylUE7_0',
  TAB_NAME: 'Pool 1',
  // Based on standard Meta Export + your provided indices
  COL_INDEX: {
    ID: 0,           // A
    CREATED_TIME: 1, // B
    AD_ID: 2,        // C
    AD_NAME: 3,      // D
    ADSET_ID: 4,     // E
    ADSET_NAME: 5,   // F
    CAMPAIGN_ID: 6,  // G
    CAMPAIGN_NAME: 7,// H
    FORM_ID: 8,      // I
    FORM_NAME: 9,    // J
    PLATFORM: 10,    // K
    
    // PII from your previous prompt
    EMAIL: 15,       // P
    NAME: 16,        // Q
    PHONE: 17,       // R
    STATUS: 18       // S
  }
};