import { ChevronLeft, Edit3, Eye, Plus, Search, Trash2, X, Palette } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@/components/lib/router";
import Footer from "@/components/components/layout/Footer";
import Navbar from "@/components/components/layout/Navbar";
import {
  getOutletIdByName,
  getMenuItemsForOutlet,
  saveMenuItemsForOutlet,
  subscribeToMenu,
  setMenuItemsAvailability,
  type MenuCatalogItem,
} from "@/features/orders/services/order-portal.service";
import { getVendorOutlet, subscribeToVendorSession } from "@/features/vendor/services/vendor-portal.service";
import { getLabelColorsForCanteen, type CustomLabel } from "@/lib/utils/label-utils";

type MenuForm = {
  name: string;
  category: string;
  price: string;
  description: string;
  isAvailable: boolean;
  labels: string[];
};

const LABEL_STORAGE_KEY = "bytehive-vendor-labels";

const suggestedCategories = ["Breakfast", "Main Course", "Beverages", "Snacks", "Desserts"];
const defaultColors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];
const emptyForm: MenuForm = { name: "", category: "", price: "", description: "", isAvailable: true, labels: [] };

function getStoredLabels(outletId: string): CustomLabel[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(LABEL_STORAGE_KEY);
    if (!stored) return [];
    const all = JSON.parse(stored) as Record<string, CustomLabel[]>;
    return all[outletId] || [];
  } catch {
    return [];
  }
}

