import React, { useState, useEffect, useMemo } from 'react';
import { Lead, LeadStatus } from './types';
import { MetaService } from './services/metaService';
import { GoogleSheetService } from './services/googleSheetService';
import { Dashboard } from './components/Dashboard';
import { LeadBoard } from './components/LeadBoard';
import { ImportModal } from './components/ImportModal';
import { LayoutDashboard, Kanban, Import, RefreshCw, Bell, Database, Filter, ChevronDown, Zap } from 'lucide-react';

enum View {
  DASHBOARD = 'DASHBOARD',
  PIPELINE = 'PIPELINE'
}

function App() {
  const [view, setView] = useState<View>(View.DASHBOARD);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  
  // Filter State
  const [selectedForm, setSelectedForm] = useState<string>('All Forms');

  // Initial fetch
  useEffect(() => {
    loadLeads();
  }, []);

  // Auto-Sync Effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (autoSync && !isLoading) {
      handleSheetSync(true);
      interval = setInterval(() => {
        handleSheetSync(true);
      }, 30000);
    }
    return () => clearInterval(interval);
  }, [autoSync, isLoading]);

  const loadLeads = async () => {
    setIsLoading(true);
    try {
      const data = await MetaService.getLeads();
      setLeads(data);
    } catch (error) {
      console.error("Failed to load leads", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSheetSync = async (silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      const sheetLeads = await GoogleSheetService.syncLeads();
      
      if (sheetLeads.length === 0) {
        if (!silent) showNotification("Connected to Sheet, but found no rows.", "info");
      } else {
        setLeads(prev => {
          const existingIds = new Set(prev.map(l => l.id));
          // Only add leads where the ID doesn't match an existing one.
          // Since we fixed ID generation to be deterministic, this prevents duplicates.
          const newLeads = sheetLeads.filter(l => !existingIds.has(l.id));
          
          if (newLeads.length > 0) {
             if (!silent) showNotification(`Synced ${newLeads.length} new leads.`, "success");
             else showNotification(`Auto-Intake: ${newLeads.length} new leads.`, "success");
             
             const merged = [...newLeads, ...prev];
             MetaService.setLeads(merged); 
             return merged;
          }
          
          if (!silent) showNotification("Sheet is up to date.", "info");
          return prev;
        });
      }
    } catch (e) {
      console.error(e);
      if (!silent) showNotification("Sync Failed. Check Sheet permissions.", "error");
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  const handleImport = async (file: File) => {
    try {
      const newLeads = await MetaService.importLeadsFromCSV(file);
      setLeads(prev => [...newLeads, ...prev]);
      showNotification(`Imported ${newLeads.length} leads.`, "success");
    } catch (e) {
      throw e;
    }
  };

  const handleStatusUpdate = async (id: string, status: LeadStatus) => {
    // 1. Guard against duplicate updates
    const currentLead = leads.find(l => l.id === id);
    if (!currentLead) return;
    if (currentLead.status === status) return; // No change needed

    // 2. Optimistic Update: Update UI immediately
    setLeads(prev => prev.map(l => 
      l.id === id ? { ...l, status, capiLog: { status: 'pending', eventName: 'Sending...', timestamp: new Date().toISOString() } } : l
    ));

    try {
      // 3. Perform Backend/CAPI Ops
      const { updatedLead, capiResult } = await MetaService.updateLeadStatus(id, status);
      
      // 4. Reconcile State with backend result (adds CAPI Log)
      setLeads(prev => prev.map(l => l.id === id ? updatedLead : l));
      
      // Notification logic for CAPI Feedback
      if (capiResult?.status === 'success') {
         if (status === LeadStatus.CLOSED) {
           showNotification(`Deal Closed! Purchase event sent to Meta.`, "success");
         } else {
           showNotification(`Stage updated & CAPI Signal Sent (${capiResult.eventName})`, "success");
         }
      } else if (capiResult?.status === 'error') {
        showNotification(`Status updated, but CAPI failed: ${capiResult.errorMessage}`, "error");
      }
    } catch (e) {
      showNotification("Failed to update status on server.", "error");
    }
  };

  const showNotification = (msg: string, type: 'success' | 'error' | 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const formNames = useMemo(() => {
    const forms = new Set(leads.map(l => l.formName).filter(Boolean));
    return ['All Forms', ...Array.from(forms)];
  }, [leads]);

  const filteredLeads = useMemo(() => {
    if (selectedForm === 'All Forms') return leads;
    return leads.filter(l => l.formName === selectedForm);
  }, [leads, selectedForm]);

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Sidebar - Minimalist Dark */}
      <aside className="w-64 bg-[#0f172a] text-slate-300 flex flex-col fixed h-full z-20 border-r border-slate-800">
        <div className="p-6">
          <div className="flex items-center gap-3 text-white mb-8">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-900/20">M</div>
            <h1 className="text-lg font-bold tracking-tight">MetaSync</h1>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => setView(View.DASHBOARD)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all ${view === View.DASHBOARD ? 'bg-slate-800 text-white' : 'hover:text-white hover:bg-slate-800/50'}`}
            >
              <LayoutDashboard size={18} /> Dashboard
            </button>
            <button 
              onClick={() => setView(View.PIPELINE)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all ${view === View.PIPELINE ? 'bg-slate-800 text-white' : 'hover:text-white hover:bg-slate-800/50'}`}
            >
              <Kanban size={18} /> Pipeline
            </button>
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-800">
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
             <span className="text-xs font-medium text-slate-400">System Operational</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-600 uppercase font-bold tracking-wider">
            Meta CAPI Active v3.1
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen relative">
        
        {/* Top Bar */}
        <header className="flex justify-between items-center mb-10">
          <div>
             <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{view === View.DASHBOARD ? 'Overview' : 'Pipeline'}</h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Custom Dropdown for Form Filter */}
            <div className="relative group">
               <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-sm cursor-pointer hover:border-slate-300 transition-colors">
                 <Filter size={14} className="text-slate-400" />
                 <select 
                   value={selectedForm}
                   onChange={(e) => setSelectedForm(e.target.value)}
                   className="bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer appearance-none pr-6"
                 >
                   {formNames.map(f => (
                     <option key={f} value={f}>{f}</option>
                   ))}
                 </select>
                 <ChevronDown size={14} className="text-slate-400 absolute right-3 pointer-events-none" />
               </div>
            </div>

            <div className="h-6 w-px bg-slate-200 mx-1"></div>

            {/* Auto Sync */}
            <button 
                onClick={() => setAutoSync(!autoSync)}
                disabled={isLoading}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${autoSync ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'} ${isLoading ? 'opacity-50' : ''}`}
              >
                <Zap size={16} className={autoSync ? 'fill-emerald-700' : ''} />
                {autoSync ? 'Auto Sync On' : 'Auto Sync Off'}
            </button>

            <button 
              onClick={() => handleSheetSync(false)}
              disabled={isSyncing || isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:shadow-none"
            >
              {isSyncing ? <RefreshCw size={16} className="animate-spin" /> : <Database size={16} />} 
              <span>Sync</span>
            </button>
            
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Import CSV"
            >
              <Import size={20} />
            </button>
          </div>
        </header>

        {/* Toast Notification */}
        {notification && (
          <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300 border ${
            notification.type === 'error' ? 'bg-red-50 border-red-100 text-red-900' : 
            notification.type === 'success' ? 'bg-emerald-900 text-white border-emerald-800' :
            'bg-slate-900 text-white border-slate-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${notification.type === 'error' ? 'bg-red-500' : 'bg-emerald-400'}`}></div>
            <span className="text-sm font-medium">{notification.msg}</span>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="flex flex-col items-center gap-4">
               <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
               <span className="text-sm text-slate-400 font-medium">Loading Leads...</span>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500 slide-in-from-bottom-4 h-full">
            {view === View.DASHBOARD && <Dashboard leads={filteredLeads} />}
            {view === View.PIPELINE && (
               <div className="h-[calc(100vh-180px)]">
                 <LeadBoard leads={filteredLeads} onUpdateStatus={handleStatusUpdate} />
               </div>
            )}
          </div>
        )}
      </main>

      <ImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onImport={handleImport}
      />
    </div>
  );
}

export default App;