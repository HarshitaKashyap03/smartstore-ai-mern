import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import './Billing.css';

export default function Billing() {
  const [products,   setProducts]   = useState([]);
  const [cart,       setCart]       = useState([]);
  const [discount,   setDiscount]   = useState(0);
  const [search,     setSearch]     = useState('');
  const [filterTab,  setFilterTab]  = useState('All');
  const navigate = useNavigate();
  const [processing,   setProcessing]   = useState(false);

  const loadData = async () => {
    try {
      const prodR = await api.get('/products');
      setProducts(prodR.data);
    } catch(e) { toast.error('Failed to load'); }
  };

  useEffect(() => { loadData(); }, []);

  // Returns how many units of this product are already in cart
  const cartQtyFor = (productId) => {
    const item = cart.find(i => i.product === productId);
    return item ? item.qty : 0;
  };

  const addToCart = (product) => {
    // Block if product is out of stock
    if (product.stock === 0) {
      toast.error(`"${product.name}" is out of stock`);
      return;
    }

    const alreadyInCart = cartQtyFor(product._id);

    // Block if cart qty would exceed available stock
    if (alreadyInCart >= product.stock) {
      toast.error(`Only ${product.stock} unit(s) of "${product.name}" available`);
      return;
    }

    setCart(prev => {
      const exists = prev.find(i => i.product === product._id);
      if (exists) {
        return prev.map(i =>
          i.product === product._id
            ? { ...i, qty: i.qty + 1, total: i.unitPrice * (i.qty + 1) }
            : i
        );
      }
      return [...prev, {
        product: product._id,
        name: product.name,
        unitPrice: product.price,
        qty: 1,
        total: product.price,
        maxStock: product.stock  // store max for + button cap
      }];
    });
  };

  const removeFromCart = (productId) =>
    setCart(prev => prev.filter(i => i.product !== productId));

  const updateQty = (productId, qty) => {
    if (qty <= 0) { removeFromCart(productId); return; }

    // Find the product's actual stock to cap the qty
    const product = products.find(p => p._id === productId);
    const maxStock = product?.stock ?? Infinity;

    if (qty > maxStock) {
      toast.error(`Only ${maxStock} unit(s) available`);
      return;
    }

    setCart(prev =>
      prev.map(i =>
        i.product === productId
          ? { ...i, qty, total: i.unitPrice * qty }
          : i
      )
    );
  };

  const subtotal   = cart.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const tax        = subtotal * 0.08;
  const discountAmt = subtotal * (discount / 100);
  const total      = subtotal + tax - discountAmt;

  const generateBill = async () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }

    // Frontend pre-check before hitting the server
    for (const item of cart) {
      const product = products.find(p => p._id === item.product);
      if (!product || product.stock === 0) {
        toast.error(`"${item.name}" is out of stock. Remove it from cart.`);
        return;
      }
      if (item.qty > product.stock) {
        toast.error(`Only ${product.stock} unit(s) of "${item.name}" available`);
        return;
      }
    }

    setProcessing(true);
    try {
      await api.post('/sales', {
        items: cart.map(i => ({ ...i, total: i.unitPrice * i.qty })),
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax:      parseFloat(tax.toFixed(2)),
        discount: parseFloat(discountAmt.toFixed(2)),
        total:    parseFloat(total.toFixed(2)),
      });
      toast.success('Bill generated & sale recorded!');
      setCart([]);
      setDiscount(0);
      await loadData(); // refresh products so stock counts update on tiles
    } catch(e) {
      // Show the exact server error message (e.g. "out of stock")
      toast.error(e.response?.data?.message || 'Failed to process');
    } finally {
      setProcessing(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchTab =
      filterTab === 'All'
      || (filterTab === 'Low Stock' && p.status === 'Low')
      || (filterTab === 'Overstock' && p.stock > 50)
      || (filterTab === 'Non-Selling' && p.stock > 0 && !p.lastSoldAt);
    return matchSearch && matchTab;
  });

  return (
    <>
    <div className="billing-layout">
      {/* Left: Product Selection */}
      <div className="billing-left">
        <div className="card" style={{ height:'100%' }}>
          <div className="flex-between mb-12">
            <div className="section-title">Product Search & Selection</div>
            <input
              className="form-control"
              style={{ width:180 }}
              placeholder="🔍 Search Products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="billing-filter-tabs mb-16">
            {['All','Low Stock','Overstock','Non-Selling'].map(t => (
              <button
                key={t}
                className={`billing-tab ${filterTab===t?'active':''}`}
                onClick={() => setFilterTab(t)}
              >{t}</button>
            ))}
          </div>

          <div className="products-grid">
            {filteredProducts.map(p => {
              const outOfStock   = p.stock === 0;
              const cartQty      = cartQtyFor(p._id);
              const atStockLimit = cartQty >= p.stock;

              return (
                <div
                  key={p._id}
                  className={`product-tile ${outOfStock ? 'out-of-stock' : ''}`}
                >
                  <div className={`pt-thumb ${outOfStock ? 'oos-thumb' : ''}`}>
                    {p.name[0]}
                  </div>
                  <div className="pt-name" onClick={e => { e.stopPropagation(); navigate(`/products/${p._id}`); }} style={{ cursor:'pointer', textDecoration:'underline', textDecorationColor:'rgba(59,130,246,0.4)' }} title="View product detail">{p.name}</div>
                  <div className="pt-price">${p.price.toFixed(2)}</div>

                  <div className={`pt-stock ${outOfStock ? 'oos-text' : ''}`}>
                    {outOfStock ? '⚠ OUT OF STOCK' : `${p.stock} IN STOCK`}
                    {cartQty > 0 && !outOfStock && (
                      <span className="in-cart-badge"> · {cartQty} in cart</span>
                    )}
                  </div>

                  

                  <button
                    className={`btn btn-sm pt-add ${outOfStock || atStockLimit ? 'btn-disabled' : 'btn-primary'}`}
                    onClick={() => addToCart(p)}
                    disabled={outOfStock || atStockLimit}
                    title={outOfStock ? 'Out of stock' : atStockLimit ? `Max stock reached (${p.stock})` : 'Add to cart'}
                  >
                    {outOfStock ? '✕' : '+'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Cart */}
      <div className="billing-right">
        <div className="card" style={{ height:'100%', display:'flex', flexDirection:'column' }}>
          <div className="section-title mb-16">Cart & Checkout</div>
          <div className="cart-title">Current Transaction</div>

          <table className="table" style={{ fontSize:13 }}>
            <thead>
              <tr><th>Item Name</th><th>Qty</th><th>Unit Price</th><th>Total</th><th></th></tr>
            </thead>
            <tbody>
              {cart.map(item => {
                const product  = products.find(p => p._id === item.product);
                const maxStock = product?.stock ?? 0;
                const overLimit = item.qty > maxStock;

                return (
                  <tr key={item.product} className={overLimit ? 'cart-row-error' : ''}>
                    <td>
                      {item.name}
                      {overLimit && (
                        <div className="cart-stock-warn">⚠ Only {maxStock} available</div>
                      )}
                    </td>
                    <td>
                      <div className="qty-control">
                        <button className="qty-btn" onClick={() => updateQty(item.product, item.qty - 1)}>-</button>
                        <span className={overLimit ? 'qty-over' : ''}>{item.qty}</span>
                        <button
                          className="qty-btn"
                          onClick={() => updateQty(item.product, item.qty + 1)}
                          disabled={item.qty >= maxStock}
                          style={{ opacity: item.qty >= maxStock ? 0.35 : 1 }}
                        >+</button>
                      </div>
                    </td>
                    <td>${item.unitPrice.toFixed(2)}</td>
                    <td><strong>${(item.unitPrice * item.qty).toFixed(2)}</strong></td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => removeFromCart(item.product)}>✕</button>
                    </td>
                  </tr>
                );
              })}
              {cart.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--text-muted)', padding:20 }}>Cart is empty</td></tr>
              )}
            </tbody>
          </table>

          <div className="cart-summary">
            <div className="summary-row"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="summary-row"><span>Tax (8%)</span><span>${tax.toFixed(2)}</span></div>
            <div className="summary-row discount-row">
              <span>Discount %</span>
              <input
                className="form-control"
                style={{ width:60 }}
                type="number" min="0" max="80"
                value={discount}
                onChange={e => setDiscount(+e.target.value)}
              />
              <span style={{ color:'var(--accent-green)' }}>-${discountAmt.toFixed(2)}</span>
            </div>
            <div className="summary-row total-row">
              <span>Total</span><strong>${total.toFixed(2)}</strong>
            </div>
          </div>

          <div style={{ marginTop:'auto', paddingTop:16 }}>
            <button
              className="btn btn-primary w-full generate-btn"
              onClick={generateBill}
              disabled={processing || cart.length === 0}
            >
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
    </>
  );
}
