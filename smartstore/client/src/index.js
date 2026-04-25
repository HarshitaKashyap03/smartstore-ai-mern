import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
// StrictMode removed — it double-invokes useEffect in development
// which was causing view counts to increment by 2 instead of 1
root.render(<App />);
