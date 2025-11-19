import React, { useState } from 'react';
import { Upload, X, FileText, Check, AlertTriangle } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<void>;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }
    setIsUploading(true);
    try {
      await onImport(file);
      setFile(null);
      onClose();
    } catch (err) {
      setError("Failed to import leads. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800">Import Leads</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-6">
             <p className="text-sm text-slate-600 mb-4">Upload a CSV file containing lead data (Name, Email, Phone, Status). We will auto-map the columns.</p>
             
             <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors relative">
                <input 
                  type="file" 
                  accept=".csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {file ? (
                  <div className="flex flex-col items-center text-blue-600">
                    <FileText size={32} className="mb-2" />
                    <span className="font-medium text-sm">{file.name}</span>
                    <span className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-slate-400">
                    <Upload size={32} className="mb-2" />
                    <span className="font-medium text-sm">Click to Upload CSV</span>
                  </div>
                )}
             </div>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
             <button 
               onClick={onClose} 
               className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
             >
               Cancel
             </button>
             <button 
               onClick={handleUpload}
               disabled={!file || isUploading}
               className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
             >
               {isUploading ? 'Importing...' : 'Start Import'}
               {!isUploading && <Check size={16} />}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};