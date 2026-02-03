# Blofin Copy Trading Master Dashboard

A high-performance, enterprise-grade secure trading dashboard designed for real-time monitoring of Blofin copy trading accounts. This application features a sleek "Cyberpunk-Noir" aesthetic with a focus on precision P&L calculations and secure backend management.

![Dashboard Preview](https://images.unsplash.com/photo-1611974714024-422475747671?auto=format&fit=crop&q=80&w=1200&h=600)

## 🚀 Key Features

- **Live Position Monitoring**: Real-time tracking of Open and Closed trades with detailed metrics.
- **Advanced Calculation Engine**:
  - **Gross P&L**: (Closing Price - Entry Price) * Quantity.
  - **ROE%**: Returns calculated based on initial margin and leverage.
  - **Net Profit**: Accurate profit tracking subtracting Open, Close, and Funding fees.
- **Secure Admin Panel**:
  - Protected by password-encrypted access.
  - Manual trade entry and history management.
  - Portfolio size configuration for Global Return calculations.
- **Visual Analytics**: Interactive equity estimation charts and performance growth tracking.
- **Middleman Proxy Architecture**: Conceptual serverless implementation for secure API signing to prevent client-side key exposure.
- **Responsive Design**: Mobile-first glassmorphism UI optimized for all devices.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **Animations**: Framer Motion
- **State/Storage**: LocalStorage Persistence (v3 storage engine)
- **Deployment**: Optimized for Vercel/Netlify (includes API proxy template)

## 📦 Getting Started

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/blofin-copy-trading-ui.git

# Install dependencies
npm install
```

### 2. Development
```bash
npm run dev
```

### 3. Build
```bash
npm run build
```

## 🔐 Security & Admin Access

The application includes a restricted backend for managing trade data.

- **Default Access**:
  - **Password**: `admin`
- **Password Visibility**: The login modal includes a visibility toggle (eye icon) to ensure accuracy during entry.
- **Settings**: You can update the Admin Password and Portfolio size directly within the **Config** tab of the Admin Panel.

## 🏗️ Architecture: The "Secure Node"

To protect sensitive API credentials, this project utilizes a **Middleman Proxy** pattern:
1. Client requests are sent to a serverless function (`/api/blofin-proxy.ts`).
2. The server-side environment signs the request using `BLOFIN_API_KEY` and `BLOFIN_SECRET_KEY`.
3. The signed request is forwarded to Blofin's OpenAPI.
4. Raw credentials never reach the user's browser.

## 📊 Calculation Logic

The dashboard uses a proprietary `tradingService.ts` calculation engine:
- **Initial Margin** = `(Entry Price * Quantity) / Leverage`
- **ROE %** = `(PnL / Initial Margin) * 100`
- **Net Profit** = `PnL - (Open Fees + Close Fees + Funding Fees)`

## 📄 License

MIT License - feel free to use this UI for your own trading projects.

---
*Disclaimer: This is a monitoring UI and does not directly execute trades on the exchange. Always use secure API keys with limited permissions.*
