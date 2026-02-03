import React, { useState, useEffect, useRef } from 'react';
import { Save, Plus, Trash2, Settings as SettingsIcon, LayoutList, Eye, EyeOff, CheckCircle2, Table as TableIcon, LayoutGrid, X, FileUp, Database, Download, Upload, RefreshCw, FileType, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { Trade, TradeStatus, TradeSide, MarginType, AppSettings, FundingRecord } from '../types';
import { calculateMetrics, parseTradesCSV, parseFundingCSV, readFileContent } from '../services/tradingService';

interface AdminPanelProps {
  currentTrades: Trade[];
  currentFunding: FundingRecord[];
  currentSettings: AppSettings;
  onSave: (trades: Trade[], funding: FundingRecord[], settings: AppSettings) => Promise<void>;
  onClose: () => void;
}

// Drag & Drop Component
const FileDropZone = ({ onFileSelect, label, icon: Icon, acceptedFileTypes, file }: any) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div 
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300
        ${isDragging ? 'border-primary bg-primary/10 scale-[1.02]' : 'border-white/20 bg-black/20 hover:bg-black/40 hover:border-white/30'}
        ${file ? 'border-emerald-500/50 bg-emerald-500/5' : ''}
      `}
    >
      <input 
        ref={inputRef}
        type="file" 
        accept={acceptedFileTypes}
        onChange={handleChange}
        className="hidden" 
      />
      
      {file ? (
        <div className="flex flex-col items-center animate-in zoom-in duration-300">
           <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
             <Check className="w-6 h-6 text-emerald-500" />
           </div>
           <span className="text-sm font-bold text-white mb-1">{file.name}</span>
           <span className="text-[10px] text-slate-400 font-mono">{(file.size / 1024).toFixed(1)} KB</span>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center">
           <Icon className={`w-8 h-8 mb-3 transition-colors ${isDragging ? 'text-primary' : 'text-slate-500'}`} />
           <span className="text-sm font-bold text-slate-300 mb-1">{label}</span>
           <span className="text-[10px] text-slate-500">Drag & Drop or Click to Upload</span>
           <span className="text-[9px] text-slate-600 mt-2 font-mono bg-black/40 px-2 py-1 rounded">CSV Only</span>
        </div>
      )}
    </div>
  );
};

const MetricsPreview = ({ trade }: { trade: Trade }) => {
  const { pnl, roe, netProfit } = calculateMetrics(trade);
  return (
    <div className="bg-black/40 p-3 rounded-lg border border-white/5 mt-2 space-y-2">
       <div className="grid grid-cols-2 gap-3 pb-2 border-b border-white/5">
          <div>
            <span className="text-[9px] text-slate-500 uppercase block tracking-wider mb-0.5">Gross P&L</span>
            <span className={`text-xs font-mono font-black ${pnl >= 0 ? 'text-primary' : 'text-secondary'}`}>
              {pnl > 0 ? '+' : ''}{pnl.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 uppercase block tracking-wider mb-0.5">ROE %</span>
            <span className={`text-xs font-mono font-black ${roe >= 0 ? 'text-primary' : 'text-secondary'}`}>
              {roe > 0 ? '+' : ''}{roe.toFixed(2)}%
            </span>
          </div>
       </div>
       <div className="flex justify-between items-center pt-1">
          <span className="text-[9px] text-slate-400 uppercase font-bold">Real Profit (Net)</span>
          <span className={`text-sm font-mono font-black ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
             {netProfit > 0 ? '+' : ''}{netProfit.toFixed(2)}
          </span>
       </div>
    </div>
  );
};

