import { Lead, LeadStatus, LeadSource } from '../types';
import { GOOGLE_SHEET_CONFIG } from '../constants';

export const GoogleSheetService = {
  syncLeads: async (): Promise<Lead[]> => {
    const { SHEET_ID, TAB_NAME, COL_INDEX } = GOOGLE_SHEET_CONFIG;
    
    // Fetching via visualization API for JSON response
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(TAB_NAME)}`;
    
    try {
      const response = await fetch(url);
      const text = await response.text();
      const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
      
      if (!jsonMatch || !jsonMatch[1]) {
        throw new Error("Could not parse Google Sheet response");
      }

      const json = JSON.parse(jsonMatch[1]);
      const rows = json.table.rows;
      
      const leads: Lead[] = rows.map((row: any, index: number) => {
        const getVal = (idx: number) => {
            if (!row.c || !row.c[idx]) return "";
            return String(row.c[idx].v || row.c[idx].f || "").trim();
        };

        const rawId = getVal(COL_INDEX.ID);
        const cleanId = rawId.replace(/^l:/, '').trim();
        
        // Status Mapping
        const rawStatus = getVal(COL_INDEX.STATUS);
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
        // If Status column says "Closed" but we have a specific value?
        // Currently value is not in sheet map, so default to 0 unless status is closed.

        // Collecting all metadata
        const formName = getVal(COL_INDEX.FORM_NAME);
        const campaignName = getVal(COL_INDEX.CAMPAIGN_NAME);
        const adName = getVal(COL_INDEX.AD_NAME);
        const adsetName = getVal(COL_INDEX.ADSET_NAME);
        const platform = getVal(COL_INDEX.PLATFORM);

        // Collect custom fields (simple dump of other columns if needed, here just storing metadata)
        
        return {
          id: cleanId || `sheet-${index}-${Date.now()}`,
          fullName: getVal(COL_INDEX.NAME) || 'Unknown Name',
          email: getVal(COL_INDEX.EMAIL),
          phone: getVal(COL_INDEX.PHONE),
          company: 'Individual', // Meta forms are usually B2C or individual
          status: status,
          source: LeadSource.META_INSTANT_FORM,
          createdAt: getVal(COL_INDEX.CREATED_TIME) || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metaLeadId: rawId,
          value: status === LeadStatus.CLOSED ? 50000 : 0, // Default value for closed if not in sheet
          formName: formName,
          campaignName: campaignName,
          adName: adName,
          adsetName: adsetName,
          platform: platform,
          notes: `Imported from campaign: ${campaignName}, Ad: ${adName}`
        };
      });

      // Filter out invalid rows
      return leads.filter(l => l.id && l.id.toLowerCase() !== 'id' && l.fullName !== 'Unknown Name');

    } catch (error) {
      console.error("Sync Error:", error);
      throw new Error("Could not sync with Google Sheets.");
    }
  }
};