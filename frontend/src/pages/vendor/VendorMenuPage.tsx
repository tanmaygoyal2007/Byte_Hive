import { ChevronLeft, Edit3, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../../components/layout/Footer";
import Navbar from "../../components/layout/Navbar";
import { getOutletIdByName, getMenuItemsForOutlet, saveMenuItemsForOutlet, subscribeToMenu, type MenuCatalogItem } from "../../utils/orderPortal";
import { getVendorOutlet } from "../../utils/vendorPortal";
import "./VendorPortal.css";

type MenuForm = {
  name: string;
  category: string;
  price: string;
  description: string;
  isAvailable: boolean;
};

const categories = ["Breakfast", "Main Course", "Beverages", "Snacks", "Desserts"];
const emptyForm: MenuForm = { name: "", category: "", price: "", description: "", isAvailable: true };

function VendorMenuPage() {
  const navigate = useNavigate();
  const [outletName, setOutletName] = useState("");
  const [outletId, setOutletId] = useState("");
  const [menuItems, setMenuItems] = useState<MenuCatalogItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [formData, setFormData] = useState<MenuForm>(emptyForm);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const outlet = getVendorOutlet();
    if (!outlet) {
      navigate("/vendor/login", { replace: true });
      return;
    }

    const resolvedOutletId = getOutletIdByName(outlet);
    const syncMenu = () => setMenuItems(getMenuItemsForOutlet(resolvedOutletId));

    setOutletName(outlet);
    setOutletId(resolvedOutletId);
    syncMenu();

    const unsubscribe = subscribeToMenu(syncMenu);
    return unsubscribe;
  }, [navigate]);

  useEffect(() => {
    const syncViewport = () => setIsMobile(window.innerWidth < 860);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return menuItems;
    return menuItems.filter((item) => [item.name, item.category, item.description ?? ""].some((value) => value.toLowerCase().includes(query)));
  }, [menuItems, searchQuery]);

  const persistMenu = (items: MenuCatalogItem[]) => {
    setMenuItems(items);
    if (outletId) saveMenuItemsForOutlet(outletId, items);
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const handleEdit = (item: MenuCatalogItem) => {
    setEditingItem(item.id);
    setFormData({
      name: item.name,
      category: item.category,
      price: String(item.price),
      description: item.description ?? "",
      isAvailable: item.isAvailable,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    persistMenu(menuItems.filter((item) => item.id !== id));
  };

  const toggleAvailability = (id: string) => {
    persistMenu(menuItems.map((item) => (item.id === id ? { ...item, isAvailable: !item.isAvailable } : item)));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.category || !formData.price || !outletId) return;

    const nextItem: MenuCatalogItem = {
      id: editingItem ?? `${outletId}-${Date.now()}`,
      canteenId: outletId,
      name: formData.name,
      category: formData.category,
      price: Number.parseFloat(formData.price),
      description: formData.description,
      image: menuItems.find((item) => item.id === editingItem)?.image,
      isAvailable: formData.isAvailable,
    };

    if (editingItem) {
      persistMenu(menuItems.map((item) => (item.id === editingItem ? nextItem : item)));
    } else {
      persistMenu([nextItem, ...menuItems]);
    }
    setShowForm(false);
  };

  return (
    <div className="vendor-page">
      <Navbar />
      <main className="vendor-main">
        <div className="vendor-shell vendor-stack">
          <Link to="/vendor/dashboard" className="vendor-back-link"><ChevronLeft size={18} /> Back to Dashboard</Link>

          <section className="vendor-card">
            <div className="vendor-menu-toolbar">
              <div className="vendor-section-title">
                <h1 className="vendor-page-title">Menu Management</h1>
                <p>{outletName}</p>
              </div>
              <button type="button" className="vendor-button" onClick={handleAddNew}><Plus size={18} /> Add Item</button>
            </div>
          </section>

          <section className="vendor-card"><p className="vendor-menu-description">Menu updates here reflect directly in the user ordering portal.</p></section>

          <section className="vendor-card">
            <div className="vendor-field vendor-menu-search">
              <label htmlFor="vendor-menu-search">Search items</label>
              <div style={{ position: "relative" }}>
                <Search size={18} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input id="vendor-menu-search" className="vendor-input" style={{ paddingLeft: 46 }} value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search by name, category, or description" />
              </div>
            </div>
          </section>

          {isMobile ? (
            <section className="vendor-stack">
              {filteredItems.map((item) => (
                <article key={item.id} className="vendor-menu-card">
                  <div className="vendor-menu-card-title">
                    <div>
                      <h3>{item.name}</h3>
                      <p className="vendor-muted">{item.description}</p>
                    </div>
                    <span className="vendor-category-tag">{item.category}</span>
                  </div>
                  <div className="vendor-card-header" style={{ marginTop: 12 }}>
                    <span className="vendor-menu-price">Rs {item.price}</span>
                    <button type="button" className={`vendor-badge-toggle ${item.isAvailable ? "vendor-badge-toggle-available" : "vendor-badge-toggle-unavailable"}`} onClick={() => toggleAvailability(item.id)}>
                      {item.isAvailable ? "Available" : "Unavailable"}
                    </button>
                  </div>
                  <div className="vendor-menu-card-actions">
                    <button type="button" className="vendor-button-secondary" onClick={() => handleEdit(item)}><Edit3 size={16} /> Edit</button>
                    <button type="button" className="vendor-button-ghost" onClick={() => handleDelete(item.id)}><Trash2 size={16} /> Delete</button>
                  </div>
                </article>
              ))}
              {!filteredItems.length && <div className="vendor-empty"><strong>No items found</strong><p>Try a different search or add a new menu item.</p></div>}
            </section>
          ) : (
            <section className="vendor-card vendor-menu-table-wrap">
              <table className="vendor-menu-table">
                <thead>
                  <tr><th>Item Name</th><th>Category</th><th>Price</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th></tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.name}</strong><p className="vendor-muted" style={{ margin: "6px 0 0" }}>{item.description}</p></td>
                      <td><span className="vendor-category-tag">{item.category}</span></td>
                      <td className="vendor-menu-price">Rs {item.price}</td>
                      <td><button type="button" className={`vendor-badge-toggle ${item.isAvailable ? "vendor-badge-toggle-available" : "vendor-badge-toggle-unavailable"}`} onClick={() => toggleAvailability(item.id)}>{item.isAvailable ? "Available" : "Unavailable"}</button></td>
                      <td>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                          <button type="button" className="vendor-icon-button" onClick={() => handleEdit(item)} aria-label={`Edit ${item.name}`}><Edit3 size={16} /></button>
                          <button type="button" className="vendor-icon-button" onClick={() => handleDelete(item.id)} aria-label={`Delete ${item.name}`}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filteredItems.length && <div className="vendor-empty"><strong>No items found</strong><p>Try a different search or add a new menu item.</p></div>}
            </section>
          )}
        </div>
      </main>

      {showForm && (
        <>
          <div className="vendor-form-backdrop" onClick={() => setShowForm(false)} />
          <div className="vendor-form-wrap">
            <section className="vendor-form-panel" role="dialog" aria-modal="true" aria-label={editingItem ? "Edit menu item" : "Add menu item"}>
              <div className="vendor-form-header">
                <div>
                  <h2>{editingItem ? "Edit Menu Item" : "Add New Menu Item"}</h2>
                  <p className="vendor-muted">Update details, pricing, and availability in one place.</p>
                </div>
                <button type="button" className="vendor-icon-button" onClick={() => setShowForm(false)} aria-label="Close form"><X size={18} /></button>
              </div>
              <div className="vendor-form-body">
                <div className="vendor-field"><label htmlFor="vendor-item-name">Item Name</label><input id="vendor-item-name" className="vendor-input" value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} /></div>
                <div className="vendor-form-row">
                  <div className="vendor-field">
                    <label htmlFor="vendor-item-category">Category</label>
                    <select id="vendor-item-category" className="vendor-select" value={formData.category} onChange={(event) => setFormData({ ...formData, category: event.target.value })}>
                      <option value="">Select category</option>
                      {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                  </div>
                  <div className="vendor-field"><label htmlFor="vendor-item-price">Price (Rs)</label><input id="vendor-item-price" type="number" min="0" className="vendor-input" value={formData.price} onChange={(event) => setFormData({ ...formData, price: event.target.value })} /></div>
                </div>
                <div className="vendor-field"><label htmlFor="vendor-item-description">Description</label><textarea id="vendor-item-description" className="vendor-textarea" value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} /></div>
                <label className="vendor-form-check"><input type="checkbox" checked={formData.isAvailable} onChange={(event) => setFormData({ ...formData, isAvailable: event.target.checked })} /><span className="vendor-form-toggle">Available for ordering</span></label>
              </div>
              <div className="vendor-form-actions">
                <button type="button" className="vendor-button-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="button" className="vendor-button" disabled={!formData.name || !formData.category || !formData.price} onClick={handleSubmit}>{editingItem ? "Update Item" : "Add Item"}</button>
              </div>
            </section>
          </div>
        </>
      )}

      <Footer />
    </div>
  );
}

export default VendorMenuPage;
