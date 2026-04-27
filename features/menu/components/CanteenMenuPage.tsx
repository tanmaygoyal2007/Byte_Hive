import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useParams, useSearchParams } from "@/components/lib/router";
import { X } from "lucide-react";
import Footer from "@/components/components/layout/Footer";
import Navbar from "@/components/components/layout/Navbar";
import CategorySidebar from "@/features/menu/components/CategorySidebar";
import CanteenHeader from "@/features/menu/components/CanteenHeader";
import ImageGallery from "@/features/menu/components/ImageGallery";
import MenuItemCard from "@/features/menu/components/MenuItemCard";
import MenuSearch from "@/features/menu/components/MenuSearch";
import MiniCart from "@/features/menu/components/MiniCart";
import { CANTEENS } from "@/features/canteens/components/canteens";
import { getMenuItemsForOutlet, subscribeToMenu, type MenuCatalogItem } from "@/features/orders/services/order-portal.service";
import { getDisplayLabelsForItem, getLabelColorsForCanteen, itemMatchesAllSelectedLabels } from "@/lib/utils/label-utils";
import { getVendorClosureLabel, getVendorClosureNotice, getVendorOutletStatus, subscribeToVendorStatus } from "@/features/vendor/services/vendor-portal.service";
import { OutletSwitchProvider } from "@/features/cart/components/OutletSwitchContext";
import GlobalOutletSwitchModal from "@/features/cart/components/GlobalOutletSwitchModal";

