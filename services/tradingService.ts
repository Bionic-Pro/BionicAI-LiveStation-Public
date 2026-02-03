import { Trade, TradeStatus, TradeSide, MarginType, AppSettings, FundingRecord } from '../types';
import { supabase } from './supabase';

// --- Helpers ---

const getMonthKey = (dateStr: string) => {
  if (!dateStr) return 'UNKNOWN';
  return dateStr.slice(0, 7);
};

const mapRowToTrade = (row: any): Trade => ({
  id: row.id,
  user_id: row.user_id,
  transactionId: row.transaction_id,
  pair: row.pair,
  side: row.side as TradeSide,
  marginType: row.margin_type as MarginType,
  leverage: Number(row.leverage),
  entryPrice: Number(row.entry_price),
  exitPrice: Number(row.exit_price),
  quantity: Number(row.quantity),
  amountSymbol: row.amount_symbol,
  openFee: Number(row.open_fee),
  closeFee: Number(row.close_fee),
  fundingFee: Number(row.funding_fee),
  status: row.status as TradeStatus,
  openTime: row.open_time,
  closeTime: row.close_time,
  copiers: Number(row.copiers),
  sharing: Number(row.sharing),
  month_key: row.month_key
});

const mapTradeToRow = (trade: Trade, userId: string) => ({
  user_id: userId,
  transaction_id: trade.transactionId,
  pair: trade.pair,
  side: trade.side,
  margin_type: trade.marginType,
  leverage: trade.leverage,
  entry_price: trade.entryPrice,
  exit_price: trade.exitPrice,
  quantity: trade.quantity,
  amount_symbol: trade.amountSymbol,
  open_fee: trade.openFee,
  close_fee: trade.closeFee,
  funding_fee: trade.fundingFee,
  status: trade.status,
  open_time: trade.openTime,
  close_time: trade.closeTime,
  copiers: trade.copiers,
  sharing: trade.sharing,
  month_key: getMonthKey(trade.openTime)
});

// --- Calculation ---

export const calculateMetrics = (trade: Trade) => {
  const quantity = Number(trade.quantity) || 0;
  const entryPrice = Number(trade.entryPrice) || 0;
  const currentPrice = Number(trade.exitPrice) || entryPrice; 
  const leverage = Number(trade.leverage) || 1;

  let grossPnl = 0;
  
  if (trade.side === TradeSide.LONG) {
    grossPnl = (currentPrice - entryPrice) * quantity;
  } else {
    grossPnl = (entryPrice - currentPrice) * quantity;
  }

  const margin = leverage > 0 ? (entryPrice * quantity) / leverage : 0;

  const openFee = Number(trade.openFee) || 0;
  const closeFee = Number(trade.closeFee) || 0;
  const fundingFee = Number(trade.fundingFee) || 0;
  const totalFees = openFee + closeFee + fundingFee;
  
  const netProfit = grossPnl - totalFees;

  let roe = 0;
  if (margin > 0) {
      roe = (netProfit / margin) * 100;
  }

  return { 
    pnl: grossPnl,
    roe,
    margin, 
    netProfit
  };
};

// --- Database ---

export const fetchTrades = async (userId: string, monthKey?: string): Promise<Trade[]> => {
  if (!userId) return [];
  
  let query = supabase.from('trades').select('*').eq('user_id', userId);
  
  if (monthKey && monthKey !== 'ALL') {
    query = query.or(`month_key.eq.${monthKey}`);
  }

  const { data, error } = await query.order('open_time', { ascending: false });

  if (error) {
    console.error('Error fetching trades:', error);
    return [];
  }

  return (data || []).map(mapRowToTrade);
};

export const fetchFundingRecords = async (userId: string): Promise<FundingRecord[]> => {
  if (!userId) return [];
  
  const { data, error } = await supabase
    .from('funding_records')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching funding:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    date: row.date,
    asset: row.asset,
    amount: Number(row.amount),
    type: row.type,
    month_key: row.month_key
  }));
};

export const fetchSettings = async (userId: string): Promise<AppSettings> => {
  if (!userId) return { portfolioSize: 10000 };

  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return { portfolioSize: 10000 };
  }

  return { portfolioSize: Number(data.portfolio_size) };
};

export const syncTrades = async (trades: Trade[], userId: string) => {
  if (!userId) return;

  const rows = trades.map(t => {
    const row = mapTradeToRow(t, userId);
    const id = t.id && t.id.length === 36 ? t.id : undefined;
    return { ...row, id };
  });

  const { error } = await supabase.from('trades').upsert(rows);
  if (error) throw error;
};