function saveStoredLabels(outletId: string, labels: CustomLabel[]) {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(LABEL_STORAGE_KEY);
    const all = stored ? JSON.parse(stored) : {};
    all[outletId] = labels;
    localStorage.setItem(LABEL_STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

function VendorMenuPage() {
  const navigate = useNavigate();
  const [outletName, setOutletName] = useState(() => getVendorOutlet());
  const outletId = getOutletIdByName(outletName);
  const [menuItems, setMenuItems] = useState<MenuCatalogItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [formData, setFormData] = useState<MenuForm>(emptyForm);
  const [isMobile, setIsMobile] = useState(false);
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [customLabels, setCustomLabels] = useState<CustomLabel[]>(() => getStoredLabels(outletId || ""));
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(defaultColors[0]);

  useEffect(() => {
    const syncOutlet = () => setOutletName(getVendorOutlet());
    return subscribeToVendorSession(syncOutlet);
  }, []);

  useEffect(() => {
    if (!outletName) {
      navigate("/vendor/login", { replace: true });
      return;
    }

    const syncMenu = () => setMenuItems(getMenuItemsForOutlet(outletId));
    syncMenu();

    const unsubscribe = subscribeToMenu(syncMenu);
    return unsubscribe;
  }, [navigate, outletId, outletName]);

  useEffect(() => {
    const syncViewport = () => setIsMobile(window.innerWidth < 860);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return menuItems;

    return menuItems.filter((item) =>
      [item.name, item.category, item.description ?? ""].some((value) => value.toLowerCase().includes(query))
    );
  }, [menuItems, searchQuery]);

  const categoryOptions = useMemo(() => {
    const categories = new Set<string>(suggestedCategories);
    menuItems.forEach((item) => {
      if (item.category.trim()) {
        categories.add(item.category.trim());
      }
    });
    customLabels.forEach((label) => {
      categories.add(label.name);
    });
    if (formData.category.trim()) {
      categories.add(formData.category.trim());
    }

    return Array.from(categories).sort((left, right) => left.localeCompare(right));
  }, [formData.category, menuItems, customLabels]);

  const persistMenu = (items: MenuCatalogItem[]) => {
    setMenuItems(items);
    if (outletId) {
      saveMenuItemsForOutlet(outletId, items);
    }
  };

  const handleAddLabel = () => {
    if (!newLabelName.trim() || !outletId) return;
    const exists = customLabels.find((l) => l.name.toLowerCase() === newLabelName.trim().toLowerCase());
    if (exists) return;
    
    const newLabel = { name: newLabelName.trim(), color: newLabelColor };
    const updated = [...customLabels, newLabel];
    setCustomLabels(updated);
    saveStoredLabels(outletId, updated);
    setNewLabelName("");
  };

  const handleDeleteLabel = (name: string) => {
    if (!outletId) return;
    const updated = customLabels.filter((l) => l.name !== name);
    setCustomLabels(updated);
    saveStoredLabels(outletId, updated);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setFormData(emptyForm);
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
      labels: item.labels || [],
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    persistMenu(menuItems.filter((item) => item.id !== id));
  };

  const toggleAvailability = (id: string) => {
    if (!outletId) return;

    const current = menuItems.find((m) => m.id === id);
    const nextItems = setMenuItemsAvailability(outletId, [id], !(current?.isAvailable !== false));
    setMenuItems(nextItems);
  };

  const handleSubmit = () => {
    const name = formData.name.trim();
    const category = formData.category.trim();
    const price = Number.parseFloat(formData.price);

    if (!name || !category || Number.isNaN(price) || !outletId) return;

    const nextItem: MenuCatalogItem = {
      id: editingItem ?? `${outletId}-${Date.now()}`,
      canteenId: outletId,
      name,
      category,
      price,
      description: formData.description.trim(),
      image: menuItems.find((item) => item.id === editingItem)?.image,
      isAvailable: formData.isAvailable,
      isVeg: menuItems.find((item) => item.id === editingItem)?.isVeg,
      labels: formData.labels,
    };

    if (editingItem) {
      persistMenu(menuItems.map((item) => (item.id === editingItem ? nextItem : item)));
    } else {
      persistMenu([nextItem, ...menuItems]);
    }

    closeForm();
  };

  const handlePreview = () => {
    if (!outletId) return;
    navigate(`/canteens/${outletId}?preview=vendor&src=menu`);
  };

  return (
    <div className="vendor-page">
      <Navbar />
      <main className="vendor-main">
        <div className="vendor-shell vendor-stack">
          <Link to="/vendor/dashboard" className="vendor-back-link">
            <ChevronLeft size={18} /> Back to Dashboard
          </Link>

          <section className="vendor-card">
            <div className="vendor-menu-toolbar">
              <div className="vendor-section-title">
                <h1 className="vendor-page-title">Menu Management</h1>
                <p>{outletName}</p>
              </div>
              <div className="vendor-toolbar-actions">
                <button type="button" className="vendor-button-secondary vendor-preview-btn" onClick={handlePreview} disabled={!outletId}>
                  <Eye size={18} /> Preview Menu
                </button>
                <button type="button" className="vendor-button-secondary" onClick={() => setShowLabelManager(true)}>
                  <Palette size={18} /> Manage Labels
                </button>
                <button type="button" className="vendor-button" onClick={handleAddNew}>
                  <Plus size={18} /> Add Item
                </button>
              </div>
            </div>
          </section>

          <section className="vendor-card">
            <p className="vendor-menu-description">
              Menu updates here reflect directly in the user ordering portal.
            </p>
          </section>

          <section className="vendor-card">
            <div className="vendor-field vendor-menu-search">
              <label htmlFor="vendor-menu-search">Search items</label>
              <div className="vendor-search-input-wrap">
                <Search
                  size={18}
                  className="vendor-search-input-icon"
                />
                <input
                  id="vendor-menu-search"
                  className="vendor-input vendor-input-has-icon"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by name, category, or description"
                />
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
                  <div className="vendor-card-header vendor-menu-card-meta">
                    <span className="vendor-menu-price">Rs {item.price}</span>
                    <button
                      type="button"
                      className={`vendor-badge-toggle ${
                        item.isAvailable ? "vendor-badge-toggle-available" : "vendor-badge-toggle-unavailable"
                      }`}
                      onClick={() => toggleAvailability(item.id)}
                    >
                      {item.isAvailable ? "Available" : "Unavailable"}
                    </button>
                  </div>
                  <div className="vendor-menu-card-actions">
                    <button type="button" className="vendor-button-secondary" onClick={() => handleEdit(item)}>
                      <Edit3 size={16} /> Edit
                    </button>
                    <button type="button" className="vendor-button-ghost" onClick={() => handleDelete(item.id)}>
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </article>
              ))}
              {!filteredItems.length && (
                <div className="vendor-empty">
                  <strong>No items found</strong>
                  <p>Try a different search or add a new menu item.</p>
                </div>
              )}
            </section>
          ) : (
            <section className="vendor-card vendor-menu-table-wrap">
              <table className="vendor-menu-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th className="vendor-table-actions-heading">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        <p className="vendor-muted vendor-item-description">
                          {item.description}
                        </p>
                      </td>
                      <td>
                        <span className="vendor-category-tag">{item.category}</span>
                      </td>
                      <td className="vendor-menu-price">Rs {item.price}</td>
                      <td>
                        <button
                          type="button"
                          className={`vendor-badge-toggle ${
                            item.isAvailable ? "vendor-badge-toggle-available" : "vendor-badge-toggle-unavailable"
                          }`}
                          onClick={() => toggleAvailability(item.id)}
                        >
                          {item.isAvailable ? "Available" : "Unavailable"}
                        </button>
                      </td>
                      <td>
                        <div className="vendor-table-actions">
                          <button
                            type="button"
                            className="vendor-icon-button"
                            onClick={() => handleEdit(item)}
                            aria-label={`Edit ${item.name}`}
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            type="button"
                            className="vendor-icon-button"
                            onClick={() => handleDelete(item.id)}
                            aria-label={`Delete ${item.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filteredItems.length && (
                <div className="vendor-empty">
                  <strong>No items found</strong>
                  <p>Try a different search or add a new menu item.</p>
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      {showForm && (
        <>
          <div className="vendor-form-backdrop" onClick={closeForm} />
          <div className="vendor-form-wrap">
            <section
              className="vendor-form-panel"
              role="dialog"
              aria-modal="true"
              aria-label={editingItem ? "Edit menu item" : "Add menu item"}
            >
              <div className="vendor-form-header">
                <div>
                  <h2>{editingItem ? "Edit Menu Item" : "Add New Menu Item"}</h2>
                  <p className="vendor-muted">Update details, pricing, and availability in one place.</p>
                </div>
                <button type="button" className="vendor-icon-button" onClick={closeForm} aria-label="Close form">
                  <X size={18} />
                </button>
              </div>
              <div className="vendor-form-body">
                <div className="vendor-field">
                  <label htmlFor="vendor-item-name">Item Name</label>
                  <input
                    id="vendor-item-name"
                    className="vendor-input"
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                  />
                </div>
                <div className="vendor-form-row">
                  <div className="vendor-field">
                    <label htmlFor="vendor-item-category">Category / Label</label>
                    <input
                      id="vendor-item-category"
                      className="vendor-input"
                      list="vendor-category-options"
                      value={formData.category}
                      onChange={(event) => setFormData({ ...formData, category: event.target.value })}
                      placeholder="Type or pick a category"
                    />
                    <datalist id="vendor-category-options">
                      {categoryOptions.map((category) => (
                        <option key={category} value={category} />
                      ))}
                    </datalist>
                  </div>
                  <div className="vendor-field">
                    <label htmlFor="vendor-item-price">Price (Rs)</label>
                    <input
                      id="vendor-item-price"
                      type="number"
                      min="0"
                      className="vendor-input"
                      value={formData.price}
                      onChange={(event) => setFormData({ ...formData, price: event.target.value })}
                    />
                  </div>
                </div>
                <div className="vendor-field">
                  <label htmlFor="vendor-item-description">Description</label>
                  <textarea
                    id="vendor-item-description"
                    className="vendor-textarea"
                    value={formData.description}
                    onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                  />
                </div>
                <div className="vendor-field">
                  <label>Labels</label>
                  <div className="vendor-label-picker">
                    {customLabels.length === 0 && (
                      <p className="vendor-muted vendor-inline-note">No labels created yet. Use "Manage Labels" button first.</p>
                    )}
                    {customLabels.map((label) => {
                      const isSelected = formData.labels.includes(label.name);
                      return (
                        <button
                          key={label.name}
                          type="button"
                          onClick={() => {
                            const current = formData.labels;
                            const updated = isSelected 
                              ? current.filter(l => l !== label.name)
                              : [...current, label.name];
                            setFormData({ ...formData, labels: updated });
                          }}
                          className={`vendor-label-toggle ${isSelected ? "vendor-label-toggle-selected" : ""}`}
                          style={{
                            borderColor: isSelected ? label.color : undefined,
                            background: isSelected ? `${label.color}20` : undefined,
                            color: isSelected ? label.color : undefined,
                          }}
                        >
                          {label.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className="vendor-form-check">
                  <input
                    type="checkbox"
                    checked={formData.isAvailable}
                    onChange={(event) => setFormData({ ...formData, isAvailable: event.target.checked })}
                  />
                  <span className="vendor-form-toggle">Available for ordering</span>
                </label>
              </div>
              <div className="vendor-form-actions">
                <button type="button" className="vendor-button-ghost" onClick={closeForm}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="vendor-button"
                  disabled={!formData.name.trim() || !formData.category.trim() || !formData.price}
                  onClick={handleSubmit}
                >
                  {editingItem ? "Update Item" : "Add Item"}
                </button>
              </div>
            </section>
          </div>
        </>
      )}

      {showLabelManager && (
        <>
          <div className="vendor-form-backdrop" onClick={() => setShowLabelManager(false)} />
          <div className="vendor-form-wrap">
            <section className="vendor-form-panel" role="dialog" aria-modal="true" aria-label="Manage Labels">
              <div className="vendor-form-header">
                <div>
                  <h2>Manage Labels</h2>
                  <p className="vendor-muted">Create custom labels with colors for your menu categories.</p>
                </div>
                <button type="button" className="vendor-icon-button" onClick={() => setShowLabelManager(false)} aria-label="Close">
                  <X size={18} />
                </button>
              </div>
              <div className="vendor-form-body">
                <div className="vendor-field">
                  <label>Create New Label</label>
                  <div className="vendor-label-create-row">
                    <input
                      className="vendor-input vendor-label-name-input"
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      placeholder="Label name"
                    />
                    <div className="vendor-color-swatch-row">
                      {defaultColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewLabelColor(color)}
                          className={`vendor-color-swatch-button ${newLabelColor === color ? "vendor-color-swatch-button-selected" : ""}`}
                          style={{ background: color }}
                          aria-label={`Select color ${color}`}
                        />
                      ))}
                    </div>
                    <button type="button" className="vendor-button" onClick={handleAddLabel} disabled={!newLabelName.trim()}>
                      Add
                    </button>
                  </div>
                </div>
                
                <div className="vendor-label-list-block">
                  <label>Your Labels</label>
                  <div className="vendor-label-list">
                    {customLabels.length === 0 && (
                      <p className="vendor-muted vendor-inline-note">No custom labels yet. Create one above.</p>
                    )}
                    {customLabels.map((label) => (
                      <div
                        key={label.name}
                        className="vendor-label-chip"
                        style={{ background: `${label.color}20`, borderColor: label.color }}
                      >
                        <span className="vendor-label-chip-swatch" style={{ background: label.color }} />
                        <span className="vendor-label-chip-name">{label.name}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteLabel(label.name)}
                          className="vendor-label-chip-delete"
                          aria-label={`Delete ${label.name}`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="vendor-form-actions">
                <button type="button" className="vendor-button-ghost" onClick={() => setShowLabelManager(false)}>
                  Done
                </button>
              </div>
            </section>
          </div>
        </>
      )}

      <Footer variant="vendor" />
    </div>
  );
}

export default VendorMenuPage;
