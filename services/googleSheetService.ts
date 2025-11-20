import { Lead, LeadStatus, LeadSource } from '../types';
import { GOOGLE_SHEET_CONFIG } from '../constants';

export const GoogleSheetService = {
  syncLeads: async (): Promise<Lead[]> => {
    const { SHEET_ID, SHEET_TABS, HEADER_MAPPING } = GOOGLE_SHEET_CONFIG;
    
    let allLeads: Lead[] = [];

    try {
      // Fetch all tabs in parallel using GIDs or Sheet Names
      const tabPromises = SHEET_TABS.map(async (tabInfo: any) => {
        let url = '';
        
        // Construct URL based on available identifier (GID preferred, Name fallback)
        if (tabInfo.gid) {
          url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${tabInfo.gid}`;
        } else if (tabInfo.sheetName) {
          url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabInfo.sheetName)}`;
        } else {
          return [];
        }
        
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`Could not fetch tab: ${tabInfo.name}`);
          return [];
        }

        const text = await response.text();
        // Parse the Google Viz response
        const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
        
        if (!jsonMatch || !jsonMatch[1]) {
          console.warn(`Could not parse response for tab: ${tabInfo.name}`);
          return [];
        }

        const json = JSON.parse(jsonMatch[1]);
        const rows = json.table.rows;
        
        if (!rows || rows.length === 0) return [];

        // --- DYNAMIC COLUMN MAPPING ---
        // 1. Extract Headers from the first row (or table labels if available)
        let headerRowValues: string[] = [];
        
        // Check if cols metadata has labels
        const hasLabels = json.table.cols.some((c: any) => c.label && c.label !== '');
        if (hasLabels) {
          headerRowValues = json.table.cols.map((c: any) => c.label ? c.label.toLowerCase() : '');
        } else {
          // Assume first row is header
          const firstRow = rows[0];
          headerRowValues = firstRow.c.map((cell: any) => cell?.v?.toString().toLowerCase() || "");
        }

        // 2. Find Indices for key fields
        const findIndex = (keywords: string[]) => {
          return headerRowValues.findIndex(h => keywords.some(k => h.includes(k)));
        };

        const idx = {
          ID: findIndex(HEADER_MAPPING.ID),
          CREATED: findIndex(HEADER_MAPPING.CREATED_TIME),
          NAME: findIndex(HEADER_MAPPING.NAME),
          FIRST_NAME: findIndex(HEADER_MAPPING.FIRST_NAME),
          LAST_NAME: findIndex(HEADER_MAPPING.LAST_NAME),
          EMAIL: findIndex(HEADER_MAPPING.EMAIL),
          PHONE: findIndex(HEADER_MAPPING.PHONE),
          PLATFORM: findIndex(HEADER_MAPPING.PLATFORM),
          FORM: findIndex(HEADER_MAPPING.FORM_NAME),
          CAMPAIGN: findIndex(HEADER_MAPPING.CAMPAIGN_NAME),
          AD: findIndex(HEADER_MAPPING.AD_NAME),
          STATUS: findIndex(HEADER_MAPPING.STATUS)
        };

        // If we used the first row as header, start data from index 1
        const startIndex = hasLabels ? 0 : 1;
        const dataRows = rows.slice(startIndex);

        return dataRows.map((row: any, index: number) => {
          const getVal = (colIndex: number) => {
              if (colIndex === -1 || !row.c || !row.c[colIndex]) return "";
              return String(row.c[colIndex].v || row.c[colIndex].f || "").trim();
          };

          const rawId = getVal(idx.ID);
          const cleanId = rawId.replace(/^l:/, '').trim();
          
          const email = getVal(idx.EMAIL);
          const phone = getVal(idx.PHONE);

          // Status Mapping
          const rawStatus = getVal(idx.STATUS);
          let status = LeadStatus.NEW_LEAD;
          
          // Fuzzy match status string from sheet to Enum
          const normalizedRaw = rawStatus.toLowerCase().replace(/\s+/g, '');
          for (const key in LeadStatus) {
            const enumVal = LeadStatus[key as keyof typeof LeadStatus];
            if (enumVal.toLowerCase().replace(/\s+/g, '') === normalizedRaw) {
              status = enumVal;
              break;
            }
          }

          // Name Logic: Support Full Name OR First + Last
          let fullName = getVal(idx.NAME);
          if (!fullName || fullName === "") {
            const first = getVal(idx.FIRST_NAME);
            const last = getVal(idx.LAST_NAME);
            if (first || last) {
              fullName = `${first} ${last}`.trim();
            }
          }
          if (!fullName) fullName = 'Unknown Name';

          // STABLE ID GENERATION
          // Priority: 1. Explicit Meta Lead ID -> 2. Email Hash -> 3. Phone Hash -> 4. Sheet Row Fallback
          // This prevents leads from resetting status when rows are moved/deleted in the sheet.
          let finalId = cleanId;
          const tabIdentifier = tabInfo.gid || tabInfo.sheetName?.replace(/\s/g, '') || 'unknown';
          
          if (!finalId) {
             if (email && email.length > 3) {
                // Simple deterministic generation based on email
                const safeEmail = email.toLowerCase().replace(/[^a-z0-9@.]/g, '');
                finalId = `lead_e_${safeEmail}`; 
             } else if (phone && phone.length > 5) {
                const safePhone = phone.replace(/\D/g, '');
                finalId = `lead_p_${safePhone}`;
             } else {
                // Fallback to row index (volatile if rows move)
                finalId = `sheet_${tabIdentifier}_row_${index + startIndex}`;
             }
          }

          return {
            id: finalId,
            fullName: fullName,
            email: email,
            phone: phone,
            company: 'Individual',
            status: status,
            source: LeadSource.META_INSTANT_FORM,
            createdAt: getVal(idx.CREATED) || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metaLeadId: rawId, // Keep original raw ID for reference
            value: status === LeadStatus.CLOSED ? 50000 : 0,
            formName: getVal(idx.FORM) || tabInfo.name, // Fallback to tab name
            campaignName: getVal(idx.CAMPAIGN),
            adName: getVal(idx.AD),
            platform: getVal(idx.PLATFORM),
            notes: `Imported from ${tabInfo.name}`
          };
        }).filter((l: Lead) => (l.email || l.phone) && l.fullName !== 'Unknown Name'); // Basic validity check
      });

      const results = await Promise.all(tabPromises);
      
      // Flatten array
      results.forEach(tabLeads => {
        allLeads = [...allLeads, ...tabLeads];
      });

      // Deduplicate in case multiple tabs contain same leads
      const uniqueLeads = new Map();
      allLeads.forEach(l => {
         uniqueLeads.set(l.id, l);
      });

      return Array.from(uniqueLeads.values());

    } catch (error) {
      console.error("Sync Error:", error);
      throw new Error("Could not sync with Google Sheets.");
    }
  }
};