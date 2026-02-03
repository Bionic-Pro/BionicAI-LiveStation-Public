
export enum TradeStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED'
}

export enum TradeSide {
  LONG = 'Long',
  SHORT = 'Short'
}

export enum MarginType {
  ISOLATED = 'Isolated',
  CROSS = 'Cross'
}

export interface Trade {
  id: string; // UUID from Supabase
  user_id?: string;
  transactionId?: string; 
  pair: string; 
  side: TradeSide;
  marginType: MarginType;
  leverage: number;
  
  entryPrice: number;
  exitPrice: number; 
  
  quantity: number; 
  amountSymbol?: string; 
  
  openFee: number;
  closeFee: number;
  fundingFee: number; 
  
  status: TradeStatus;
  openTime: string; // ISO String
  closeTime?: string; // ISO String
  
  copiers?: number; 
  sharing?: number; 
  month_key?: string; // YYYY-MM
}

export interface FundingRecord {
  id: string; // UUID
  user_id?: string;
  date: string; 
  asset: string;
  amount: number; 
  type: string; 
  month_key?: string; // YYYY-MM
}

export interface DashboardStats {
  totalPnl: number;
  winRate: number;
  activeTrades: number;
  totalTrades: number;
}

export interface PerformancePoint {
  date: string;
  pnl: number;
}

export interface AppSettings {
  portfolioSize: number;
  adminPassword?: string; // Deprecated with Supabase Auth
}