const AdminPanel: React.FC<AdminPanelProps> = ({ currentTrades, currentFunding = [], currentSettings, onSave, onClose }) => {
  const [activeTab, setActiveTab] = useState<'trades' | 'imports' | 'config'>('trades');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  const [trades, setTrades] = useState<Trade[]>(currentTrades);
  const [funding, setFunding] = useState<FundingRecord[]>(currentFunding);
  const [settings, setSettings] = useState<AppSettings>(currentSettings);
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // File Input Refs
  const [tradeFile, setTradeFile] = useState<File | null>(null);
  const [fundingFile, setFundingFile] = useState<File | null>(null);

  useEffect(() => {
    setTrades(currentTrades);
    setFunding(currentFunding);
    setSettings(currentSettings);
  }, [currentTrades, currentFunding, currentSettings]);

  const handleAddTrade = () => {
    const newTrade: Trade = {
      id: `NEW-${Date.now()}`,
      transactionId: '',
      pair: 'BTC/USDT',
      side: TradeSide.LONG,
      marginType: MarginType.ISOLATED,
      leverage: 10,
      entryPrice: 0,
      exitPrice: 0,
      quantity: 0,
      amountSymbol: 'BTC',
      openFee: 0,
      closeFee: 0,
      fundingFee: 0,
      status: TradeStatus.OPEN,
      openTime: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    setTrades([newTrade, ...trades]);
  };

  const updateTrade = (id: string, field: keyof Trade, value: any) => {
    setTrades(prevTrades => prevTrades.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const removeTrade = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setTrades(prevTrades => prevTrades.filter(t => t.id !== id));
  };
  
  const removeAllTrades = () => {
      if (window.confirm("Are you sure you want to delete ALL trades? This cannot be undone.")) {
          setTrades([]);
      }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('Syncing...');
    try {
        await onSave(trades, funding, settings);
        setSaveStatus('Saved!');
        setTimeout(() => setSaveStatus(null), 2000);
    } catch (e) {
        setSaveStatus('Error!');
    } finally {
        setIsSaving(false);
    }
  };

  const handleProcessTradeImport = async () => {
    if (!tradeFile) return;
    try {
      const content = await readFileContent(tradeFile);
      const newTrades = parseTradesCSV(content);
      if (newTrades.length > 0) {
          setTrades(prev => [...newTrades, ...prev]); 
          setTradeFile(null);
          alert(`Successfully imported ${newTrades.length} trades.`);
      } else {
          alert("No valid trades found. Check the file format.");
      }
    } catch (e: any) {
      alert(e.message || "Error reading file.");
    }
  };

  const handleProcessFundingImport = async () => {
    if (!fundingFile) return;
    try {
      const content = await readFileContent(fundingFile);
      const newRecords = parseFundingCSV(content);
      if (newRecords.length > 0) {
          setFunding(prev => [...newRecords, ...prev]);
          setFundingFile(null);
          alert(`Successfully imported ${newRecords.length} funding records.`);
      } else {
          alert("No valid funding records found.");
      }
    } catch (e: any) {
      alert(e.message || "Error reading file.");
    }
  };

  const DEFAULT_PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'BNB/USDT'];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-[#0a0b10] w-full max-w-6xl h-[95dvh] sm:h-[90vh] rounded-t-2xl sm:rounded-2xl border-t sm:border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 sm:fade-in sm:zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0f1116] shrink-0">
          <div className="flex items-center justify-between w-full sm:w-auto gap-6">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">Backend</h2>
              <p className="text-[10px] sm:text-xs text-slate-500 font-mono">SUPABASE CONNECTED</p>
            </div>
            
            <div className="flex bg-black/50 p-1 rounded-lg border border-white/5">
              <button 
                onClick={() => setActiveTab('trades')}
                className={`px-3 sm:px-4 py-1.5 rounded-md text-[10px] sm:text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'trades' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <LayoutList className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Trades</span>
              </button>
              <button 
                onClick={() => setActiveTab('imports')}
                className={`px-3 sm:px-4 py-1.5 rounded-md text-[10px] sm:text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'imports' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <FileUp className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Imports</span>
              </button>
              <button 
                onClick={() => setActiveTab('config')}
                className={`px-3 sm:px-4 py-1.5 rounded-md text-[10px] sm:text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'config' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <SettingsIcon className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Config</span>
              </button>
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={onClose} 
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors border border-transparent hover:border-white/10 rounded-lg flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" /> Close
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 sm:flex-none px-6 py-2 bg-primary text-black text-xs font-black uppercase tracking-wider rounded-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 min-w-[140px] disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveStatus ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saveStatus || 'Sync to Cloud'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-[#06070a]">
          
          {/* TRADES TAB */}
          {activeTab === 'trades' && (
            <>
              <div className="flex justify-between items-center mb-6 sticky top-0 bg-[#06070a] z-10 py-2 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest">Trade Entries ({trades.length})</h3>
                    <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-primary/20 text-primary' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-primary/20 text-primary' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <TableIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {trades.length > 0 && (
                        <button 
                          onClick={removeAllTrades}
                          className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-3 py-2 rounded-lg text-[10px] sm:text-xs font-bold text-rose-500 transition-all mr-2"
                        >
                           <Trash2 className="w-4 h-4" /> Clear All
                        </button>
                    )}
                    <button 
                      onClick={handleAddTrade}
                      className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 rounded-lg text-[10px] sm:text-xs font-bold text-primary transition-all"
                    >
                      <Plus className="w-4 h-4" /> Add Trade
                    </button>
                </div>
              </div>

              {viewMode === 'grid' ? (
                  <div className="space-y-4 pb-10">
                    {trades.map((trade) => (
                      <div key={trade.id} className="bg-[#0f1116] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all group relative">
                        <button 
                          type="button"
                          onClick={(e) => removeTrade(e, trade.id)}
                          className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all z-20 cursor-pointer"
                          title="Delete Trade"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:pr-8">
                          {/* Pair & ID */}
                          <div className="space-y-3">
                            <div>
                              <label className="text-[9px] font-bold text-slate-600 uppercase block mb-1">Pair</label>
                              <select 
                                value={trade.pair}
                                onChange={(e) => updateTrade(trade.id, 'pair', e.target.value)}
                                className="w-full bg-black border border-white/10 rounded px-2 py-2 text-xs text-white font-mono focus:border-primary/50 outline-none"
                              >
                                {DEFAULT_PAIRS.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                                {!DEFAULT_PAIRS.includes(trade.pair) && trade.pair && (
                                    <option value={trade.pair}>{trade.pair}</option>
                                )}
                              </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-600 uppercase block mb-1">Transaction ID</label>
                                <input 
                                    type="text" 
                                    value={trade.transactionId || ''}
                                    onChange={(e) => updateTrade(trade.id, 'transactionId', e.target.value)}
                                    placeholder="TX-000000"
                                    className="w-full bg-black border border-white/10 rounded px-2 py-2 text-xs text-white font-mono focus:border-primary/50 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                  <label className="text-[9px] font-bold text-slate-600 uppercase block mb-1">Side</label>
                                  <select 
                                    value={trade.side}
                                    onChange={(e) => updateTrade(trade.id, 'side', e.target.value)}
                                    className={`w-full border border-white/10 rounded px-2 py-2 text-xs font-bold outline-none appearance-none ${trade.side === TradeSide.LONG ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}
                                  >
                                    <option value={TradeSide.LONG}>LONG</option>
                                    <option value={TradeSide.SHORT}>SHORT</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="text-[9px] font-bold text-slate-600 uppercase block mb-1">Leverage (x)</label>
                                  <input 
                                    type="number" 
                                    min="1"
                                    value={trade.leverage}
                                    onChange={(e) => updateTrade(trade.id, 'leverage', Number(e.target.value))}
                                    className="w-full bg-black border border-white/10 rounded px-2 py-2 text-xs text-white font-mono focus:border-primary/50 outline-none"
                                  />
                              </div>
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-600 uppercase block mb-1">Position Size</label>
                                <input 
                                    type="number" 
                                    step="any"
                                    placeholder="Qty"
                                    value={trade.quantity}
                                    onChange={(e) => updateTrade(trade.id, 'quantity', Number(e.target.value))}
                                    className="w-full bg-black border border-white/10 rounded px-2 py-2 text-xs text-white font-mono focus:border-primary/50 outline-none"
                                />
                            </div>
                          </div>

                          {/* Status & Metrics */}
                          <div className="space-y-3">
                            <div>
                              <label className="text-[9px] font-bold text-slate-600 uppercase block mb-1">Status</label>
                              <select 
                                value={trade.status}
                                onChange={(e) => updateTrade(trade.id, 'status', e.target.value)}
                                className={`w-full border border-white/10 rounded px-2 py-2 text-xs font-bold outline-none ${trade.status === TradeStatus.OPEN ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-500'}`}
                              >
                                <option value={TradeStatus.OPEN}>OPEN</option>
                                <option value={TradeStatus.CLOSED}>CLOSED</option>
                              </select>
                            </div>
                            <div className="pt-2">
                                <label className="text-[9px] font-bold text-slate-600 uppercase block mb-1">Calculations</label>
                                <MetricsPreview trade={trade} />
                            </div>
                          </div>

                          {/* Prices & Times */}
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                  <label className="text-[9px] font-bold text-slate-600 uppercase block mb-1">Entry Price</label>
                                  <input 
                                    type="number" 
                                    step="any"
                                    value={trade.entryPrice}
                                    onChange={(e) => updateTrade(trade.id, 'entryPrice', Number(e.target.value))}
                                    className="w-full bg-black border border-white/10 rounded px-2 py-2 text-xs text-white font-mono focus:border-primary/50 outline-none"
                                  />
                              </div>
                              <div>
                                  <label className="text-[9px] font-bold text-slate-600 uppercase block mb-1">Exit Price</label>
                                  <input 
                                    type="number" 
                                    step="any"
                                    value={trade.exitPrice || 0}
                                    onChange={(e) => updateTrade(trade.id, 'exitPrice', Number(e.target.value))}
                                    className="w-full bg-black border border-white/10 rounded px-2 py-2 text-xs text-white font-mono focus:border-primary/50 outline-none"
                                  />
                              </div>
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-600 uppercase block mb-1">Open Time</label>
                              <input 
                                type="text" 
                                value={trade.openTime}
                                placeholder="YYYY-MM-DD HH:mm:ss"
                                onChange={(e) => updateTrade(trade.id, 'openTime', e.target.value)}
                                className="w-full bg-black border border-white/10 rounded px-2 py-2 text-xs text-slate-400 font-mono focus:border-primary/50 outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-600 uppercase block mb-1">Close Time</label>
                              <input 
                                type="text" 
                                value={trade.closeTime || ''}
                                placeholder="YYYY-MM-DD HH:mm:ss"
                                onChange={(e) => updateTrade(trade.id, 'closeTime', e.target.value)}
                                className="w-full bg-black border border-white/10 rounded px-2 py-2 text-xs text-slate-400 font-mono focus:border-primary/50 outline-none"
                              />
                            </div>
                          </div>

                          {/* Fees */}
                          <div className="space-y-3">
                             <div>
                                <label className="text-[9px] font-bold text-slate-600 uppercase block mb-1">Funding Fee</label>
                                <input 
                                  type="number" 
                                  step="any"
                                  value={trade.fundingFee || 0}
                                  onChange={(e) => updateTrade(trade.id, 'fundingFee', Number(e.target.value))}
                                  className="w-full bg-black border border-white/10 rounded px-2 py-2 text-xs text-amber-400 font-mono focus:border-primary/50 outline-none"
                                />
                             </div>
                             <div className="grid grid-cols-2 gap-2">
                               <div>
                                  <label className="text-[9px] font-bold text-slate-600 uppercase block mb-1">Open Fee</label>
                                  <input 
                                    type="number" 
                                    step="any"
                                    value={trade.openFee || 0}
                                    onChange={(e) => updateTrade(trade.id, 'openFee', Number(e.target.value))}
                                    className="w-full bg-black border border-white/10 rounded px-2 py-2 text-xs text-rose-400 font-mono focus:border-primary/50 outline-none"
                                  />
                               </div>
                               <div>
                                  <label className="text-[9px] font-bold text-slate-600 uppercase block mb-1">Close Fee</label>
                                  <input 
                                    type="number" 
                                    step="any"
                                    value={trade.closeFee || 0}
                                    onChange={(e) => updateTrade(trade.id, 'closeFee', Number(e.target.value))}
                                    className="w-full bg-black border border-white/10 rounded px-2 py-2 text-xs text-rose-400 font-mono focus:border-primary/50 outline-none"
                                  />
                               </div>
                             </div>
                          </div>

                        </div>
                      </div>
                    ))}
                  </div>
              ) : (
                <div className="overflow-x-auto pb-10 border border-white/5 rounded-xl bg-[#0f1116]">
                  <table className="w-full text-left border-collapse">
                     <thead className="bg-black/30 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                        <tr>
                           <th className="p-4 border-b border-white/5">Time / Pair</th>
                           <th className="p-4 border-b border-white/5">Side</th>
                           <th className="p-4 border-b border-white/5 text-right">Size/Price</th>
                           <th className="p-4 border-b border-white/5 text-right">Metrics (Net)</th>
                           <th className="p-4 border-b border-white/5"></th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5">
                        {trades.map(trade => {
                           const { netProfit, roe } = calculateMetrics(trade);
                           return (
                             <tr key={trade.id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-4">
                                   <div className="text-[10px] text-slate-300 font-mono">{trade.openTime.split(' ')[0]}</div>
                                   <div className="text-xs font-bold text-white">{trade.pair}</div>
                                </td>
                                <td className="p-4">
                                   <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${trade.side === TradeSide.LONG ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                                      {trade.side}
                                   </span>
                                </td>
                                <td className="p-4 text-right font-mono text-xs">
                                   <div className="text-slate-400">{trade.quantity} {trade.amountSymbol}</div>
                                   <div className="text-white font-bold">{trade.entryPrice}</div>
                                </td>
                                <td className="p-4 text-right">
                                   <div className={`text-xs font-bold font-mono ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                      {netProfit > 0 ? '+' : ''}{netProfit.toFixed(2)}
                                   </div>
                                   <div className={`text-[9px] font-bold ${roe >= 0 ? 'text-primary' : 'text-secondary'}`}>
                                      {roe > 0 ? '+' : ''}{roe.toFixed(2)}%
                                   </div>
                                </td>
                                <td className="p-4 text-right">
                                   <button 
                                      type="button"
                                      onClick={(e) => removeTrade(e, trade.id)}
                                      className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"
                                   >
                                      <Trash2 className="w-4 h-4" />
                                   </button>
                                </td>
                             </tr>
                           );
                        })}
                     </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* IMPORTS TAB */}
          {activeTab === 'imports' && (
             <div className="max-w-2xl mx-auto space-y-8 mt-4 pb-20">
                <div className="glass-panel p-6 rounded-2xl">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="bg-primary/10 p-3 rounded-xl border border-primary/20">
                            <Database className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Import Positions</h3>
                            <p className="text-xs text-slate-400 mt-1">Upload a CSV file containing trade history (Excel no longer supported).</p>
                        </div>
                    </div>
                    <FileDropZone 
                      label="Upload Trades File"
                      icon={FileUp}
                      file={tradeFile}
                      onFileSelect={setTradeFile}
                      acceptedFileTypes=".csv"
                    />
                    {tradeFile && (
                        <button 
                            onClick={handleProcessTradeImport}
                            className="w-full mt-4 bg-primary text-black font-bold py-3 rounded-xl uppercase tracking-wider hover:bg-primary/90 transition-all"
                        >
                            Process Trades
                        </button>
                    )}
                </div>

                <div className="glass-panel p-6 rounded-2xl border-secondary/20">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="bg-secondary/10 p-3 rounded-xl border border-secondary/20">
                            <SettingsIcon className="w-6 h-6 text-secondary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Import Funding Fees</h3>
                            <p className="text-xs text-slate-400 mt-1">Upload a separate CSV for Funding Fees (Excel no longer supported).</p>
                        </div>
                    </div>
                    <FileDropZone 
                      label="Upload Funding File"
                      icon={FileType}
                      file={fundingFile}
                      onFileSelect={setFundingFile}
                      acceptedFileTypes=".csv"
                    />
                    {fundingFile && (
                        <button 
                            onClick={handleProcessFundingImport}
                            className="w-full mt-4 bg-white text-black font-bold py-3 rounded-xl uppercase tracking-wider hover:bg-slate-200 transition-all"
                        >
                            Process Funding Fees
                        </button>
                    )}
                </div>
             </div>
          )}

          {/* CONFIG TAB */}
          {activeTab === 'config' && (
            <div className="max-w-2xl mx-auto space-y-8 mt-4 pb-20">
              <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-white mb-1">Portfolio Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Portfolio Size (USDT)</label>
                    <div className="flex gap-2">
                        <input 
                          type="number"
                          value={settings.portfolioSize}
                          onChange={(e) => setSettings({...settings, portfolioSize: parseFloat(e.target.value) || 0})}
                          placeholder="Enter amount..."
                          className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-base text-white font-mono focus:border-primary transition-all"
                        />
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/50 px-6 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" /> Set
                        </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminPanel;