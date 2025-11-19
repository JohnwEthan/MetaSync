import { Lead, LeadStatus, LeadSource, CapiLog } from '../types';
import { META_CONFIG } from '../constants';

// Start with empty list
let leadsInMemory: Lead[] = [];

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

export const MetaService = {
  getLeads: async (): Promise<Lead[]> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 400));
    return [...leadsInMemory];
  },

  simulateIncomingWebhook: async (): Promise<Lead> => {
    await new Promise(resolve => setTimeout(resolve, 800));
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
    return newLead;
  },

  // Separated Update Logic from CAPI logic for cleaner handling
  updateLeadStatus: async (id: string, status: LeadStatus): Promise<{ updatedLead: Lead, capiResult: CapiLog | null }> => {
    const index = leadsInMemory.findIndex(l => l.id === id);
    if (index === -1) throw new Error("Lead not found");

    const lead = leadsInMemory[index];
    
    // If closing, assign a default value if 0
    let updatedValue = lead.value;
    if (status === LeadStatus.CLOSED && lead.value === 0) {
      updatedValue = 50000; // Default INR value if not set
    }

    // Create updated object
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

    // Send Feedback Signal to Meta CAPI only if source matches
    let capiResult: CapiLog | null = null;
    
    // Trigger CAPI if it's a Meta source or has a Meta Lead ID
    if (lead.source === LeadSource.META_INSTANT_FORM || lead.metaLeadId) {
      capiResult = await MetaService.sendConversionSignal(updatedLead);
      // Update memory with result
      updatedLead.capiLog = capiResult;
      leadsInMemory[index] = updatedLead;
    }

    return { updatedLead, capiResult };
  },

  sendConversionSignal: async (lead: Lead): Promise<CapiLog> => {
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
      // 1. Clean Lead ID
      const rawId = lead.metaLeadId || lead.id;
      const leadIdClean = rawId.replace(/^l:/, "").trim();
      
      // Only include lead_id if it looks numeric (Meta IDs are usually numeric). 
      // Sending "lead-1234" (internal ID) can cause CAPI errors or non-matching.
      const isValidMetaId = /^\d+$/.test(leadIdClean);
      
      // 2. Name Splitting
      const nameParts = lead.fullName.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

      // 3. Hashing PII
      const hashedEmail = await hashData(lead.email);
      const hashedPhone = await hashData(lead.phone);
      const hashedFn = await hashData(firstName);
      const hashedLn = await hashData(lastName);

      // 4. Map CRM Status to Meta Standard Events
      let eventName = "Custom";
      let value = 0;

      switch (lead.status) {
        case LeadStatus.NEW_LEAD: 
          eventName = "Lead"; 
          break;
        case LeadStatus.QUALIFIED_LEAD: 
          eventName = "Lead"; // Can use "QualifyLead" if custom, but standard "Lead" is safer
          break; 
        case LeadStatus.CALL_BOOKED: 
          eventName = "Schedule"; 
          break;
        case LeadStatus.SHOWED_UP: 
          eventName = "Contact"; 
          break;
        case LeadStatus.PROPOSAL_SENT: 
          eventName = "SubmitApplication"; 
          break;
        case LeadStatus.CLOSED: 
          eventName = "Purchase"; 
          value = lead.value || 0;
          break;
        default: eventName = "Custom";
      }

      log.eventName = eventName;

      // Construct User Data
      const userData: any = {
        em: hashedEmail ? [hashedEmail] : [],
        ph: hashedPhone ? [hashedPhone] : [],
        fn: hashedFn ? [hashedFn] : [],
        ln: hashedLn ? [hashedLn] : []
      };

      // Only add lead_id if valid to avoid noise/errors
      if (isValidMetaId) {
        userData.lead_id = leadIdClean;
      }

      const payload: any = {
        data: [
          {
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            action_source: "system_generated", // Best for CRM/Offline updates
            event_id: `evt_${lead.id}_${Date.now()}`, // Unique Event ID for deduplication
            user_data: userData,
            custom_data: {
              status: lead.status,
              currency: "INR",
              value: value,
              content_name: lead.formName || "unknown_form",
              content_category: lead.campaignName || "unknown_campaign",
              event_source: "MetaSync_CRM"
            }
          }
        ]
      };

      // Add Test Event Code if configured (CRITICAL for seeing events in Events Manager Test tab)
      if (META_CONFIG.TEST_EVENT_CODE) {
        payload.data[0].test_event_code = META_CONFIG.TEST_EVENT_CODE;
      }

      log.payload = payload;
      
      // Debug Log
      console.log(`[Meta CAPI] Sending ${eventName} for Lead ${leadIdClean}`, payload);

      const url = `https://graph.facebook.com/v19.0/${META_CONFIG.PIXEL_ID}/events?access_token=${META_CONFIG.ACCESS_TOKEN}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();
      log.response = responseData;
      
      if (responseData.error) {
        log.status = 'error';
        log.errorMessage = responseData.error.message || "Unknown API Error";
        console.error("[Meta CAPI] API Error:", responseData.error);
      } else {
        log.status = 'success';
      }

      return log;

    } catch (error: any) {
      log.status = 'error';
      log.errorMessage = error.message || "Network/Transmission Error";
      console.error("[Meta CAPI] Transmission Failed:", error);
      return log; 
    }
  },

  importLeadsFromCSV: async (file: File): Promise<Lead[]> => {
    return []; // Mock
  },
  
  setLeads: (leads: Lead[]) => {
    leadsInMemory = leads;
  }
};