export const syncFunding = async (records: FundingRecord[], userId: string) => {
  if (!userId) return;
  
  const rows = records.map(r => {
    const id = r.id && r.id.length === 36 ? r.id : undefined;
    return {
      id,
      user_id: userId,
      date: r.date,
      asset: r.asset,
      amount: r.amount,
      type: r.type,
      month_key: getMonthKey(r.date)
    };
  });

  const { error } = await supabase.from('funding_records').upsert(rows);
  if (error) throw error;
};

export const updateSettings = async (settings: AppSettings, userId: string) => {
  if (!userId) return;

  const { error } = await supabase
    .from('settings')
    .upsert({ 
      user_id: userId, 
      portfolio_size: settings.portfolioSize 
    }, { onConflict: 'user_id' });
    
  if (error) throw error;
};

export const deleteAllTrades = async (userId: string) => {
    if (!userId) return;
    const { error } = await supabase.from('trades').delete().eq('user_id', userId);
    if (error) throw error;
};

// --- Native File Parsing (NO LIBRARIES) ---

export const readFileContent = async (file: File): Promise<string> => {
  const name = file.name.toLowerCase();
  
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    throw new Error("Excel files are not supported. Please use CSV.");
  }
  
  return await file.text();
};

const normalizePair = (raw: string): string => {
  if (!raw) return '';
  let p = raw.replace(/,/g, '').trim().toUpperCase();
  
  if (p.includes('/')) return p.replace(/\s/g, ''); 
  
  if (p.endsWith('USDT') && p.length > 4) return `${p.replace('USDT', '')}/USDT`;
  if (p.endsWith('USDC') && p.length > 4) return `${p.replace('USDC', '')}/USDC`;
  if (p.endsWith('USD') && p.length > 3) return `${p.replace('USD', '')}/USD`;
  
  return p;
};

const cleanNum = (val: string) => {
    if (!val) return 0;
    let v = val.replace(/,/g, '');
    v = v.replace(/\s+[A-Z]+$/, '').trim();
    v = v.replace(/USDT|ETH|BTC|SOL|XRP|BNB|USD|EUR/i, '').trim();
    return parseFloat(v) || 0;
};

const cleanVal = (val: string) => val ? val.replace(/,/g, '').trim() : '';

const formatTime = (raw: string) => {
    if (!raw) return new Date().toISOString();
    try {
        const clean = raw.trim();
        if (clean.match(/^\d{4}-\d{2}-\d{2}/)) {
            return clean;
        }
        const [d, t] = clean.split(' ');
        if (!d) return clean;
        
        if (d.includes('/')) {
             const [mm, dd, yyyy] = d.split('/');
             return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')} ${t || '00:00:00'}`;
        }
        return clean;
    } catch {
        return raw;
    }
};

export const parseTradesCSV = (csvContent: string): Trade[] => {
  const rawLines = csvContent.split(/\r?\n/);
  const lines = rawLines.map(l => l.trim()).filter(l => l && l !== ',');

  const isVerticalDump = lines.some(l => l.includes('Qty')) && lines.some(l => l.includes('Entry Price'));

  if (isVerticalDump) {
    return parseVerticalDump(lines);
  }

  const trades: Trade[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cols = line.split(',');
    if (cols.length < 5) continue;

    try {
        const sideStr = cols[2]?.toLowerCase() || '';
        const side = sideStr.includes('short') ? TradeSide.SHORT : TradeSide.LONG;
        
        const rawPair = cols[1] || '';
        const pair = normalizePair(rawPair);
        
        if (!pair || pair.length < 3) continue;

        trades.push({
            id: `CSV-${Date.now()}-${i}`,
            transactionId: '',
            openTime: formatTime(cols[0]),
            pair: pair,
            side: side,
            marginType: MarginType.ISOLATED,
            leverage: parseFloat(cols[3]) || 10,
            entryPrice: parseFloat(cols[4]) || 0,
            exitPrice: parseFloat(cols[5]) || 0,
            quantity: parseFloat(cols[6]) || 0,
            amountSymbol: pair.split('/')[0] || 'USDT',
            openFee: Math.abs(parseFloat(cols[7]) || 0) / 2, 
            closeFee: Math.abs(parseFloat(cols[7]) || 0) / 2,
            fundingFee: 0,
            status: (parseFloat(cols[5]) > 0 || (cols[9] || '').toLowerCase() === 'closed') ? TradeStatus.CLOSED : TradeStatus.OPEN,
            month_key: getMonthKey(formatTime(cols[0]))
        });
    } catch (e) {
        // Skip
    }
  }
  return trades;
};

