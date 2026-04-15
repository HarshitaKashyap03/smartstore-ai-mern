import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import './Inventory.css';

const emptyForm = { name:'', sku:'', category:'', stock:0, minStock:10, price:0, costPrice:0 };

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filterCat,setFilterCat]= useState('All');
  const [filterSt, setFilterSt] = useState('All');
  const [showModal,setShowModal] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState(emptyForm);
  const [saving,   setSaving]   = useState(false);
  const [predictions, setPredictions] = useState([]);

  const loadProducts = async () => {
    try {
      const params = {};
      if (filterCat !== 'All') params.category = filterCat;
      if (filterSt !== 'All')  params.status    = filterSt;
      if (search)               params.search    = search;
      const { data } = await api.get('/products', { params });
      setProducts(data);
    } catch(e) { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  };

  const loadPredictions = async () => {
    try {
      const { data } = await api.get('/predict');
      setPredictions(data.slice(0, 2));
    } catch {}
  };

  useEffect(() => { loadProducts(); loadPredictions(); }, [filterCat, filterSt, search]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (p) => { setEditing(p._id); setForm({ name:p.name, sku:p.sku, category:p.category, stock:p.stock, minStock:p.minStock, price:p.price, costPrice:p.costPrice }); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) {
        await api.put(`/products/${editing}`, form);
        toast.success('Product updated');
      } else {
        await api.post('/products', form);
        toast.success('Product added');
      }
      setShowModal(false); loadProducts();
    } catch(e) { toast.error(e.response?.data?.message || 'Error saving'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try { await api.delete(`/products/${id}`); toast.success('Deleted'); loadProducts(); }
    catch { toast.error('Delete failed'); }
  };

  const statusBadge = (s) => {
    if (s === 'In Stock')    return <span className="badge badge-green">IN STOCK</span>;
    if (s === 'Low')         return <span className="badge badge-amber">LOW</span>;
    if (s === 'Out of Stock')return <span className="badge badge-red">OUT</span>;
  };

  const categories = ['All', 'Audio', 'Gaming', 'Wearables', 'Electronics', 'Beverages', 'Food'];

  return (
    <div className="inventory-page">
      <div className="card mb-20">
        <div className="flex-between mb-16">
          <h2 className="page-h2">Full Product Table</h2>
          <div className="flex gap-8">
            <input className="form-control" style={{ width: 200 }} placeholder="🔍 Search Inventory" value={search} onChange={e => setSearch(e.target.value)} />
            <select className="form-control" style={{ width: 130 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
            <select className="form-control" style={{ width: 130 }} value={filterSt} onChange={e => setFilterSt(e.target.value)}>
              {['All','In Stock','Low','Out of Stock'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <button className="btn btn-primary mb-16" onClick={openAdd}>+ Add New Product</button>

        {loading ? <div className="loading-wrap"><div className="spinner"/></div> : (
          <table className="table">
            <thead>
              <tr>
                <th>Product Name</th><th>SKU</th><th>Category</th>
                <th>Stock</th><th>Price</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p._id}>
                  <td><div className="product-name-cell">
                    <div className="product-thumb">{p.name[0]}</div>
                    <span>{p.name}</span>
                  </div></td>
                  <td><code style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.sku}</code></td>
                  <td>{p.category}</td>
                  <td>
                    <span className="stock-num">{p.stock}</span>
                    {statusBadge(p.status)}
                  </td>
                  <td><strong>${p.price.toFixed(2)}</strong></td>
                  <td>{statusBadge(p.status)}</td>
                  <td>
                    <div className="flex gap-8">
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}>✏ Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p._id)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && <tr><td colSpan={7} style={{ textAlign:'center', color:'var(--text-muted)', padding: 32 }}>No products found</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {/* Restock Suggestions */}
      {predictions.length > 0 && (
        <div className="grid-2">
          {predictions.map(p => (
            <div key={p._id} className="card restock-card">
              <div className="section-title">Restock Suggestion Panel</div>
              <div className="restock-sub">Prioritized Items based on AI Predictions.</div>
              <div className="restock-item">
                <div className="product-thumb">{p.name[0]}</div>
                <div className="restock-info">
                  <div className="restock-name">Restock {p.name}</div>
                  <div className="restock-qty">Recommended Qty +{p.restockQty}</div>
                </div>
                <button className="btn btn-primary btn-sm">Restock Now</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">{editing ? 'Edit Product' : 'Add New Product'}</div>
            <form onSubmit={handleSave}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input className="form-control" value={form.name} onChange={e => setForm({...form,name:e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">SKU</label>
                  <input className="form-control" value={form.sku} onChange={e => setForm({...form,sku:e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input className="form-control" value={form.category} onChange={e => setForm({...form,category:e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock Qty</label>
                  <input className="form-control" type="number" value={form.stock} onChange={e => setForm({...form,stock:+e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Price ($)</label>
                  <input className="form-control" type="number" step="0.01" value={form.price} onChange={e => setForm({...form,price:+e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Cost Price ($)</label>
                  <input className="form-control" type="number" step="0.01" value={form.costPrice} onChange={e => setForm({...form,costPrice:+e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
