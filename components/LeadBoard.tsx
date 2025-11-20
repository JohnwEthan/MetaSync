import React, { useState } from 'react';
import { Lead, LeadStatus } from '../types';
import { PIPELINE_STAGES } from '../constants';
import { Mail, Bot, CheckCircle2, IndianRupee, Clock, MoreHorizontal, RefreshCw, AlertCircle, Activity } from 'lucide-react';
import { analyzeLeadWithGemini } from '../services/geminiService';

interface LeadBoardProps {
  leads: Lead[];
  onUpdateStatus: (id: string, status: LeadStatus) => void;
}

export const LeadBoard: React.FC<LeadBoardProps> = ({ leads, onUpdateStatus }) => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setAnalysisResult(null);
  };

  const handleAnalyze = async () => {
    if (!selectedLead) return;
    setIsAnalyzing(true);
    const result = await analyzeLeadWithGemini(selectedLead.notes || "No notes available", selectedLead.source);
    setAnalysisResult(result);
    setIsAnalyzing(false);
  };

  const formatINR = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  // Drag and Drop Handlers
  const onDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Crucial for allowing drop
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    if (draggedLeadId) {
      onUpdateStatus(draggedLeadId, status);
      setDraggedLeadId(null);
    }
  };

  // Helper to determine if we should show form/campaign text
  const isValidText = (text: string | undefined) => {
    if (!text) return false;
    // Hide if it looks like a raw ID (starts with f: or c: followed by numbers)
    if (text.trim().startsWith('f:') || text.trim().startsWith('c:')) return false;
    return true;
  };

  // Helper for Display Name (fallback if name looks like an ID)
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
      {/* Kanban Container - Horizontal Scroll for the whole board */}
      <div className="h-full w-full overflow-x-auto overflow-y-hidden pb-4 custom-scrollbar bg-slate-50/50 rounded-xl border border-slate-100">
        <div className="flex h-full gap-6 min-w-max px-4 py-4 flex-nowrap">
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

                {/* Drop Zone / List - Vertical Scroll inside each column */}
                <div 
                  className={`flex-1 overflow-y-auto space-y-3 pr-2 pb-10 transition-colors duration-200 rounded-xl custom-scrollbar
                    ${draggedLeadId ? 'bg-slate-100/50 border-2 border-dashed border-slate-200 min-h-[200px]' : ''}`}
                >
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, lead.id)}
                      onClick={() => handleLeadClick(lead)}
                      className="bg-white p-4 rounded-lg shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-slate-100 hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.1)] hover:border-blue-200 transition-all cursor-grab active:cursor-grabbing group/card relative select-none"
                    >
                      {/* Top Row: Name & CAPI/Value */}
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-900 text-base leading-tight pr-2">{getDisplayName(lead)}</h4>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {lead.value > 0 && (
                             <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                               {formatINR(lead.value)}
                             </span>
                          )}
                          {/* CAPI Status Indicator on Card */}
                          {lead.capiLog && (
                            <div title={`CAPI: ${lead.capiLog.status} - ${lead.capiLog.eventName} - ${lead.capiLog.errorMessage || 'OK'}`}>
                              {lead.capiLog.status === 'success' && <CheckCircle2 size={16} className="text-emerald-500" />}
                              {lead.capiLog.status === 'pending' && <RefreshCw size={14} className="text-blue-400 animate-spin" />}
                              {lead.capiLog.status === 'error' && <AlertCircle size={14} className="text-red-500" />}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Second Row: Form Name - Only show if it's a real name, not an ID */}
                      {isValidText(lead.formName) && (
                        <div className="mb-2">
                           <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50">
                             {lead.formName}
                           </span>
                        </div>
                      )}

                      {/* Campaign Info - Hide if it's a raw ID */}
                      {isValidText(lead.campaignName) && (
                        <p className="text-xs text-slate-400 mt-1 truncate">{lead.campaignName}</p>
                      )}

                      {/* Ad Name - Added */}
                      {isValidText(lead.adName) && (
                        <p className="text-[10px] text-slate-300 mt-0.5 truncate">Ad: {lead.adName}</p>
                      )}
                      
                      {/* Footer */}
                      <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-50">
                        <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                          <Clock size={10} />
                          <span>{new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}</span>
                        </div>
                        <div className="opacity-0 group-hover/card:opacity-100 transition-opacity">
                           <MoreHorizontal size={14} className="text-slate-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                  {stageLeads.length === 0 && !draggedLeadId && (
                    <div className="h-24 border-2 border-dashed border-slate-100 rounded-lg flex items-center justify-center">
                      <span className="text-xs text-slate-300 font-medium">Empty Stage</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lead Detail Slide-over / Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-[2px]" onClick={() => setSelectedLead(null)}>
          <div 
            className="bg-white w-full max-w-2xl h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start bg-white">
              <div>
                <div className="flex items-center gap-3 mb-1">
                   <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{getDisplayName(selectedLead)}</h2>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium uppercase tracking-wide">
                  <span className={`w-2 h-2 rounded-full ${selectedLead.status === LeadStatus.CLOSED ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
                  {selectedLead.status}
                  <span className="text-slate-300">|</span>
                  <span>ID: {selectedLead.id.replace('lead-', '')}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLead(null)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-50 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              
              {/* Quick Actions / Status Pipeline */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Pipeline Stage</label>
                <div className="flex flex-wrap gap-2">
                  {PIPELINE_STAGES.map(stage => (
                    <button
                      key={stage}
                      onClick={() => {
                        onUpdateStatus(selectedLead.id, stage);
                        // Optimistically update modal state locally while parent updates
                        setSelectedLead({...selectedLead, status: stage, capiLog: { status: 'pending', timestamp: '', eventName: 'Sending...' } as any});
                      }}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-all border 
                        ${selectedLead.status === stage 
                          ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                      {stage}
                    </button>
                  ))}
                </div>
              </div>

              {/* Two Column Grid */}
              <div className="grid grid-cols-2 gap-8">
                 <div className="space-y-6">
                    <div>
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                        <Mail size={12} /> Contact Details
                      </label>
                      <div className="space-y-3">
                        <div className="group flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:border-blue-200 transition-colors">
                          <div>
                            <div className="text-[10px] text-slate-400 uppercase font-semibold">Email</div>
                            <div className="text-sm font-medium text-slate-900">{selectedLead.email}</div>
                          </div>
                        </div>
                        <div className="group flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:border-blue-200 transition-colors">
                          <div>
                            <div className="text-[10px] text-slate-400 uppercase font-semibold">Phone</div>
                            <div className="text-sm font-medium text-slate-900">{selectedLead.phone}</div>
                          </div>
                        </div>
                        {selectedLead.formName && (
                          <div className="group flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:border-blue-200 transition-colors">
                            <div>
                              <div className="text-[10px] text-slate-400 uppercase font-semibold">Source Form</div>
                              <div className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{selectedLead.formName}</div>
                            </div>
                          </div>
                        )}
                        {selectedLead.adName && (
                          <div className="group flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:border-blue-200 transition-colors">
                            <div>
                              <div className="text-[10px] text-slate-400 uppercase font-semibold">Ad Name</div>
                              <div className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{selectedLead.adName}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div>
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                        <IndianRupee size={12} /> Deal Value
                      </label>
                      <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl flex flex-col items-center justify-center text-center">
                         <div className="text-3xl font-bold text-emerald-700 mb-1">
                           {selectedLead.value ? formatINR(selectedLead.value) : '₹0'}
                         </div>
                         <div className="text-xs text-emerald-600 font-medium">Potential Revenue</div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-3">
                         <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          <Bot size={12} /> AI Insights
                        </label>
                        <button 
                          onClick={handleAnalyze}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                        >
                          {isAnalyzing ? 'Running...' : 'REFRESH'}
                        </button>
                      </div>
                      <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-4 text-sm text-slate-700 leading-relaxed">
                         {analysisResult || "No analysis generated yet."}
                      </div>
                    </div>
                 </div>
              </div>

              {/* Meta CAPI Feedback Log */}
              <div className="border-t border-slate-100 pt-6">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  <Activity size={12} /> Meta Conversions API Log
                </label>
                <div className="bg-slate-900 rounded-lg p-4 text-xs font-mono text-slate-300 overflow-x-auto">
                  {selectedLead.capiLog ? (
                     <div className="space-y-2">
                       <div className="flex items-center gap-2">
                         <span className={
                           selectedLead.capiLog.status === 'success' ? 'text-emerald-400' :
                           selectedLead.capiLog.status === 'error' ? 'text-red-400' : 'text-blue-400'
                         }>
                           [{selectedLead.capiLog.status.toUpperCase()}]
                         </span>
                         <span>{new Date(selectedLead.capiLog.timestamp).toLocaleTimeString()}</span>
                         <span className="text-slate-500">Event:</span>
                         <span className="text-white font-bold">{selectedLead.capiLog.eventName}</span>
                       </div>
                       {selectedLead.capiLog.errorMessage && (
                         <div className="text-red-400">Error: {selectedLead.capiLog.errorMessage}</div>
                       )}
                       {selectedLead.capiLog.response && (
                         <div className="mt-2 pt-2 border-t border-slate-800">
                           <div className="text-slate-500 mb-1">Server Response:</div>
                           <pre className="text-[10px] text-emerald-400/80">{JSON.stringify(selectedLead.capiLog.response, null, 2)}</pre>
                         </div>
                       )}
                       {selectedLead.capiLog.payload && (
                           <div className="mt-2 pt-2 border-t border-slate-800">
                               <div className="text-slate-500 mb-1">Payload Sent:</div>
                               <pre className="text-[10px] text-blue-400/80">{JSON.stringify(selectedLead.capiLog.payload, null, 2)}</pre>
                           </div>
                       )}
                     </div>
                  ) : (
                    <div className="text-slate-500 italic">No sync events recorded for this session.</div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
};