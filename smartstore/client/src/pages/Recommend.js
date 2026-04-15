import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import './Recommend.css';

export default function Recommend() {
  const [pairs,    setPairs]    = useState([]);
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [offerName, setOfferName] = useState('');
  const [discount,  setDiscount]  = useState(10);
  const [selected,  setSelected]  = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [pairsR, prodR] = await Promise.all([
          api.get('/predict/recommend'),
          api.get('/products'),
        ]);
        setPairs(pairsR.data);
        setProducts(prodR.data);
        if (pairsR.data.length > 0) setSelected(pairsR.data[0]);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const handleAccept = () => {
    toast.success(`Bundle "${selected?.from} + ${selected?.to}" created with ${discount}% discount!`);
  };
  const handleReject = () => {
    setPairs(prev => prev.filter(p => p !== selected));
    setSelected(pairs[1] || null);
    toast('Suggestion rejected');
  };

  if (loading) return <div className="loading-wrap"><div className="spinner"/></div>;

  return (
    <div>
      <div className="card mb-20">
        <div className="flex-between mb-16">
          <div className="section-title">Product Recommendation Builder (Active: Q4 2024)</div>
          <div className="flex gap-8">
            <span className="badge badge-blue">Suggestion: A → B, C</span>
            <button className="btn btn-outline btn-sm">↓ Export to CSV</button>
          </div>
        </div>

        {/* Visual combo builder */}
        <div className="combo-builder">
          <div className="combo-left">
            <div className="combo-label">Products</div>
            {products.slice(0,7).map(p => (
              <div key={p._id} className="combo-product-row">{p.name}</div>
            ))}
          </div>
          <div className="combo-canvas">
            {selected && (
              <>
                <div className="combo-source-node">
                  <div className="node-box source">{selected.from.substring(0,12)}</div>
                </div>
                <div className="combo-arrows">
                  <div className="combo-arrow-row">
                    <div className="arrow-line top" />
                    <span className="arrow-pct">{selected.confidence}%</span>
                    <div className="target-node">{selected.to?.substring(0,12)}</div>
                  </div>
                  {pairs[1] && (
                    <div className="combo-arrow-row">
                      <div className="arrow-line bot" />
                      <span className="arrow-pct">{pairs[1]?.confidence || 85}%</span>
                      <div className="target-node">{pairs[1]?.to?.substring(0,12)}</div>
                    </div>
                  )}
                </div>
              </>
            )}
            {pairs.length === 0 && (
              <div style={{ color:'var(--text-muted)', fontSize:13, textAlign:'center', paddingTop:40 }}>
                Make more sales to generate recommendations
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* AI Suggestions Feed */}
        <div className="card">
          <div className="section-title mb-16">AI Suggestions Feed</div>
          <div className="suggestions-list">
            {pairs.slice(0,5).map((p, i) => (
              <div
                key={i}
                className={`suggestion-row ${selected === p ? 'active' : ''}`}
                onClick={() => setSelected(p)}
              >
                <div className="sug-icon">⊙</div>
                <div className="sug-info">
                  <div className="sug-from">{p.from}</div>
                  <div className="sug-details">
                    <span>Target: {p.from}</span>
                    <span>Suggest: {p.to}</span>
                    <span className="sug-score">Match Score: <strong style={{ color:'var(--accent-green)' }}>{p.confidence}%</strong></span>
                  </div>
                </div>
                <span className={`badge ${i === 0 ? 'badge-amber' : 'badge-green'}`}>{i === 0 ? 'PENDING' : 'ACTIVE'}</span>
              </div>
            ))}
            {pairs.length === 0 && <div style={{ color:'var(--text-muted)', fontSize:12 }}>No suggestions yet. Make more sales!</div>}
          </div>
        </div>

        {/* Bundle Creator */}
        <div className="card">
          <div className="section-title mb-16">Create Bundled Offer</div>
          {selected ? (
            <div className="bundle-form">
              <div className="form-group">
                <label className="form-label">Offer Name</label>
                <input className="form-control" placeholder="Enter offer name" value={offerName} onChange={e => setOfferName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Items</label>
                <div className="bundle-items">
                  <span className="bundle-item">{selected.from}</span>
                  <span className="bundle-plus">+</span>
                  <span className="bundle-item">{selected.to}</span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Discount %</label>
                <input className="form-control" type="number" min="0" max="80" value={discount} onChange={e => setDiscount(+e.target.value)} />
              </div>
              <div className="flex gap-8 mt-16">
                <button className="btn btn-primary flex-1" onClick={handleAccept}>Accept AI Bundle</button>
                <button className="btn btn-danger flex-1" onClick={handleReject}>Reject AI Suggestion</button>
              </div>
            </div>
          ) : (
            <div style={{ color:'var(--text-muted)', fontSize:13, textAlign:'center', paddingTop:40 }}>
              Select a suggestion to create a bundle
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