function CanteenMenuPage() {
  const params = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const isPreviewMode = searchParams.get("preview") === "vendor";
  
  const activeCanteenId = params.id || CANTEENS[0]?.id;
  
  const [items, setItems] = useState<MenuCatalogItem[]>(() => getMenuItemsForOutlet(activeCanteenId));
  const [localSearch, setLocalSearch] = useState(searchParams.get("q") ?? "");
  const [showLabelFilters, setShowLabelFilters] = useState(false);
  const [isOutletOpen, setIsOutletOpen] = useState(() => {
    const activeCanteen = CANTEENS.find((entry) => entry.id === activeCanteenId) || CANTEENS[0];
    return activeCanteen ? getVendorOutletStatus(activeCanteen.name) : true;
  });
  const [closureLabel, setClosureLabel] = useState<string | null>(() => {
    const activeCanteen = CANTEENS.find((entry) => entry.id === activeCanteenId) || CANTEENS[0];
    return activeCanteen ? getVendorClosureLabel(activeCanteen.name) : null;
  });
  const [closureNotice, setClosureNotice] = useState<string | null>(() => {
    const activeCanteen = CANTEENS.find((entry) => entry.id === activeCanteenId) || CANTEENS[0];
    return activeCanteen ? getVendorClosureNotice(activeCanteen.name) : null;
  });

  useEffect(() => {
    const syncItems = () => setItems(getMenuItemsForOutlet(activeCanteenId));
    syncItems();
    return subscribeToMenu(syncItems);
  }, [activeCanteenId]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => set.add(item.category));
    let list = Array.from(set).sort((a, b) => a.localeCompare(b));
    const hasUnavailable = items.some((item) => item.isAvailable === false);
    if (hasUnavailable && !list.includes("Unavailable")) {
      list.push("Unavailable");
    }
    return list;
  }, [items]);

  const labelColors = useMemo(() => {
    return getLabelColorsForCanteen(activeCanteenId);
  }, [activeCanteenId]);

  const canteen = useMemo(
    () => CANTEENS.find((entry) => entry.id === activeCanteenId) || CANTEENS[0],
    [activeCanteenId]
  );

  useEffect(() => {
    const syncStatus = () => {
      const activeCanteen = CANTEENS.find((entry) => entry.id === activeCanteenId) || CANTEENS[0];
      setIsOutletOpen(activeCanteen ? getVendorOutletStatus(activeCanteen.name) : true);
      setClosureLabel(activeCanteen ? getVendorClosureLabel(activeCanteen.name) : null);
      setClosureNotice(activeCanteen ? getVendorClosureNotice(activeCanteen.name) : null);
    };

    syncStatus();
    const unsubscribe = subscribeToVendorStatus(syncStatus);
    const interval = window.setInterval(syncStatus, 30000);

    return () => {
      window.clearInterval(interval);
      unsubscribe();
    };
  }, [activeCanteenId]);

  const rawCategory = searchParams.get("category") ?? "All";
  const selectedLabelFilters = (searchParams.get("labels") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  const previewSrc = searchParams.get("src");
  const category = rawCategory === "All" || categories.includes(rawCategory) ? rawCategory : "All";
  const availableLabelOptions = useMemo(
    () =>
      items
        .flatMap((item) => getDisplayLabelsForItem(item, activeCanteenId))
        .filter((label, index, labels) => labels.findIndex((entry) => entry.name === label.name) === index),
    [activeCanteenId, items]
  );

  const updateMenuParams = ({ nextSearch, nextCategory }: { nextSearch?: string; nextCategory?: string }) => {
    const params = new URLSearchParams(searchParams);
    const searchValue = nextSearch ?? localSearch;
    const categoryValue = nextCategory ?? category;

    if (searchValue.trim()) {
      params.set("q", searchValue);
    } else {
      params.delete("q");
    }

    if (categoryValue && categoryValue !== "All") {
      params.set("category", categoryValue);
    } else {
      params.delete("category");
    }

    setSearchParams(params, { replace: true });
  };

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    const params = new URLSearchParams(searchParams);
    if (value.trim()) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    setSearchParams(params, { replace: true });
  };

  const handleToggleLabelFilter = (labelName: string) => {
    const params = new URLSearchParams(searchParams);
    const current = new Set(selectedLabelFilters);
    if (current.has(labelName)) {
      current.delete(labelName);
    } else {
      current.add(labelName);
    }

    if (current.size > 0) {
      params.set("labels", Array.from(current).join(","));
    } else {
      params.delete("labels");
    }

    setSearchParams(params, { replace: true });
  };

  const clearLabelFilters = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("labels");
    setSearchParams(params, { replace: true });
  };

  const filteredItems = useMemo(() => {
    let list = [...items];
    const searchTerm = localSearch;

    if (category === "All") {
      list.sort((a, b) => {
        if (a.isAvailable === b.isAvailable) return a.name.localeCompare(b.name);
        return a.isAvailable ? -1 : 1;
      });
    } else if (category === "Unavailable") {
      list = list.filter((item) => item.isAvailable === false);
    } else {
      list = list.filter((item) => item.category === category);
    }

    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          (item.description ?? "").toLowerCase().includes(query)
      );
    }

    if (selectedLabelFilters.length > 0) {
      list = list.filter((item) => itemMatchesAllSelectedLabels(item, selectedLabelFilters, activeCanteenId));
    }

    return list;
  }, [activeCanteenId, category, items, localSearch, selectedLabelFilters]);

  return (
    <OutletSwitchProvider>
      <div className="menu-page-root">
        <GlobalOutletSwitchModal />
      <Navbar isVendorPreview={isPreviewMode} previewOutletId={activeCanteenId} />
      <div className="menu-page-shell">
        <CanteenHeader
          canteen={canteen}
          isOutletOpen={isOutletOpen}
          closureLabel={closureLabel}
          hideBackLink={false}
          backLinkUrl={
            isPreviewMode
              ? previewSrc === "menu"
                ? "/vendor/menu"
                : "/vendor/dashboard"
              : "/canteens"
          }
        />
        {!isOutletOpen && (
          <div className="menu-page-outlet-alert">
            <strong>This outlet is temporarily closed for checkout.</strong>
            <p>{closureNotice ?? "You can still browse the menu and add items to cart, but checkout is paused right now."}</p>
          </div>
)}
        <ImageGallery canteen={canteen} />

        <div className="menu-page-container">
          <aside className="menu-sidebar">
            <CategorySidebar
              categories={categories}
              activeCategory={category}
              onSelect={(nextCategory) => updateMenuParams({ nextCategory: nextCategory ?? "All" })}
              labelColors={labelColors}
            />
          </aside>

          <main className="menu-main">
            <div className="menu-main-header">
              <h2>{category}</h2>
            </div>

            <div className="menu-items-list">
              {filteredItems.map((item) => (
                <MenuItemCard key={item.id} item={item} previewOnly={isPreviewMode} />
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div className="menu-empty-state">
                <h3>No items found</h3>
                <p>Try another category or update your search.</p>
              </div>
            )}
          </main>

          <aside className="menu-right">
            <div className="menu-right-sticky">
              <div className="menu-right-top">
                <MenuSearch
                  value={localSearch}
                  onChange={handleSearchChange}
                  onToggleFilters={() => setShowLabelFilters((value) => !value)}
                  hasActiveFilters={selectedLabelFilters.length > 0}
                />
              </div>

              {showLabelFilters && (
                <section className="menu-filter-panel">
                  <div className="menu-filter-panel-header">
                    <div>
                      <strong>Filter by labels</strong>
                      <p>Refine this outlet by food traits without changing the text search.</p>
                    </div>
                    <button type="button" className="menu-filter-close" onClick={() => setShowLabelFilters(false)} aria-label="Close filters">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="menu-filter-chip-grid">
                    {availableLabelOptions.map((label) => {
                      const isActive = selectedLabelFilters.includes(label.name);
                      return (
                        <button
                          key={label.id}
                          type="button"
                          className={`menu-filter-chip ${isActive ? "menu-filter-chip-active" : ""}`}
                          style={{ "--label-color": label.color } as CSSProperties}
                          onClick={() => handleToggleLabelFilter(label.name)}
                        >
                          <span className="menu-item-label-dot" />
                          <span>{label.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedLabelFilters.length > 0 && (
                    <button type="button" className="menu-filter-reset" onClick={clearLabelFilters}>
                      Clear label filters
                    </button>
                  )}
                </section>
              )}

              <MiniCart previewOnly={isPreviewMode} />
            </div>
          </aside>
        </div>
      </div>
      <div className="menu-footer-wrap">
        <Footer variant={isPreviewMode ? "vendor" : "default"} />
      </div>
    </div>
    </OutletSwitchProvider>
  );
}

export default CanteenMenuPage;
