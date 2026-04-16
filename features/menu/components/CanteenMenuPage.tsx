import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "@/components/lib/router";
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

const LABEL_STORAGE_KEY = "bytehive-vendor-labels";

type CustomLabel = {
  name: string;
  color: string;
};

function getStoredCanteenLabels(canteenId: string): CustomLabel[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(LABEL_STORAGE_KEY);
    if (!stored) return [];
    const all = JSON.parse(stored) as Record<string, CustomLabel[]>;
    return all[canteenId] || [];
  } catch { return []; }
}

function getCategoryColor(canteenId: string, categoryName: string): string | null {
  const labels = getStoredCanteenLabels(canteenId);
  const found = labels.find(l => l.name.toLowerCase() === categoryName.toLowerCase());
  return found?.color || null;
}
import { getVendorClosureLabel, getVendorOutletStatus, subscribeToVendorStatus } from "@/features/vendor/services/vendor-portal.service";

function CanteenMenuPage() {
  const params = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const isPreviewMode = searchParams.get("preview") === "vendor";
  
  const activeCanteenId = params.id || CANTEENS[0]?.id;
  
  const [items, setItems] = useState<MenuCatalogItem[]>(() => getMenuItemsForOutlet(activeCanteenId));
  const [localSearch, setLocalSearch] = useState(searchParams.get("q") ?? "");
  const [isOutletOpen, setIsOutletOpen] = useState(() => {
    const activeCanteen = CANTEENS.find((entry) => entry.id === activeCanteenId) || CANTEENS[0];
    return activeCanteen ? getVendorOutletStatus(activeCanteen.name) : true;
  });
  const [closureLabel, setClosureLabel] = useState<string | null>(() => {
    const activeCanteen = CANTEENS.find((entry) => entry.id === activeCanteenId) || CANTEENS[0];
    return activeCanteen ? getVendorClosureLabel(activeCanteen.name) : null;
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
    if (list.includes("Unavailable")) {
      list = list.filter((c) => c !== "Unavailable");
      list.push("Unavailable");
    }
    return list;
  }, [items]);

  const labelColors = useMemo(() => {
    const map: Record<string, string> = {};
    const labels = getStoredCanteenLabels(activeCanteenId);
    labels.forEach(l => { map[l.name.toLowerCase()] = l.color; });
    return map;
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
  const previewSrc = searchParams.get("src");
  const category = rawCategory === "All" || categories.includes(rawCategory) ? rawCategory : "All";

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

    return list;
  }, [category, items, localSearch]);

  return (
    <div className="menu-page-root">
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
            <p>{closureLabel ?? "You can still browse the menu and add items to cart, but checkout is paused right now."}</p>
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
                <MenuSearch value={localSearch} onChange={handleSearchChange} />
              </div>
              <MiniCart previewOnly={isPreviewMode} />
            </div>
          </aside>
        </div>
      </div>
      <div className="menu-footer-wrap">
        <Footer variant={isPreviewMode ? "vendor" : "default"} />
      </div>
    </div>
  );
}

export default CanteenMenuPage;
