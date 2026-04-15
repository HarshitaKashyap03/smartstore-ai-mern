# SmartStore AI — MERN Full Stack

## Folder Structure

```
smartstore/
├── package.json              ← root scripts (concurrently)
│
├── server/                   ← Node.js + Express backend
│   ├── .env                  ← PORT, MONGO_URI, JWT_SECRET
│   ├── package.json
│   ├── server.js             ← entry point, Socket.io setup
│   ├── seedData.js           ← auto seeds demo data on first run
│   ├── middleware/
│   │   └── auth.js           ← JWT verification middleware
│   ├── models/
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── Sale.js
│   │   ├── Alert.js
│   │   └── Customer.js
│   └── routes/
│       ├── auth.js           ← /api/auth
│       ├── products.js       ← /api/products
│       ├── sales.js          ← /api/sales
│       ├── analytics.js      ← /api/analytics
│       ├── predict.js        ← /api/predict  (AI logic)
│       ├── alerts.js         ← /api/alerts
│       ├── billing.js        ← /api/billing
│       └── customers.js      ← /api/customers
│
└── client/                   ← React frontend
    ├── package.json
    ├── public/
    │   └── index.html
    └── src/
        ├── index.js           ← React entry point
        ├── App.js             ← Routes + Layout
        ├── styles/
        │   └── global.css     ← Dark theme + design system
        ├── api/
        │   └── axios.js       ← Axios instance with JWT interceptor
        ├── context/
        │   └── AuthContext.js ← Login/Register/Logout state
        ├── components/
        │   └── layout/
        │       ├── Sidebar.js + Sidebar.css
        │       └── Topbar.js  + Topbar.css
        └── pages/
            ├── Login.js    + Login.css       ← Page 1
            ├── Dashboard.js + Dashboard.css  ← Page 2
            ├── Inventory.js + Inventory.css  ← Page 3
            ├── Analytics.js                  ← Page 4
            ├── Demand.js   + Demand.css      ← Page 5
            ├── Customers.js + Customers.css  ← Page 6
            ├── Recommend.js + Recommend.css  ← Page 7
            ├── Alerts.js   + Alerts.css      ← Page 8
            ├── Billing.js  + Billing.css     ← Page 9
            ├── PnL.js      + PnL.css         ← Page 10
            └── Admin.js    + Admin.css       ← Page 11
```

## Setup & Run

### Prerequisites
- Node.js v18+
- MongoDB running locally on port 27017
  - Install: https://www.mongodb.com/try/download/community
  - Start:   `mongod` or `brew services start mongodb-community`

### Step 1 — Install dependencies
```bash
# In the root smartstore/ folder:
cd server  && npm install
cd ../client && npm install
```

### Step 2 — Configure environment
Edit `server/.env` if needed:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/smartstore
JWT_SECRET=smartstore_super_secret_key_2024
```

### Step 3 — Start the server
```bash
cd server
npm run dev
```
Server starts on http://localhost:5000
Demo data is seeded automatically on first run.

### Step 4 — Start the client (new terminal)
```bash
cd client
npm start
```
App opens at http://localhost:3000

## Demo Login Credentials
| Role    | Email                      | Password    |
|---------|----------------------------|-------------|
| Admin   | admin@smartstore.io        | admin123    |
| Manager | manager@smartstore.io      | manager123  |
| Staff   | alex@smartstore.io         | staff123    |

## API Endpoints Summary

| Method | Endpoint                     | Description               |
|--------|------------------------------|---------------------------|
| POST   | /api/auth/login              | Login                     |
| POST   | /api/auth/register           | Register                  |
| GET    | /api/products                | List products             |
| POST   | /api/products                | Add product               |
| PUT    | /api/products/:id            | Update product            |
| DELETE | /api/products/:id            | Delete product            |
| GET    | /api/sales/daily             | 7-day sales chart data    |
| GET    | /api/sales/top-products      | Top selling products      |
| POST   | /api/sales                   | Record a sale             |
| GET    | /api/analytics/kpi           | Dashboard KPIs            |
| GET    | /api/analytics/pnl           | Profit & Loss data        |
| GET    | /api/analytics/category      | Revenue by category       |
| GET    | /api/predict                 | AI demand predictions     |
| GET    | /api/predict/seasonal        | Seasonal trend cards      |
| GET    | /api/predict/recommend       | Product recommendations   |
| GET    | /api/alerts                  | List alerts               |
| PATCH  | /api/alerts/:id/resolve      | Resolve alert             |
| GET    | /api/customers/heatmap       | Bought-together heatmap   |
| GET    | /api/customers/patterns      | Purchase patterns         |
| GET    | /api/billing                 | Transaction history       |