const parseVerticalDump = (lines: string[]): Trade[] => {
  const trades: Trade[] = [];
  let currentTrade: Partial<Trade> = {};
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/,/g, '').trim(); 
    const nextLine = lines[i+1] ? lines[i+1].trim() : '';

    if (line === 'Qty' && nextLine) {
       let pairFound = false;
       for (let offset = 4; offset >= 1; offset--) {
           if (i - offset >= 0) {
               const potentialPair = lines[i - offset].replace(/,/g, '').trim();
               const normalized = normalizePair(potentialPair);
               
               if ((normalized.includes('/') || potentialPair.endsWith('USDT')) && 
                   !['ISOLATED', 'CROSS', 'LONG', 'SHORT', 'DETAILS'].includes(normalized)) {
                   
                   currentTrade.pair = normalized;
                   pairFound = true;
                   
                   if (lines[i - offset + 1]) {
                        const m = lines[i - offset + 1].trim();
                        currentTrade.marginType = m.includes('Cross') ? MarginType.CROSS : MarginType.ISOLATED;
                   }
                   if (lines[i - offset + 2]) {
                        const s = lines[i - offset + 2].trim(); 
                        const parts = s.split(' ');
                        if (parts.length > 0) {
                             currentTrade.side = parts[0].toLowerCase() === 'short' ? TradeSide.SHORT : TradeSide.LONG;
                             if (parts[1]) {
                                 currentTrade.leverage = parseFloat(parts[1].toUpperCase().replace('X', '')) || 10;
                             }
                        }
                   }
                   break;
               }
           }
       }

       if (!pairFound) {
           currentTrade = {};
           continue; 
       }

       const qtyRaw = nextLine.replace(/,/g, '').trim(); 
       const parts = qtyRaw.split(' ');
       currentTrade.quantity = parseFloat(parts[0]) || 0;
       if (parts.length > 1) {
            currentTrade.amountSymbol = parts[1];
       } else if (currentTrade.pair) {
            currentTrade.amountSymbol = currentTrade.pair.split('/')[0];
       }
    }
    
    if (line === 'Entry Price' && nextLine) {
        currentTrade.entryPrice = cleanNum(nextLine);
    }

    if ((line === 'Closing Price' || line === 'Exit Price') && nextLine) {
        currentTrade.exitPrice = cleanNum(nextLine);
        currentTrade.status = TradeStatus.CLOSED;
    }

    if ((line === 'Trade ID' || line === 'Transaction ID') && nextLine) {
        const idVal = nextLine.replace(/,/g, '').trim();
        currentTrade.transactionId = idVal;
    }

    if (line === 'Open Time' && nextLine) {
        currentTrade.openTime = formatTime(nextLine);
    }
    if ((line === 'Closing Time' || line === 'Close Time') && nextLine) {
        currentTrade.closeTime = formatTime(nextLine);
    }
    
    if (line === 'Open Fee' && nextLine) {
        currentTrade.openFee = Math.abs(cleanNum(nextLine));
    }
    if (line === 'Close Fee' && nextLine) {
        currentTrade.closeFee = Math.abs(cleanNum(nextLine));
    }
    if (line === 'Funding Fee' && nextLine) {
        currentTrade.fundingFee = Math.abs(cleanNum(nextLine));
    }

    if (line === 'Copiers' && nextLine) {
        currentTrade.copiers = parseInt(cleanVal(nextLine)) || 0;
    }

    if (line.startsWith('P&L')) {
        if (currentTrade.pair) {
             if (!currentTrade.status) currentTrade.status = TradeStatus.OPEN;
             if (!currentTrade.fundingFee) currentTrade.fundingFee = 0;
             if (!currentTrade.openFee) currentTrade.openFee = 0;
             if (!currentTrade.closeFee) currentTrade.closeFee = 0;
             if (!currentTrade.leverage) currentTrade.leverage = 10; 
             if (!currentTrade.marginType) currentTrade.marginType = MarginType.ISOLATED;
             
             currentTrade.month_key = getMonthKey(currentTrade.openTime || '');
             
             trades.push({...currentTrade} as Trade);
             currentTrade = {};
        }
    }
  }
  
  return trades;
};

export const parseFundingCSV = (csvContent: string): FundingRecord[] => {
  const lines = csvContent.split(/\r?\n/);
  const records: FundingRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cols = line.split(',');
    
    try {
        const date = cols[0] ? formatTime(cols[0]) : new Date().toISOString();
        records.push({
            id: `FUND-${Date.now()}-${i}`,
            date: date,
            asset: cols[1] || 'USDT',
            amount: parseFloat(cols[2]) || 0,
            type: cols[3] || 'Funding Fee',
            month_key: getMonthKey(date)
        });
    } catch (e) {
    }
  }
  return records;
};

export const getAvailableMonths = (trades: Trade[], funding: FundingRecord[]): string[] => {
  const months = new Set<string>();
  trades.forEach(t => { if (t.month_key) months.add(t.month_key); });
  funding.forEach(f => { if (f.month_key) months.add(f.month_key); });
  return Array.from(months).sort().reverse(); 
};