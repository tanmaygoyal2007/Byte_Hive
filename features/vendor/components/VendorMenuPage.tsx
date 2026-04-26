import { ChevronLeft, Edit3, Eye, Plus, Search, Sparkles, Tags, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
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
import {
  getAllFoodLabelsForCanteen,
  getDisplayLabelsForItem,
  getStoredCustomLabelsForCanteen,
  getSystemFoodLabels,
  saveStoredCustomLabelsForCanteen,
  type CustomLabel,
} from "@/lib/utils/label-utils";

type MenuForm = {
  name: string;
  category: string;
  price: string;
  description: string;
  isAvailable: boolean;
  isVeg: boolean;
  labels: string[];
};

type PendingMenuSave = {
  item: MenuCatalogItem;
  changes: Array<{ label: string; from: string; to: string }>;
};

const suggestedCategories = ["Breakfast", "Main Course", "Beverages", "Snacks", "Desserts"];
const defaultColors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];
const emptyForm: MenuForm = { name: "", category: "", price: "", description: "", isAvailable: true, isVeg: true, labels: [] };

function VendorMenuPage() {
  const navigate = useNavigate();
  const [outletName, setOutletName] = useState(() => getVendorOutlet());
  const outletId = getOutletIdByName(outletName);
  const [menuItems, setMenuItems] = useState<MenuCatalogItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showLabelEditor, setShowLabelEditor] = useState(false);
  const [labelOnlyMode, setLabelOnlyMode] = useState(false);
  const [showSaveReview, setShowSaveReview] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [formData, setFormData] = useState<MenuForm>(emptyForm);
  const [draftLabelSelection, setDraftLabelSelection] = useState<string[]>([]);
  const [pendingSave, setPendingSave] = useState<PendingMenuSave | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [customLabels, setCustomLabels] = useState<CustomLabel[]>(() => getStoredCustomLabelsForCanteen(outletId || ""));
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelDescription, setNewLabelDescription] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(defaultColors[0]);

  useEffect(() => {
    const syncOutlet = () => setOutletName(getVendorOutlet());
    return subscribeToVendorSession(syncOutlet);
  }, []);

  useEffect(() => {
    if (!outletName) {
      navigate("/vendor/unauthorized", { replace: true });
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

  useEffect(() => {
    setCustomLabels(getStoredCustomLabelsForCanteen(outletId || ""));
  }, [outletId]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return menuItems;

    return menuItems.filter((item) =>
      [
        item.name,
        item.category,
        item.description ?? "",
        ...getDisplayLabelsForItem(item, outletId).map((label) => label.name),
      ].some((value) => value.toLowerCase().includes(query))
    );
  }, [menuItems, searchQuery]);

  const systemLabels = useMemo(() => getSystemFoodLabels(), []);
  const allLabelOptions = useMemo(() => getAllFoodLabelsForCanteen(outletId), [outletId, customLabels]);

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
    const normalizedName = newLabelName.trim().toLowerCase();
    const exists = allLabelOptions.find((label) => label.name.toLowerCase() === normalizedName);
    if (exists) return;

    const newLabel = { name: newLabelName.trim(), color: newLabelColor, description: newLabelDescription.trim() || "Custom food label." };
    const updated = [...customLabels, newLabel];
    setCustomLabels(updated);
    saveStoredCustomLabelsForCanteen(outletId, updated);
    setNewLabelName("");
    setNewLabelDescription("");
  };

  const handleDeleteLabel = (name: string) => {
    if (!outletId) return;
    const updated = customLabels.filter((l) => l.name !== name);
    setCustomLabels(updated);
    saveStoredCustomLabelsForCanteen(outletId, updated);
  };

  const closeForm = () => {
    setShowForm(false);
    setShowLabelEditor(false);
    setLabelOnlyMode(false);
    setShowSaveReview(false);
    setEditingItem(null);
    setFormData(emptyForm);
    setDraftLabelSelection([]);
    setPendingSave(null);
  };

  const handleAddNew = (openLabels = false) => {
    setEditingItem(null);
    setFormData(emptyForm);
    setDraftLabelSelection([]);
    setShowLabelEditor(openLabels);
    setLabelOnlyMode(false);
    setShowSaveReview(false);
    setPendingSave(null);
    setShowForm(true);
  };

  const handleEdit = (item: MenuCatalogItem, openLabels = false) => {
    const existingLabels = getDisplayLabelsForItem(item, outletId).map((label) => label.name);
    setEditingItem(item.id);
    setFormData({
      name: item.name,
      category: item.category,
      price: String(item.price),
      description: item.description ?? "",
      isAvailable: item.isAvailable,
      isVeg: item.isVeg ?? true,
      labels: existingLabels,
    });
    setDraftLabelSelection(existingLabels);
    setShowLabelEditor(openLabels);
    setLabelOnlyMode(openLabels);
    setShowSaveReview(false);
    setPendingSave(null);
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

  const commitPendingSave = () => {
    if (!pendingSave) return;

    if (editingItem) {
      persistMenu(menuItems.map((item) => (item.id === editingItem ? pendingSave.item : item)));
    } else {
      persistMenu([pendingSave.item, ...menuItems]);
    }

    closeForm();
  };

  const commitLabelOnlyUpdate = () => {
    if (!editingItem) {
      closeForm();
      return;
    }

    const currentItem = menuItems.find((item) => item.id === editingItem);
    if (!currentItem) {
      closeForm();
      return;
    }

    persistMenu(
      menuItems.map((item) => (item.id === editingItem ? { ...currentItem, labels: draftLabelSelection } : item))
    );
    closeForm();
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
      isVeg: formData.isVeg,
      labels: draftLabelSelection,
    };

    const previousItem = menuItems.find((item) => item.id === editingItem);
    const changeSummary: Array<{ label: string; from: string; to: string }> = [];

    if (!previousItem) {
      changeSummary.push({ label: "Item", from: "New item", to: name });
      changeSummary.push({ label: "Category", from: "Not set", to: category });
      changeSummary.push({ label: "Price", from: "Not set", to: `Rs ${price}` });
      if (nextItem.description) {
        changeSummary.push({ label: "Description", from: "Not set", to: nextItem.description });
      }
      changeSummary.push({ label: "Availability", from: "Not set", to: nextItem.isAvailable ? "Available" : "Unavailable" });
      changeSummary.push({ label: "Food Type", from: "Not set", to: nextItem.isVeg ? "Veg" : "Non-veg" });
      changeSummary.push({
        label: "Labels",
        from: "No labels",
        to: nextItem.labels?.length ? nextItem.labels.join(", ") : "No labels",
      });
    } else {
      if (previousItem.name !== nextItem.name) {
        changeSummary.push({ label: "Name", from: previousItem.name, to: nextItem.name });
      }
      if (previousItem.category !== nextItem.category) {
        changeSummary.push({ label: "Category", from: previousItem.category, to: nextItem.category });
      }
      if (previousItem.price !== nextItem.price) {
        changeSummary.push({ label: "Price", from: `Rs ${previousItem.price}`, to: `Rs ${nextItem.price}` });
      }
      if ((previousItem.description ?? "") !== nextItem.description) {
        changeSummary.push({
          label: "Description",
          from: previousItem.description?.trim() || "Empty",
          to: nextItem.description || "Empty",
        });
      }
      if ((previousItem.isAvailable !== false) !== nextItem.isAvailable) {
        changeSummary.push({
          label: "Availability",
          from: previousItem.isAvailable ? "Available" : "Unavailable",
          to: nextItem.isAvailable ? "Available" : "Unavailable",
        });
      }
      if ((previousItem.isVeg ?? true) !== nextItem.isVeg) {
        changeSummary.push({
          label: "Food Type",
          from: (previousItem.isVeg ?? true) ? "Veg" : "Non-veg",
          to: nextItem.isVeg ? "Veg" : "Non-veg",
        });
      }

      const previousLabels = (previousItem.labels ?? []).join(", ") || "No labels";
      const nextLabels = (nextItem.labels ?? []).join(", ") || "No labels";
      if (previousLabels !== nextLabels) {
        changeSummary.push({ label: "Labels", from: previousLabels, to: nextLabels });
      }
    }

    if (changeSummary.length === 0) {
      closeForm();
      return;
    }

    setPendingSave({ item: nextItem, changes: changeSummary });
    setShowSaveReview(true);
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
                  <Sparkles size={18} /> Manage Food Labels
                </button>
                <button type="button" className="vendor-button" onClick={() => handleAddNew()}>
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
                      <div className="vendor-menu-card-labels">
                        {getDisplayLabelsForItem(item, outletId).map((label) => (
                          <span key={`${item.id}-${label.id}`} className="vendor-label-badge" style={{ "--vendor-label-color": label.color } as CSSProperties} title={label.description}>
                            <span className="vendor-label-badge-dot" />
                            {label.name}
                          </span>
                        ))}
                      </div>
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
                    <button type="button" className="vendor-button-secondary" onClick={() => handleEdit(item, true)}>
                      <Tags size={16} /> Labels
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
                        <div className="vendor-menu-card-labels vendor-menu-card-labels-compact">
                          {getDisplayLabelsForItem(item, outletId).map((label) => (
                            <span key={`${item.id}-${label.id}`} className="vendor-label-badge" style={{ "--vendor-label-color": label.color } as CSSProperties} title={label.description}>
                              <span className="vendor-label-badge-dot" />
                              {label.name}
                            </span>
                          ))}
                        </div>
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
                            onClick={() => handleEdit(item, true)}
                            aria-label={`Edit labels for ${item.name}`}
                          >
                            <Tags size={16} />
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
          <div className={`vendor-form-wrap ${showSaveReview ? "vendor-form-wrap-under-review" : ""}`}>
            <div
              className={`vendor-edit-shell ${showLabelEditor ? "vendor-edit-shell-labels-open" : ""} ${
                labelOnlyMode ? "vendor-edit-shell-labels-only" : ""
              }`}
            >
              <aside className={`vendor-label-sidecar ${showLabelEditor ? "vendor-label-sidecar-open" : ""}`}>
                <div className="vendor-label-sidecar-header">
                  <div>
                    <strong>{labelOnlyMode ? "Edit food labels" : "Food labels"}</strong>
                    <p>
                      {labelOnlyMode
                        ? "This mode only changes labels. Name, price, description, and availability stay untouched."
                        : "Pick labels for this item and confirm them separately."}
                    </p>
                  </div>
                  <button type="button" className="vendor-icon-button" onClick={() => setShowLabelEditor(false)} aria-label="Close label editor">
                    <X size={16} />
                  </button>
                </div>
                <div className="vendor-label-sidecar-body">
                  <div className="vendor-label-current">
                    <small>Applied labels</small>
                    <div className="vendor-menu-card-labels vendor-menu-card-labels-compact">
                      {draftLabelSelection.length > 0 ? draftLabelSelection.map((labelName) => {
                        const match = allLabelOptions.find((label) => label.name === labelName);
                        return (
                          <span
                            key={labelName}
                            className="vendor-label-badge"
                            style={{ "--vendor-label-color": match?.color ?? "var(--accent)" } as CSSProperties}
                          >
                            <span className="vendor-label-badge-dot" />
                            {labelName}
                          </span>
                        );
                      }) : <span className="vendor-muted vendor-inline-note">No labels selected yet.</span>}
                    </div>
                  </div>
                  {labelOnlyMode && (
                    <div className="vendor-label-inline-summary">
                      <span className="vendor-label-inline-summary-kicker">Editing labels for</span>
                      <strong>{formData.name}</strong>
                      <small>
                        {draftLabelSelection.length > 0
                          ? `${draftLabelSelection.length} label${draftLabelSelection.length === 1 ? "" : "s"} selected`
                          : "Choose one or more labels for this item."}
                      </small>
                    </div>
                  )}
                  <div className="vendor-label-picker-grid">
                    {allLabelOptions.map((label) => {
                      const isSelected = draftLabelSelection.includes(label.name);
                      return (
                        <button
                          key={label.name}
                          type="button"
                          onClick={() => {
                            const updated = isSelected
                              ? draftLabelSelection.filter((current) => current !== label.name)
                              : [...draftLabelSelection, label.name];
                            setDraftLabelSelection(updated);
                          }}
                          className={`vendor-label-toggle ${isSelected ? "vendor-label-toggle-selected" : ""}`}
                          style={{ "--vendor-label-color": label.color } as CSSProperties}
                        >
                          <span className="vendor-label-toggle-head">
                            <span className="vendor-label-badge-dot" />
                            {label.name}
                          </span>
                          <small>{label.description}</small>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="vendor-label-sidecar-footer">
                  <button
                    type="button"
                    className="vendor-button"
                    onClick={() => {
                      if (labelOnlyMode) {
                        commitLabelOnlyUpdate();
                        return;
                      }
                      setFormData((current) => ({ ...current, labels: draftLabelSelection }));
                      setShowLabelEditor(false);
                    }}
                  >
                    Confirm Labels
                  </button>
                </div>
              </aside>

              {!labelOnlyMode && (
                <section
                  className="vendor-form-panel vendor-edit-panel"
                  role="dialog"
                  aria-modal="true"
                  aria-label={editingItem ? "Edit menu item" : "Add menu item"}
                >
                <div className="vendor-form-header">
                  <div>
                    <h2>{editingItem ? "Edit Menu Item" : "Add New Menu Item"}</h2>
                    <p className="vendor-muted">Update details, pricing, and availability in a shorter, faster workflow.</p>
                  </div>
                  <button type="button" className="vendor-icon-button" onClick={closeForm} aria-label="Close form">
                    <X size={18} />
                  </button>
                </div>
                <div className="vendor-form-body">
                    <>
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
                          <label htmlFor="vendor-item-category">Category</label>
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
                        <label>Food Type</label>
                        <div className="vendor-segmented-control">
                          <button
                            type="button"
                            className={`vendor-segmented-option ${formData.isVeg ? "vendor-segmented-option-active" : ""}`}
                            onClick={() => setFormData({ ...formData, isVeg: true })}
                          >
                            Veg
                          </button>
                          <button
                            type="button"
                            className={`vendor-segmented-option ${!formData.isVeg ? "vendor-segmented-option-active" : ""}`}
                            onClick={() => setFormData({ ...formData, isVeg: false })}
                          >
                            Non-veg
                          </button>
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
                    </>
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
                    {editingItem ? "Review Update" : "Review Item"}
                  </button>
                </div>
              </section>
              )}
            </div>
          </div>
        </>
      )}

      {showSaveReview && pendingSave && (
        <>
          <div className="vendor-form-backdrop" onClick={() => setShowSaveReview(false)} />
          <div className="vendor-form-wrap">
            <section className="vendor-form-panel vendor-review-panel" role="dialog" aria-modal="true" aria-label="Review menu changes">
              <div className="vendor-form-header">
                <div>
                  <h2>Review Changes</h2>
                  <p className="vendor-muted">Check what changed before committing it to the live menu.</p>
                </div>
                <button type="button" className="vendor-icon-button" onClick={() => setShowSaveReview(false)} aria-label="Close review">
                  <X size={18} />
                </button>
              </div>
              <div className="vendor-form-body">
                <div className="vendor-review-summary">
                  {pendingSave.changes.map((change) => (
                    <article key={`${change.label}-${change.from}-${change.to}`} className="vendor-review-row">
                      <strong>{change.label}</strong>
                      <div className="vendor-review-values">
                        <span>{change.from}</span>
                        <span className="vendor-review-arrow">{"->"}</span>
                        <span>{change.to}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              <div className="vendor-form-actions">
                <button type="button" className="vendor-button-ghost" onClick={() => setShowSaveReview(false)}>
                  Go Back
                </button>
                <button type="button" className="vendor-button" onClick={commitPendingSave}>
                  Commit Changes
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
                  <h2>Food Labels</h2>
                  <p className="vendor-muted">Mix built-in food traits with your own outlet-specific tags. These labels show up on student search and menu filters.</p>
                </div>
                <button type="button" className="vendor-icon-button" onClick={() => setShowLabelManager(false)} aria-label="Close">
                  <X size={18} />
                </button>
              </div>
              <div className="vendor-form-body">
                <div className="vendor-label-list-block">
                  <label>Built-in Labels</label>
                  <div className="vendor-label-library-grid">
                    {systemLabels.map((label) => (
                      <article key={label.id} className="vendor-label-library-card">
                        <div className="vendor-label-library-top">
                          <span className="vendor-label-badge" style={{ "--vendor-label-color": label.color } as CSSProperties}>
                            <span className="vendor-label-badge-dot" />
                            {label.name}
                          </span>
                          <span className="vendor-label-library-type">Default</span>
                        </div>
                        <p>{label.description}</p>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="vendor-field">
                  <label>Create Custom Label</label>
                  <div className="vendor-label-creator-grid">
                    <input
                      className="vendor-input vendor-label-name-input"
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      placeholder="Label name"
                    />
                    <input
                      className="vendor-input"
                      value={newLabelDescription}
                      onChange={(e) => setNewLabelDescription(e.target.value)}
                      placeholder="Short description"
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
                  <label>Your Custom Labels</label>
                  <div className="vendor-label-list">
                    {customLabels.length === 0 && (
                      <p className="vendor-muted vendor-inline-note">No custom labels yet. Add one for outlet-specific callouts like chef specials or combo picks.</p>
                    )}
                    {customLabels.map((label) => (
                      <div
                        key={label.name}
                        className="vendor-label-chip"
                        style={{ background: `${label.color}20`, borderColor: label.color }}
                      >
                        <span className="vendor-label-chip-swatch" style={{ background: label.color }} />
                        <span className="vendor-label-chip-copy">
                          <span className="vendor-label-chip-name">{label.name}</span>
                          <small>{label.description || "Custom food label."}</small>
                        </span>
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
