import React, { useState, useMemo } from 'react';
import { Lead, LeadStatus } from '../types';
import { LeadDetailPanel } from './LeadDetailPanel';
import { Search, User, ChevronRight } from 'lucide-react';

interface ContactsViewProps {
  leads: Lead[];
  onUpdateStatus: (id: string, status: LeadStatus) => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({ leads, onUpdateStatus }) => {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLeads = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return leads.filter(lead => {
       const name = lead.fullName?.toLowerCase() || '';
       const email = lead.email?.toLowerCase() || '';
       const phone = lead.phone?.toLowerCase() || '';
       return name.includes(query) || email.includes(query) || phone.includes(query);
    });
  }, [leads, searchQuery]);

  const selectedLead = useMemo(() => 
    leads.find(l => l.id === selectedLeadId), 
  [leads, selectedLeadId]);

  const getDisplayName = (l: Lead) => {
    if (l.fullName && !l.fullName.startsWith('f:') && !l.fullName.startsWith('c:')) return l.fullName;
    return l.email || l.phone || 'Unknown Lead';
  };

  return (
    <div className="flex h-full border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Left Pane: Contact List */}
      <div className={`flex flex-col border-r border-slate-100 bg-slate-50/50 ${selectedLeadId ? 'w-1/3 hidden md:flex' : 'w-full md:w-1/3'}`}>
        
        {/* Search Header */}
        <div className="p-4 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input 
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg pl-9 pr-4 py-2.5 focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {filteredLeads.map(lead => (
            <button
              key={lead.id}
              onClick={() => setSelectedLeadId(lead.id)}
              className={`w-full text-left p-3 rounded-lg flex items-center justify-between group transition-all
                ${selectedLeadId === lead.id 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'hover:bg-white hover:shadow-sm text-slate-600'}`}
            >
              <div className="min-w-0 flex-1 pr-4">
                <div className={`font-bold text-sm truncate mb-0.5 ${selectedLeadId === lead.id ? 'text-white' : 'text-slate-800'}`}>
                  {getDisplayName(lead)}
                </div>
                <div className={`text-xs truncate ${selectedLeadId === lead.id ? 'text-slate-400' : 'text-slate-500'}`}>
                   {lead.email || lead.phone}
                </div>
              </div>
              <div className="flex-shrink-0">
                 {selectedLeadId === lead.id ? (
                   <ChevronRight size={16} className="text-slate-400" />
                 ) : (
                   <div className={`text-[10px] px-2 py-1 rounded-full border ${
                      lead.status === LeadStatus.NEW_LEAD ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                      lead.status === LeadStatus.CLOSED ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      'bg-slate-100 text-slate-500 border-slate-200'
                   }`}>
                     {lead.status}
                   </div>
                 )}
              </div>
            </button>
          ))}
          
          {filteredLeads.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">
               No contacts found.
            </div>
          )}
        </div>
        
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-400 text-center">
          Showing {filteredLeads.length} contacts
        </div>
      </div>

      {/* Right Pane: Detail View */}
      <div className={`flex-1 bg-white flex flex-col ${!selectedLeadId ? 'hidden md:flex' : 'flex'}`}>
        {selectedLead ? (
          <>
             {/* Mobile Back Button Header (Only visible on small screens when selected) */}
             <div className="md:hidden p-4 border-b border-slate-100 flex items-center gap-2 text-slate-500" onClick={() => setSelectedLeadId(null)}>
                <ChevronRight size={20} className="rotate-180" />
                <span className="font-bold text-sm">Back to List</span>
             </div>
             <LeadDetailPanel 
               lead={selectedLead} 
               onUpdateStatus={onUpdateStatus}
               // Close on mobile goes back to list
               onClose={() => setSelectedLeadId(null)} 
             />
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 p-10">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <User size={32} className="text-slate-200" />
            </div>
            <p className="font-medium">Select a contact to view details</p>
          </div>
        )}
      </div>
    </div>
  );
};
