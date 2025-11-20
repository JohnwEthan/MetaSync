import { Lead, LeadStatus, LeadSource, CapiLog } from '../types';
import { META_CONFIG } from '../constants';

const STORAGE_KEY = 'metaSync_leads_v1';

// Helper function to hash data (SHA-256) for Meta CAPI
const hashData = async (input: string | undefined): Promise<string | null> => {
  if (!input) return null;
  const clean = input.toString().trim().toLowerCase();
  if (clean === "") return null;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(clean);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

// Normalize phone numbers to strict digits only (Meta Requirement)
const normalizePhone = (phone: string | undefined): string | undefined => {
  if (!phone) return undefined;
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
};

// Load initial state from LocalStorage if available
let leadsInMemory: Lead[] = [];
try {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    leadsInMemory = JSON.parse(stored);
  }
} catch (e) {
  console.error("Failed to load leads from storage", e);
}

export const MetaService = {
  setLeads: (leads: Lead[]) => {
    leadsInMemory = leads;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(leadsInMemory));
    } catch (e) {
      console.error("Failed to save leads to storage", e);
    }
  },

  getLeads: async (): Promise<Lead[]> => {
    // Simulate network delay slightly for realism, but return local data
    await new Promise(resolve => setTimeout(() => resolve(true), 200));
    return [...leadsInMemory];
  },

  importLeadsFromCSV: async (file: File): Promise<Lead[]> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
              try {
                  const text = e.target?.result as string;
                  const lines = text.split('\n');
                  if (lines.length < 2) {
                    resolve([]);
                    return;
                  }
                  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                  
                  const newLeads: Lead[] = [];
                  
                  for(let i=1; i < lines.length; i++) {
                      if(!lines[i].trim()) continue;
                      const values = lines[i].split(',');
                      
                      const nameIdx = headers.findIndex(h => h.includes('name'));
                      const emailIdx = headers.findIndex(h => h.includes('email'));
                      const phoneIdx = headers.findIndex(h => h.includes('phone'));
                      
                      if(nameIdx === -1) continue;
                      
                      newLeads.push({
                          id: `csv-${Date.now()}-${i}`,
                          fullName: values[nameIdx] || 'Unknown',
                          email: values[emailIdx] || '',
                          phone: values[phoneIdx] || '',
                          status: LeadStatus.NEW_LEAD,
                          source: LeadSource.CSV_UPLOAD,
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                          value: 0,
                          notes: 'Imported via CSV'
                      });
                  }
                  // Persist immediately
                  MetaService.setLeads([...leadsInMemory, ...newLeads]);
                  resolve(newLeads);
              } catch(err) {
                  reject(err);
              }
          };
          reader.readAsText(file);
      });
  },

  simulateIncomingWebhook: async (): Promise<Lead> => {
    await new Promise(resolve => setTimeout(() => resolve(true), 800));
    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      fullName: `New Meta Lead ${Math.floor(Math.random() * 100)}`,
      email: `meta.user.${Date.now()}@example.com`,
      phone: '919999988888',
      status: LeadStatus.NEW_LEAD,
      source: LeadSource.META_INSTANT_FORM,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metaLeadId: `l:meta_lead_${Date.now()}`,
      value: 0,
      formName: "Lead_Gen_High_Intent_v1",
      campaignName: "Q3_Performance_Max",
      notes: "Simulated Webhook Entry"
    };
    
    leadsInMemory = [newLead, ...leadsInMemory];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(leadsInMemory));
    } catch (e) {}
    
    return newLead;
  },

  updateLeadStatus: async (id: string, status: LeadStatus): Promise<{ updatedLead: Lead, capiResult: CapiLog | null }> => {
    const index = leadsInMemory.findIndex(l => l.id === id);
    if (index === -1) throw new Error("Lead not found");

    const lead = leadsInMemory[index];
    
    let updatedValue = lead.value;
    if (status === LeadStatus.CLOSED && lead.value === 0) {
      updatedValue = 50000; // Default INR value if not set
    }

    const updatedLead = { 
      ...lead, 
      status, 
      value: updatedValue, 
      updatedAt: new Date().toISOString(),
      capiLog: { 
        status: 'pending', 
        timestamp: new Date().toISOString(), 
        eventName: 'Processing...' 
      } as CapiLog
    };
    
    leadsInMemory[index] = updatedLead;
    
    // Persist update immediately
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(leadsInMemory));
    } catch (e) {
      console.error("Failed to persist status update:", e);
    }

    // Send Feedback Signal to Meta CAPI
    let capiResult: CapiLog | null = null;
    
    if (lead.source === LeadSource.META_INSTANT_FORM || lead.metaLeadId || lead.id.startsWith('sheet_') || lead.id.startsWith('lead_')) {
      
      // SPECIAL REQUIREMENT: If moving to Qualified Lead, fire both "Lead" and "Custom Lead" events
      if (status === LeadStatus.QUALIFIED_LEAD) {
         // Fire 'Lead' event first (background, don't wait for result to overwrite next one)
         await MetaService.sendConversionSignal(updatedLead, "Lead");
      }

      // Fire actual status event (or Custom Lead)
      capiResult = await MetaService.sendConversionSignal(updatedLead);
      
      updatedLead.capiLog = capiResult;
      leadsInMemory[index] = updatedLead;
      
      // Persist CAPI result
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(leadsInMemory));
      } catch (e) {}
    }

    return { updatedLead, capiResult };
  },

  sendConversionSignal: async (lead: Lead, eventNameOverride?: string): Promise<CapiLog> => {
    const log: CapiLog = {
      status: 'pending',
      timestamp: new Date().toISOString(),
      eventName: 'Unknown'
    };

    if (!lead.metaLeadId && !lead.id) {
      log.status = 'error';
      log.errorMessage = "Skipping CAPI: No Lead ID found.";
      return log;
    }

    try {
      const rawId = lead.metaLeadId || lead.id;
      const leadIdClean = rawId.toString().replace(/^l:/i, "").trim();
      
      // VALIDATION: Strict check for numeric ID. 
      // Non-numeric IDs (like "sheet_row_1" or "csv-123") will NOT be sent as lead_id.
      const isValidMetaId = /^\d+$/.test(leadIdClean);
      
      const nameParts = lead.fullName.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

      const cleanPhone = normalizePhone(lead.phone);
      
      const hashedEmail = await hashData(lead.email);
      const hashedPhone = await hashData(cleanPhone);
      const hashedFn = await hashData(firstName);
      const hashedLn = await hashData(lastName);

      let eventName = eventNameOverride || "Custom";
      let value = 0;

      if (!eventNameOverride) {
        switch (lead.status) {
          case LeadStatus.NEW_LEAD: eventName = "Lead"; break;
          case LeadStatus.QUALIFIED_LEAD: eventName = "Custom Lead"; break; 
          case LeadStatus.CALL_BOOKED: eventName = "Schedule"; break;
          case LeadStatus.SHOWED_UP: eventName = "Contact"; break;
          case LeadStatus.PROPOSAL_SENT: eventName = "SubmitApplication"; break;
          case LeadStatus.CLOSED: 
            eventName = "Purchase"; 
            value = lead.value || 0;
            break;
          default: eventName = "Custom";
        }
      } else {
        if (eventNameOverride === "Purchase") {
            value = lead.value || 0;
        }
      }

      log.eventName = eventName;

      const userData: any = {
        em: hashedEmail ? [hashedEmail] : [],
        ph: hashedPhone ? [hashedPhone] : [],
        fn: hashedFn ? [hashedFn] : [],
        ln: hashedLn ? [hashedLn] : [],
        external_id: [leadIdClean] // Always send external_id for deduplication
      };

      // CRITICAL: Only include lead_id if it is strictly numeric
      if (isValidMetaId) {
        userData.lead_id = leadIdClean;
      }

      const customData: any = {
        status: lead.status,
        content_name: lead.formName || "unknown_form",
        content_category: lead.campaignName || "unknown_campaign",
        event_source: "MetaSync_CRM"
      };

      if (eventName === "Purchase") {
        customData.currency = "INR";
        customData.value = value;
      }

      const eventData: any = {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "system_generated", 
        event_id: `evt_${leadIdClean}_${eventName.replace(/\s/g, '')}_${Date.now()}`,
        user_data: userData,
        custom_data: customData
      };

      // Add Test Event Code ONLY if configured and not empty
      if (META_CONFIG.TEST_EVENT_CODE && META_CONFIG.TEST_EVENT_CODE.trim().length > 0) {
        eventData.test_event_code = META_CONFIG.TEST_EVENT_CODE.trim();
      }

      const payload: any = {
        data: [eventData]
      };
      
      log.payload = payload;
      
      console.log(`[Meta CAPI] Sending ${eventName} for Lead ${leadIdClean}`, payload);

      const url = `https://graph.facebook.com/v19.0/${META_CONFIG.PIXEL_ID}/events?access_token=${META_CONFIG.ACCESS_TOKEN}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      log.response = result;

      if (response.ok) {
        log.status = 'success';
      } else {
        log.status = 'error';
        // Enhanced Error Extraction logic
        const errBody = result.error || {};
        const userTitle = errBody.error_user_title;
        const userMsg = errBody.error_user_msg;
        const rawMsg = errBody.message;
        
        if (userTitle && userMsg) {
            log.errorMessage = `${userTitle}: ${userMsg}`;
        } else if (userMsg) {
            log.errorMessage = userMsg;
        } else {
            log.errorMessage = rawMsg || "Unknown CAPI Error";
        }
      }
    } catch (error) {
      log.status = 'error';
      log.errorMessage = error instanceof Error ? error.message : "Network Error";
    }

    return log;
  }
};