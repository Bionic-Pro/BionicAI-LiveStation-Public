
import React, { useState } from 'react';
import { Trade, TradeStatus, TradeSide } from '../types';
import { Share2, Check } from 'lucide-react';
import { calculateMetrics } from '../services/tradingService';

interface TradingTableProps {
  trades: Trade[];
}

const TradingTable: React.FC<TradingTableProps> = ({ trades }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const formatMoney = (val: number, showSign = false) => {
    const formatted = val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (showSign && val > 0) return `+${formatted}`;
    return formatted;
  };

  const getPnlColor = (val: number) => val >= 0 ? 'text-emerald-400' : 'text-rose-400';

  const handleShare = (t: Trade) => {
      const { pnl, roe } = calculateMetrics(t);
      const text = `🔥 Blofin Trade Signal\n\n💎 ${t.pair} (${t.side.toUpperCase()})\n⚡ Leverage: ${t.leverage}x\n💰 Entry: ${t.entryPrice}\n🏁 Exit: ${t.exitPrice || 'Active'}\n\n📈 PnL: ${pnl.toFixed(2)} USDT\n🚀 ROE: ${roe.toFixed(2)}%\n\nJoin the copy trading now!`;
      navigator.clipboard.writeText(text);
      setCopiedId(t.id);
      setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="mt-6 flex flex-col gap-[1px] bg-slate-800/20 rounded-xl overflow-hidden border border-white/5">
      {trades.map((trade) => {
        const { pnl, roe } = calculateMetrics(trade);
        
        return (
          <div key={trade.id} className="bg-[#0a0a0a] p-5 hover:bg-white/5 transition-colors group">
            {/* Header Row */}
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-base font-black tracking-tight text-slate-100">{trade.pair.replace('/', '')} Perp</span>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded font-black uppercase tracking-wider border border-emerald-500/20">Filled</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${trade.side === TradeSide.LONG ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'}`}>
                    {trade.side === TradeSide.LONG ? 'Open Long' : 'Open Short'}
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded font-bold text-slate-400 bg-white/5 uppercase border border-white/5">
                    {trade.marginType}
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded font-bold text-slate-400 bg-white/5 border border-white/5">
                    {trade.leverage}X
                  </span>
                </div>
              </div>
              <button 
                  onClick={() => handleShare(trade)}
                  className="opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-primary"
              >
                {copiedId === trade.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              </button>
            </div>

            {/* Data Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-5 gap-x-2">
              <div>
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">PnL (USDT)</div>
                <div className={`text-base font-black ${getPnlColor(pnl)}`}>
                  {formatMoney(pnl, true)}
                </div>
              </div>
              <div className="text-right md:text-left">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">PnL %</div>
                <div className={`text-base font-black ${getPnlColor(roe)}`}>
                  {formatMoney(roe, true)}%
                </div>
              </div>

              <div>
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Amount</div>
                <div className="text-sm font-bold text-slate-200">{trade.quantity} <span className="text-slate-500 text-[10px]">{trade.amountSymbol || trade.pair.split('/')[0]}</span></div>
              </div>
              <div className="text-right md:text-left">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Entry Price</div>
                <div className="text-sm font-bold text-slate-200">{formatMoney(trade.entryPrice)}</div>
              </div>

              <div className="md:col-span-4 flex items-center gap-2 pt-2 border-t border-white/5 mt-1">
                <span className="text-[9px] font-bold text-slate-600 uppercase">Opened:</span>
                <span className="text-[10px] font-mono text-slate-400">{trade.openTime}</span>
                
                {trade.status === TradeStatus.CLOSED && (
                  <>
                    <div className="w-px h-3 bg-slate-800 mx-1"></div>
                    <span className="text-[9px] font-bold text-slate-600 uppercase">Closed:</span>
                    <span className="text-[10px] font-mono text-slate-400">{trade.closeTime}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TradingTable;
