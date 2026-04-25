import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function Recommend() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/predict/recommend');
        setItems(Array.isArray(data) ? data : []);
      } catch {
        toast.error('Failed to load recommendations');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return <div className="loading-wrap"><div className="spinner" /></div>;
  }

  return (
    <div className="card">
      <div className="section-title mb-16">Product Recommendations</div>
      <table className="table">
        <thead>
          <tr>
            <th>From Product</th>
            <th>To Product</th>
            <th>Confidence %</th>
            <th>Co-purchase Count</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row, idx) => (
            <tr key={`${row.from}-${row.to}-${idx}`}>
              <td>{row.from}</td>
              <td>{row.to}</td>
              <td>{row.confidence}</td>
              <td>{row.count}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                No recommendation data found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
