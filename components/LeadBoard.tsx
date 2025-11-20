import React, { useState } from 'react';
import { Lead, LeadStatus } from '../types';
import { PIPELINE_STAGES } from '../constants';
import { CheckCircle2, MoreHorizontal, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { LeadDetailPanel } from './LeadDetailPanel';

interface LeadBoardProps {
  leads: Lead[];
  onUpdateStatus: (id: string, status: LeadStatus) => void;
}

export const LeadBoard: React.FC<LeadBoardProps> = ({ leads, onUpdateStatus }) => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  const formatINR = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const onDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    if (draggedLeadId) {
      onUpdateStatus(draggedLeadId, status);
      setDraggedLeadId(null);
    }
  };

  const isValidText = (text: string | undefined) => {
    if (!text) return false;
    if (text.trim().startsWith('f:') || text.trim().startsWith('c:')) return false;
    return true;
  };

  const getDisplayName = (lead: Lead) => {
    const name = lead.fullName;
    if (!name) return 'Unknown Lead';
    if (name.startsWith('f:') || name.startsWith('c:')) {
      return lead.email || lead.phone || 'Unknown Lead';
    }
    return name;
  };

  return (
    <>
      <div className="h-full w-full overflow-x-auto overflow-y-hidden pb-4 custom-scrollbar bg-slate-50/50 rounded-xl border border-slate-200/60">
        <div className="flex h-full gap-6 min-w-max px-6 py-6 flex-nowrap">
          {PIPELINE_STAGES.map((status) => {
            const stageLeads = leads.filter((l) => l.status === status);
            
            return (
              <div 
                key={status} 
                className="w-80 flex-shrink-0 flex flex-col h-full"
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, status)}
              >
                {/* Column Header */}
                <div className="flex justify-between items-center mb-4 px-1 sticky top-0 z-10">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest">
                      {status}
                    </h3>
                    <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {stageLeads.length}
                    </span>
                  </div>
                </div>

                {/* List */}
                <div 
                  className={`flex-1 overflow-y-auto space-y-3 pr-2 pb-10 transition-colors duration-200 rounded-xl custom-scrollbar
                    ${draggedLeadId ? 'bg-slate-100/50 border-2 border-dashed border-slate-200 min-h-[200px]' : ''}`}
                >
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, lead.id)}
                      onClick={() => setSelectedLead(lead)}
                      className="bg-white p-4 rounded-lg shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-slate-100 hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.08)] hover:border-slate-200 transition-all cursor-grab active:cursor-grabbing group/card relative select-none"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-900 text-sm leading-tight pr-2">{getDisplayName(lead)}</h4>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {lead.value > 0 && (
                             <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                               {formatINR(lead.value)}
                             </span>
                          )}
                          {lead.capiLog && (
                            <div title={`CAPI: ${lead.capiLog.status}`}>
                              {lead.capiLog.status === 'success' && <CheckCircle2 size={16} className="text-emerald-500" />}
                              {lead.capiLog.status === 'pending' && <RefreshCw size={14} className="text-blue-400 animate-spin" />}
                              {lead.capiLog.status === 'error' && <AlertCircle size={14} className="text-red-500" />}
                            </div>
                          )}
                        </div>
                      </div>

                      {isValidText(lead.formName) && (
                        <div className="mb-2">
                           <span className="text-[10px] font-medium text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                             {lead.formName}
                           </span>
                        </div>
                      )}

                      {isValidText(lead.campaignName) && (
                        <p className="text-xs text-slate-400 mt-1 truncate">{lead.campaignName}</p>
                      )}

                      {isValidText(lead.adName) && (
                        <p className="text-[10px] text-slate-300 mt-0.5 truncate">Ad: {lead.adName}</p>
                      )}
                      
                      <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-50">
                        <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                          <Clock size={10} />
                          <span>{new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}</span>
                        </div>
                        <div className="opacity-0 group-hover/card:opacity-100 transition-opacity">
                           <MoreHorizontal size={14} className="text-slate-300" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm" onClick={() => setSelectedLead(null)}>
          <div 
            className="bg-white w-full max-w-2xl h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col border-l border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
             <LeadDetailPanel 
               lead={selectedLead} 
               onUpdateStatus={(id, status) => {
                  onUpdateStatus(id, status);
                  // Local optimistic update for the modal
                  setSelectedLead({...selectedLead, status});
               }}
               onClose={() => setSelectedLead(null)} 
             />
          </div>
        </div>
      )}
    </>
  );
};
