import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import './Billing.css';

export default function Billing() {
  const [products,  setProducts]  = useState([]);
  const [cart,      setCart]      = useState([]);
  const [discount,  setDiscount]  = useState(0);
  const [history,   setHistory]   = useState([]);
  const [search,    setSearch]    = useState('');
  const [filterTab, setFilterTab] = useState('All');
  const [processing,setProcessing]= useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [prodR, histR] = await Promise.all([
          api.get('/products'),
          api.get('/billing'),
        ]);
        setProducts(prodR.data);
        setHistory(histR.data);
      } catch(e) { toast.error('Failed to load'); }
    };
    load();
  }, []);

  const addToCart = (product) => {
    setCart(prev => {
      const exists = prev.find(i => i.product === product._id);
      if (exists) return prev.map(i => i.product === product._id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product: product._id, name: product.name, unitPrice: product.price, qty: 1, total: product.price }];
    });
  };

  const removeFromCart = (productId) => setCart(prev => prev.filter(i => i.product !== productId));

  const updateQty = (productId, qty) => {
    if (qty <= 0) { removeFromCart(productId); return; }
    setCart(prev => prev.map(i => i.product === productId ? { ...i, qty, total: i.unitPrice * qty } : i));
  };

  const subtotal = cart.reduce((s, i) => s + i.total, 0);
  const tax = subtotal * 0.08;
  const discountAmt = subtotal * (discount / 100);
  const total = subtotal + tax - discountAmt;

  const generateBill = async () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    setProcessing(true);
    try {
      await api.post('/sales', {
        items: cart.map(i => ({ ...i, total: i.unitPrice * i.qty })),
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        discount: parseFloat(discountAmt.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
      });
      toast.success('Bill generated & sale recorded!');
      setCart([]);
      setDiscount(0);
      const histR = await api.get('/billing');
      setHistory(histR.data);
    } catch(e) { toast.error(e.response?.data?.message || 'Failed to process'); }
    finally { setProcessing(false); }
  };

  const filteredProducts = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchTab = filterTab === 'All'
      || (filterTab === 'Low Stock' && p.status === 'Low')
      || (filterTab === 'Overstock' && p.stock > 50);
    return matchSearch && matchTab;
  });

  return (
    <div className="billing-layout">
      {/* Left: Product Selection */}
      <div className="billing-left">
        <div className="card" style={{ height:'100%' }}>
          <div className="flex-between mb-12">
            <div className="section-title">Product Search & Selection</div>
            <input className="form-control" style={{ width:180 }} placeholder="🔍 Search Products..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="billing-filter-tabs mb-16">
            {['All','Categories','Low Stock','Overstock','Non-Selling','Demand'].map(t => (
              <button key={t} className={`billing-tab ${filterTab===t?'active':''}`} onClick={() => setFilterTab(t)}>{t}</button>
            ))}
          </div>
          <div className="products-grid">
            {filteredProducts.slice(0,6).map(p => (
              <div key={p._id} className="product-tile">
                <div className="pt-thumb">{p.name[0]}</div>
                <div className="pt-name">{p.name}</div>
                <div className="pt-price">${p.price.toFixed(2)}</div>
                <div className="pt-stock">{p.stock} IN STOCK</div>
                <div className="pt-conf">88% CONFIDENCE</div>
                <button className="btn btn-primary btn-sm pt-add" onClick={() => addToCart(p)}>+</button>
              </div>
            ))}
          </div>

          {/* Transaction History */}
          <div className="section-title mt-20 mb-12">Transaction History</div>
          <table className="table">
            <thead><tr><th>Receipt #</th><th>Date & Time</th><th>Cashier</th><th>Items</th><th>Total</th><th>Action</th></tr></thead>
            <tbody>
              {history.map(sale => (
                <tr key={sale._id}>
                  <td><span className="receipt-num">#{sale.receiptNumber}</span> <span className="badge badge-green">RESOLVED</span></td>
                  <td style={{ fontSize:12, color:'var(--text-muted)' }}>{new Date(sale.createdAt).toLocaleString()}</td>
                  <td style={{ fontSize:12 }}>{sale.cashierName}</td>
                  <td>{sale.items?.length || 0}</td>
                  <td><strong style={{ color:'var(--accent-green)' }}>${sale.total?.toFixed(2)}</strong></td>
                  <td><button className="btn btn-outline btn-sm">VIEW RECEIPT</button></td>
                </tr>
              ))}
              {history.length === 0 && <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--text-muted)', padding:20 }}>No transactions yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right: Cart */}
      <div className="billing-right">
        <div className="card" style={{ height:'100%', display:'flex', flexDirection:'column' }}>
          <div className="section-title mb-16">Cart & Checkout</div>
          <div className="cart-title">Current Transaction</div>
          <table className="table" style={{ fontSize:13 }}>
            <thead><tr><th>Item Name</th><th>Qty</th><th>Unit Price</th><th>Total</th><th></th></tr></thead>
            <tbody>
              {cart.map(item => (
                <tr key={item.product}>
                  <td>{item.name}</td>
                  <td>
                    <div className="qty-control">
                      <button className="qty-btn" onClick={() => updateQty(item.product, item.qty-1)}>-</button>
                      <span>{item.qty}</span>
                      <button className="qty-btn" onClick={() => updateQty(item.product, item.qty+1)}>+</button>
                    </div>
                  </td>
                  <td>${item.unitPrice.toFixed(2)}</td>
                  <td><strong>${(item.unitPrice * item.qty).toFixed(2)}</strong></td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => removeFromCart(item.product)}>✕</button></td>
                </tr>
              ))}
              {cart.length === 0 && <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--text-muted)', padding:20 }}>Cart is empty</td></tr>}
            </tbody>
          </table>

          <div className="cart-summary">
            <div className="summary-row"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="summary-row"><span>Tax (8%)</span><span>${tax.toFixed(2)}</span></div>
            <div className="summary-row discount-row">
              <span>Discount %</span>
              <input className="form-control" style={{ width:60 }} type="number" min="0" max="80" value={discount} onChange={e => setDiscount(+e.target.value)} />
              <span style={{ color:'var(--accent-green)' }}>-${discountAmt.toFixed(2)}</span>
            </div>
            <div className="summary-row total-row"><span>Total</span><strong>${total.toFixed(2)}</strong></div>
          </div>

          <div style={{ marginTop:'auto', paddingTop:16 }}>
            <button className="btn btn-primary w-full generate-btn" onClick={generateBill} disabled={processing || cart.length===0}>
              {processing ? 'Processing...' : 'GENERATE BILL & PAY'}
            </button>
            <div className="flex gap-8 mt-8">
              <button className="btn btn-ghost flex-1 btn-sm" onClick={() => setCart([])}>CLEAR CART</button>
              <button className="btn btn-outline flex-1 btn-sm" onClick={() => setDiscount(10)}>APPLY DISCOUNT</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
