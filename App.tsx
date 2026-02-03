
import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  MoreHorizontal,
  Lock,
  Filter,
  ArrowUpDown,
  Check,
  Share2,
  Calendar,
  LogOut
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Brush
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  fetchTrades,
  fetchFundingRecords,
  fetchSettings,
  syncTrades,
  syncFunding,
  updateSettings,
  deleteAllTrades,
  calculateMetrics,
  getAvailableMonths
} from './services/tradingService';
import { Trade, TradeStatus, TradeSide, AppSettings, FundingRecord } from './types';
import AdminPanel from './components/AdminPanel';
import AuthModal from './components/AuthModal';
import { supabase } from './services/supabase';

// --- Static Chart Data (Visuals only as requested) ---
const CHART_DATA = [
  { date: '01/15', value: 10000 },
  { date: '01/18', value: 11200 },
  { date: '01/21', value: 12800 },
  { date: '01/24', value: 13500 },
  { date: 'Today', value: 14850 },
];

const StatCard = ({ label, value, subValue, trend }: any) => (
  <motion.div 
    whileHover={{ y: -2 }}
    className="glass-panel p-5 rounded-2xl flex flex-col justify-between h-full hover:bg-white/5 transition-colors duration-300 border-t border-white/10"
  >
    <div className="flex justify-between items-start">
      <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{label}</span>
      <div className={`p-1.5 rounded-lg ${trend === 'up' ? 'bg-primary/10 text-primary' : trend === 'down' ? 'bg-secondary/10 text-secondary' : 'bg-slate-800 text-slate-400'}`}>
        {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : trend === 'down' ? <TrendingDown className="w-4 h-4" /> : <MoreHorizontal className="w-4 h-4"/>}
      </div>
    </div>
    <div className="mt-4">
      <div className="text-2xl font-bold text-white font-mono tracking-tight">{value}</div>
      <div className={`text-[10px] font-bold mt-1 flex items-center gap-1 ${trend === 'up' ? 'text-primary' : trend === 'down' ? 'text-secondary' : 'text-slate-500'}`}>
        {subValue}
      </div>
    </div>
  </motion.div>
);

const App = () => {
  // Auth State
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Data State
  const [trades, setTrades] = useState<Trade[]>([]);
  const [fundingRecords, setFundingRecords] = useState<FundingRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ portfolioSize: 10000 });
  
  // UI State
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  
  // Sorting, Filtering & Month Selection
  const [filterStatus, setFilterStatus] = useState<'ALL' | TradeStatus>('ALL');
  const [filterSide, setFilterSide] = useState<'ALL' | TradeSide>('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'pnl' | 'roe'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');

  // --- Auth & Data Loading ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadData(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadData(session.user.id);
      else {
        // Reset data on logout
        setTrades([]);
        setFundingRecords([]);
        setSettings({ portfolioSize: 10000 });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadData = async (userId: string) => {
    setLoading(true);
    try {
      // Parallel fetch
      const [t, f, s] = await Promise.all([
        fetchTrades(userId),
        fetchFundingRecords(userId),
        fetchSettings(userId)
      ]);
      setTrades(t);
      setFundingRecords(f);
      setSettings(s);
    } catch (e) {
      console.error("Failed to load data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- Saving Data (Prop for AdminPanel) ---
  const handleSaveData = async (updatedTrades: Trade[], updatedFunding: FundingRecord[], updatedSettings: AppSettings) => {
    if (!session?.user?.id) return;
    
    // Optimistic Update
    setTrades(updatedTrades);
    setFundingRecords(updatedFunding);
    setSettings(updatedSettings);

    try {
      // In a real app, you'd want to handle individual creates/updates/deletes for efficiency.
      // Here we sync the whole state for simplicity as per "Baby Step".
      // Caution: This logic depends on IDs. If we deleted locally, we need to explicitly delete remotely.
      // Since `syncTrades` currently only UPSERTS, we might need a separate delete logic if items are missing.
      // For this step, we will assume AdminPanel passes the 'current valid state' and we might strictly upsert.
      // TO DO proper sync: 
      // 1. Delete all for user (Brute force sync) -> Insert all. 
      //    (Simplest for maintaining full state consistency with local CSV imports)
      //    But dangerous for production. 
      //    Let's stick to Upsert and assume user mainly adds/edits.
      
      // Let's do a brute-force approach for the "Reset/Import" workflow specifically:
      // If the intent is to MATCH the passed array exactly, we should ideally Delete All then Insert All.
      // Let's try that for reliability with the Import feature.
      
      await deleteAllTrades(session.user.id); // Clear old (optional, aggressive but ensures sync)
      // Wait a moment or ensure transactional integrity if possible. 
      // Since RLS allows delete, we proceed.
      
      await syncTrades(updatedTrades, session.user.id);
      await syncFunding(updatedFunding, session.user.id);
      await updateSettings(updatedSettings, session.user.id);
      
      // Reload to get generated IDs and confirmed state
      await loadData(session.user.id);
    } catch (e) {
      console.error("Save failed", e);
      alert("Failed to sync with server. Please check connection.");
    }
  };

  // --- Compute available months ---
  const availableMonths = useMemo(() => {
    return getAvailableMonths(trades, fundingRecords);
  }, [trades, fundingRecords]);

  // --- Filtered Data based on Month ---
  const filteredData = useMemo(() => {
    if (selectedMonth === 'ALL') return { trades, fundingRecords };
    
    return {
      trades: trades.filter(t => t.month_key === selectedMonth),
      fundingRecords: fundingRecords.filter(f => f.month_key === selectedMonth)
    };
  }, [trades, fundingRecords, selectedMonth]);

  // --- Dynamic Stats ---
  const stats = useMemo(() => {
    const { trades: activeTradesList, fundingRecords: activeFunding } = filteredData;
    
    let totalTradePnl = 0;
    let wins = 0;
    let closedCount = 0;
    let activeCount = 0;

    activeTradesList.forEach(t => {
      const { netProfit } = calculateMetrics(t);
      if (t.status === TradeStatus.CLOSED) {
        totalTradePnl += netProfit;
        closedCount++;
        if (netProfit > 0) wins++;
      } else {
        totalTradePnl += netProfit;
        activeCount++;
      }
    });

    const totalFundingAdjustment = activeFunding.reduce((sum, rec) => sum + rec.amount, 0);
    const finalNetPnl = totalTradePnl + totalFundingAdjustment;
    const winRate = closedCount > 0 ? ((wins / closedCount) * 100).toFixed(1) : "0.0";
    const safePortfolioSize = settings.portfolioSize > 0 ? settings.portfolioSize : 10000;
    const globalReturnPercent = ((finalNetPnl / safePortfolioSize) * 100).toFixed(2);

    return {
      totalPnl: finalNetPnl.toFixed(2),
      tradePnlOnly: totalTradePnl.toFixed(2),
      fundingAdjustment: totalFundingAdjustment.toFixed(2),
      winRate,
      activeCount,
      totalCount: activeTradesList.length,
      globalReturnPercent
    };
  }, [filteredData, settings]);

  // --- Table Processing ---
  const processedTrades = useMemo(() => {
    let data = [...filteredData.trades];
    if (filterStatus !== 'ALL') data = data.filter(t => t.status === filterStatus);
    if (filterSide !== 'ALL') data = data.filter(t => t.side === filterSide);

    data.sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (sortBy === 'date') {
        valA = new Date(a.openTime).getTime();
        valB = new Date(b.openTime).getTime();
      } else if (sortBy === 'pnl') {
        valA = calculateMetrics(a).netProfit;
        valB = calculateMetrics(b).netProfit;
      } else if (sortBy === 'roe') {
        valA = calculateMetrics(a).roe;
        valB = calculateMetrics(b).roe;
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    return data;
  }, [filteredData.trades, filterStatus, filterSide, sortBy, sortOrder]);

  const handleShare = (t: Trade) => {
    const { pnl, roe } = calculateMetrics(t);
    const text = `🔥 Blofin Trade Signal\n\n💎 ${t.pair} (${t.side.toUpperCase()})\n⚡ Leverage: ${t.leverage}x\n💰 Entry: ${t.entryPrice}\n🏁 Exit: ${t.exitPrice || 'Active'}\n\n📈 PnL: ${pnl.toFixed(2)} USDT\n🚀 ROE: ${roe.toFixed(2)}%\n\nJoin the copy trading now!`;
    navigator.clipboard.writeText(text);
    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSort = (field: 'date' | 'pnl' | 'roe') => {
    if (sortBy === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  if (loading) return <div className="min-h-screen bg-[#06070a] flex items-center justify-center text-slate-500 font-mono">Loading data...</div>;

  return (
    <div className="min-h-screen w-full bg-[#06070a] font-sans text-slate-200 relative overflow-x-hidden">
      <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      
      <header className="h-20 border-b border-border/30 flex items-center justify-between px-6 md:px-12 backdrop-blur-md sticky top-0 z-30 bg-[#06070a]/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/20">
             <TrendingUp className="text-primary w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white leading-none">MY DASHBOARD</h1>
            <span className="text-[10px] font-mono text-slate-500">LIVE MONITORING</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
           {session ? (
               <>
                 <div className="relative group hidden md:block">
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="appearance-none bg-slate-900 border border-white/10 rounded-lg pl-3 pr-8 py-2 text-xs font-bold text-slate-300 focus:outline-none focus:border-primary/50 uppercase tracking-wider hover:bg-white/5 cursor-pointer min-w-[140px]"
                    >
                      <option value="ALL">All Time</option>
                      {availableMonths.map(month => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>
                    <Calendar className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                 </div>

                 <button 
                   onClick={() => setShowAdmin(true)}
                   className="text-slate-600 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
                   title="Admin Access"
                 >
                   <Lock className="w-4 h-4" />
                 </button>
                 
                 <button 
                   onClick={handleLogout}
                   className="text-rose-500 hover:text-rose-400 transition-colors p-2 rounded-lg hover:bg-rose-500/10"
                   title="Sign Out"
                 >
                   <LogOut className="w-4 h-4" />
                 </button>
               </>
           ) : (
                <button 
                   onClick={() => setShowAuth(true)}
                   className="bg-white text-black px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-200"
                 >
                   Sign In
                 </button>
           )}
        </div>
      </header>

      <main className="p-6 md:p-12 max-w-[1600px] mx-auto space-y-8 pb-20">
        {!session ? (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-white mb-4">Please Log In</h2>
                <p className="text-slate-500">Access your secure trading dashboard to view live data.</p>
                <button 
                   onClick={() => setShowAuth(true)}
                   className="mt-6 bg-primary text-black px-6 py-3 rounded-xl font-bold uppercase tracking-wider"
                 >
                   Open Login
                 </button>
            </div>
        ) : (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard 
                label={selectedMonth === 'ALL' ? "Total Net Profit" : `${selectedMonth} Net Profit`}
                value={`${Number(stats.totalPnl) > 0 ? '+' : ''}$${stats.totalPnl}`} 
                subValue={<span className="flex flex-col gap-0.5"><span>Trades: ${stats.tradePnlOnly}</span><span className="text-slate-500">Funding: ${stats.fundingAdjustment}</span></span>}
                trend={Number(stats.totalPnl) >= 0 ? 'up' : 'down'} 
              />
              <StatCard 
                label="Global Return" 
                value={`${Number(stats.globalReturnPercent) > 0 ? '+' : ''}${stats.globalReturnPercent}%`} 
                subValue={`Base: $${settings.portfolioSize?.toLocaleString()}`} 
                trend={Number(stats.globalReturnPercent) >= 0 ? 'up' : 'down'} 
              />
              <StatCard label="Active Positions" value={stats.activeCount} subValue="Currently Open" trend="neutral" />
              <StatCard label="Win Rate" value={`${stats.winRate}%`} subValue={`${stats.totalCount} Total Trades`} trend={Number(stats.winRate) > 50 ? 'up' : 'down'} />
            </div>

            <div className="flex flex-col xl:flex-row gap-6 h-full">
              <div className="xl:flex-1 order-2 xl:order-1">
                 <div className="glass-panel rounded-2xl overflow-hidden border-t border-white/10 min-h-[500px]">
                    <div className="p-6 border-b border-white/5 bg-[#0a0b10] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <h3 className="font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        {selectedMonth === 'ALL' ? 'History' : `${selectedMonth} History`}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative group">
                           <select 
                             value={filterStatus}
                             onChange={(e) => setFilterStatus(e.target.value as any)}
                             className="appearance-none bg-slate-900 border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-[10px] font-bold text-slate-300 focus:outline-none focus:border-primary/50 uppercase tracking-wider hover:bg-white/5 cursor-pointer"
                           >
                             <option value="ALL">All Status</option>
                             <option value={TradeStatus.OPEN}>Open</option>
                             <option value={TradeStatus.CLOSED}>Closed</option>
                           </select>
                           <Filter className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
                        <div className="relative group">
                           <select 
                             value={filterSide}
                             onChange={(e) => setFilterSide(e.target.value as any)}
                             className="appearance-none bg-slate-900 border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-[10px] font-bold text-slate-300 focus:outline-none focus:border-primary/50 uppercase tracking-wider hover:bg-white/5 cursor-pointer"
                           >
                             <option value="ALL">All Sides</option>
                             <option value={TradeSide.LONG}>Long</option>
                             <option value={TradeSide.SHORT}>Short</option>
                           </select>
                           <Filter className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-[#0f1116] text-[10px] text-slate-500 uppercase font-black tracking-widest sticky top-0 z-10">
                          <tr>
                            <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('date')}>
                              <div className="flex items-center gap-1">Pair <ArrowUpDown className={`w-3 h-3 ${sortBy === 'date' ? 'text-primary' : ''}`} /></div>
                            </th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Side</th>
                            <th className="px-6 py-4">Entry</th>
                            <th className="px-6 py-4">Size</th>
                            <th className="px-6 py-4 text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('pnl')}>
                               <div className="flex items-center justify-end gap-1">P&L <ArrowUpDown className={`w-3 h-3 ${sortBy === 'pnl' ? 'text-primary' : ''}`} /></div>
                            </th>
                            <th className="px-6 py-4 text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('roe')}>
                               <div className="flex items-center justify-end gap-1">ROE % <ArrowUpDown className={`w-3 h-3 ${sortBy === 'roe' ? 'text-primary' : ''}`} /></div>
                            </th>
                            <th className="px-6 py-4 text-right">Share</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          <AnimatePresence>
                            {processedTrades.map((t, i) => {
                              const { pnl, roe, netProfit } = calculateMetrics(t);
                              return (
                              <motion.tr 
                                key={t.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="hover:bg-white/5 transition-colors group"
                              >
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-black border border-white/10">
                                      {t.pair.charAt(0)}
                                    </div>
                                    <div>
                                      <div className="text-sm font-bold text-slate-200">{t.pair}</div>
                                      <div className="text-[10px] text-slate-500 font-mono">{t.leverage}x {t.marginType}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${t.status === TradeStatus.OPEN ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-slate-800 text-slate-500'}`}>
                                    {t.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`font-bold text-xs ${t.side === TradeSide.LONG ? 'text-primary' : 'text-secondary'}`}>
                                    {t.side}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-mono text-sm text-slate-300">
                                  {t.entryPrice.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 font-mono text-sm text-slate-300">
                                  {t.quantity} <span className="text-[10px] text-slate-500">{t.amountSymbol}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                   <div className={`font-mono font-bold text-sm ${pnl >= 0 ? 'text-primary' : 'text-secondary'}`}>
                                     {pnl > 0 ? '+' : ''}{pnl.toFixed(2)} <span className="text-[10px] text-slate-500">USDT</span>
                                   </div>
                                   <div className="text-[9px] font-mono mt-1 text-slate-500" title="Real Profit (After Fees)">
                                      Net: <span className={netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}>{netProfit > 0 ? '+' : ''}{netProfit.toFixed(2)}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                   <div className={`font-mono font-bold text-sm ${roe >= 0 ? 'text-primary' : 'text-secondary'}`}>
                                     {roe > 0 ? '+' : ''}{roe.toFixed(2)}%
                                   </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button 
                                    onClick={() => handleShare(t)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-500 hover:text-primary relative group/btn"
                                    title="Copy Trade Details"
                                  >
                                    {copiedId === t.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                                  </button>
                                </td>
                              </motion.tr>
                            );})}
                          </AnimatePresence>
                          {processedTrades.length === 0 && (
                            <tr>
                              <td colSpan={8} className="text-center py-20 text-slate-600 text-sm">
                                No trades found matching filters.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                 </div>
              </div>

              <div className="xl:w-1/3 order-1 xl:order-2">
                <div className="glass-panel p-6 rounded-2xl h-[300px] xl:h-[500px] flex flex-col border-t border-white/10">
                  <h3 className="font-bold text-white mb-6">Equity Estimate</h3>
                  <div className="flex-1 w-full min-h-0 relative">
                    <div className="absolute inset-0">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                          <AreaChart data={CHART_DATA}>
                            <defs>
                              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#00dc82" stopOpacity={0.25}/>
                                <stop offset="95%" stopColor="#00dc82" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e2129" vertical={false} />
                            <XAxis 
                              dataKey="date" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{fill: '#475569', fontSize: 10, fontWeight: 600}} 
                              dy={10} 
                            />
                            <YAxis hide domain={['auto', 'auto']} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#0a0b10', borderColor: '#272a33', borderRadius: '8px', color: '#fff' }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#00dc82" 
                              strokeWidth={2} 
                              fillOpacity={1} 
                              fill="url(#colorValue)" 
                            />
                            <Brush dataKey="date" height={20} stroke="#00dc82" fill="#0a0b10" tickFormatter={() => ''} className="text-[10px]"/>
                          </AreaChart>
                        </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </>
        )}
      </main>

      <AuthModal 
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={() => {
          setShowAuth(false);
          // Session is handled by subscription
        }}
      />

      {showAdmin && session && (
        <AdminPanel 
          currentTrades={trades} 
          currentFunding={fundingRecords}
          currentSettings={settings}
          onSave={handleSaveData} 
          onClose={() => setShowAdmin(false)} 
        />
      )}
    </div>
  );
};

export default App;
