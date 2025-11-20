import React, { useState } from 'react';
import { Lead, LeadStatus } from '../types';
import { PIPELINE_STAGES } from '../constants';
import { analyzeLeadWithGemini } from '../services/geminiService';
import { 
  Mail, Phone, Globe, Calendar, Database, Tag, Layers, 
  Megaphone, FileText, Activity, Bot, CheckCircle2, 
  AlertCircle, RefreshCw, X, ArrowRight, Grid
} from 'lucide-react';

interface LeadDetailPanelProps {
  lead: Lead;
  onUpdateStatus: (id: string, status: LeadStatus) => void;
  onClose?: () => void;
}

export const LeadDetailPanel: React.FC<LeadDetailPanelProps> = ({ lead, onUpdateStatus, onClose }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const result = await analyzeLeadWithGemini(lead.notes || "No notes available", lead.source);
    setAnalysisResult(result);
    setIsAnalyzing(false);
  };

  const formatINR = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  
  const getDisplayName = (l: Lead) => {
    if (l.fullName && !l.fullName.startsWith('f:') && !l.fullName.startsWith('c:')) return l.fullName;
    return l.email || l.phone || 'Unknown Lead';
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-start bg-white sticky top-0 z-10">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <h2 className="text-xl font-bold text-slate-900 tracking-tight">{getDisplayName(lead)}</h2>
             {lead.value > 0 && (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100">
                  {formatINR(lead.value)}
                </span>
             )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className={`w-2 h-2 rounded-full ${lead.status === LeadStatus.CLOSED ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
            <span className="uppercase tracking-wide">{lead.status}</span>
            <span className="text-slate-300">|</span>
            <span className="font-mono text-slate-400">ID: {lead.id.replace('lead-', '')}</span>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-md hover:bg-slate-50 transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        
        {/* Pipeline Status Stepper */}
        <div className="mb-8">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Pipeline Stage</label>
          <div className="flex flex-wrap gap-2">
            {PIPELINE_STAGES.map(stage => (
              <button
                key={stage}
                onClick={() => onUpdateStatus(lead.id, stage)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all border flex items-center gap-2
                  ${lead.status === stage 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
              >
                {stage}
                {lead.status === stage && <CheckCircle2 size={12} />}
              </button>
            ))}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           
           {/* Column 1: Contact & Personal */}
           <div className="space-y-6">
              <Section title="Contact Details" icon={<Database size={14} />}>
                <InfoRow icon={<Mail size={14} />} label="Email" value={lead.email} />
                <InfoRow icon={<Phone size={14} />} label="Phone" value={lead.phone} />
                <InfoRow icon={<Globe size={14} />} label="Source" value={lead.platform || lead.source} />
                <InfoRow icon={<Calendar size={14} />} label="Created" value={new Date(lead.createdAt).toLocaleString()} />
              </Section>

              <Section title="Meta Metadata" icon={<Layers size={14} />}>
                <InfoRow icon={<Tag size={14} />} label="Ad Name" value={lead.adName} />
                <InfoRow icon={<Grid size={14} />} label="Ad Set" value={lead.adsetName} />
                <InfoRow icon={<Megaphone size={14} />} label="Campaign" value={lead.campaignName} />
                <InfoRow icon={<FileText size={14} />} label="Form Name" value={lead.formName} />
              </Section>
           </div>

           {/* Column 2: AI & System */}
           <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-3">
                   <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <Bot size={14} /> AI Analysis
                  </label>
                  <button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 disabled:opacity-50"
                  >
                    {isAnalyzing ? <RefreshCw size={10} className="animate-spin" /> : <Activity size={10} />}
                    {isAnalyzing ? 'Thinking...' : 'GENERATE'}
                  </button>
                </div>
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-4 text-sm text-slate-700 leading-relaxed min-h-[100px]">
                   {analysisResult ? (
                     <p>{analysisResult}</p>
                   ) : (
                     <p className="text-slate-400 italic text-xs">Click Generate to analyze lead quality based on available data.</p>
                   )}
                </div>
              </div>

              {/* CAPI Logs */}
              <div>
                <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  <Activity size={14} /> Conversion API
                </label>
                <div className="bg-slate-900 rounded-lg p-4 text-xs font-mono text-slate-300 overflow-hidden">
                  {lead.capiLog ? (
                     <div className="space-y-3">
                       <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                         <div className="flex items-center gap-2">
                           <span className={
                             lead.capiLog.status === 'success' ? 'text-emerald-400' :
                             lead.capiLog.status === 'error' ? 'text-red-400' : 'text-blue-400'
                           }>
                             ● {lead.capiLog.status.toUpperCase()}
                           </span>
                         </div>
                         <span className="text-slate-500 text-[10px]">{new Date(lead.capiLog.timestamp).toLocaleTimeString()}</span>
                       </div>
                       
                       <div>
                         <div className="text-slate-500 text-[10px] mb-1">EVENT</div>
                         <div className="text-white font-bold">{lead.capiLog.eventName}</div>
                       </div>

                       {lead.capiLog.errorMessage && (
                         <div>
                            <div className="text-slate-500 text-[10px] mb-1">ERROR</div>
                            <div className="text-red-400 leading-tight">{lead.capiLog.errorMessage}</div>
                         </div>
                       )}
                       
                       {!lead.capiLog.errorMessage && lead.capiLog.status === 'success' && (
                         <div className="text-emerald-500/80 text-[10px] flex items-center gap-1">
                           <CheckCircle2 size={10} /> Signal processed by Meta
                         </div>
                       )}
                     </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4 text-slate-600 gap-2">
                       <AlertCircle size={16} />
                       <span>No events synced yet.</span>
                    </div>
                  )}
                </div>
              </div>
           </div>
        </div>

        {/* Notes Section */}
        <div className="mt-8">
           <Section title="Notes / Raw Data" icon={<FileText size={14} />}>
             <div className="p-3 bg-slate-50 rounded text-sm text-slate-600 whitespace-pre-wrap font-mono">
               {lead.notes || "No additional notes."}
             </div>
           </Section>
        </div>

      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div>
    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
      {icon} {title}
    </label>
    <div className="space-y-2">
      {children}
    </div>
  </div>
);

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value?: string }> = ({ icon, label, value }) => {
  if (!value) return null;
  return (
    <div className="group flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-white hover:border-slate-200 transition-colors">
      <div className="flex items-center gap-3">
        <div className="text-slate-400">{icon}</div>
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide w-20">{label}</div>
      </div>
      <div className="text-sm font-medium text-slate-900 text-right truncate max-w-[180px]" title={value}>{value}</div>
    </div>
  );
};