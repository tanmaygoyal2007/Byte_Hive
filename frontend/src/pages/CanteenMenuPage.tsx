import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import CategorySidebar from "../components/menu/CategorySidebar";
import CanteenHeader from "../components/menu/CanteenHeader";
import ImageGallery from "../components/menu/ImageGallery";
import MenuItemCard from "../components/menu/MenuItemCard";
import MenuSearch from "../components/menu/MenuSearch";
import MiniCart from "../components/menu/MiniCart";
import { CANTEENS } from "../components/canteens/canteens";
import { getMenuItemsForOutlet, subscribeToMenu, type MenuCatalogItem } from "../utils/orderPortal";
import { getVendorClosureLabel, getVendorOutletStatus, subscribeToVendorStatus } from "../utils/vendorPortal";
import "./CanteenMenuPage.css";

function CanteenMenuPage() {
  const { canteenId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCanteenId = canteenId || CANTEENS[0]?.id;
  const [items, setItems] = useState<MenuCatalogItem[]>(() => getMenuItemsForOutlet(activeCanteenId));
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
    return Array.from(set);
  }, [items]);

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

  const searchQ = searchParams.get("q") ?? "";
  const rawCategory = searchParams.get("category") ?? "All";
  const category = rawCategory === "All" || categories.includes(rawCategory) ? rawCategory : "All";

  const updateMenuParams = ({ nextSearch, nextCategory }: { nextSearch?: string; nextCategory?: string }) => {
    const params = new URLSearchParams(searchParams);
    const searchValue = nextSearch ?? searchQ;
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

  const filteredItems = useMemo(() => {
    let list = items;

    if (category !== "All") {
      list = list.filter((item) => item.category === category);
    }

    if (searchQ) {
      const query = searchQ.toLowerCase();
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          (item.description ?? "").toLowerCase().includes(query)
      );
    }

    return list;
  }, [category, items, searchQ]);

  return (
    <div className="menu-page-root">
      <Navbar />
      <div className="menu-page-shell">
        <CanteenHeader canteen={canteen} isOutletOpen={isOutletOpen} closureLabel={closureLabel} />
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
            />
          </aside>

          <main className="menu-main">
            <div className="menu-main-header">
              <h2>{category}</h2>
            </div>

            <div className="menu-items-list">
              {filteredItems.map((item) => (
                <MenuItemCard key={item.id} item={item} />
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
                <MenuSearch value={searchQ} onChange={(nextSearch) => updateMenuParams({ nextSearch })} />
              </div>
              <MiniCart />
            </div>
          </aside>
        </div>

        <div className="menu-footer-wrap">
          <Footer />
        </div>
      </div>
    </div>
  );
}

export default CanteenMenuPage;
