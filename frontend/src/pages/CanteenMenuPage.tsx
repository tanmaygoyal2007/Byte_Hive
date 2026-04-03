import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import CategorySidebar from "../components/menu/CategorySidebar";
import CanteenHeader from "../components/menu/CanteenHeader";
import ImageGallery from "../components/menu/ImageGallery";
import MenuItemCard from "../components/menu/MenuItemCard";
import MenuSearch from "../components/menu/MenuSearch";
import MiniCart from "../components/menu/MiniCart";
import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import canteensData from "../data/canteens.json";
import { getMenuItemsForOutlet, subscribeToMenu, type MenuCatalogItem } from "../utils/orderPortal";
import { getVendorOutletStatus, subscribeToVendorStatus } from "../utils/vendorPortal";
import "./CanteenMenuPage.css";

type CanteenRecord = {
  id: string;
  name: string;
  [key: string]: unknown;
};

function CanteenMenuPage() {
  const { canteenId } = useParams();
  const canteens = canteensData as CanteenRecord[];
  const activeCanteenId = canteenId || canteens[0]?.id || "";
  const canteen = useMemo(
    () => canteens.find((entry) => entry.id === activeCanteenId) || canteens[0],
    [activeCanteenId, canteens]
  );

  const [items, setItems] = useState<MenuCatalogItem[]>([]);
  const [isOutletOpen, setIsOutletOpen] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    setCategory(null);
  }, [activeCanteenId]);

  useEffect(() => {
    const syncMenu = () => setItems(getMenuItemsForOutlet(activeCanteenId));
    const syncOutletStatus = () => setIsOutletOpen(getVendorOutletStatus(String(canteen?.name ?? "")));

    syncMenu();
    syncOutletStatus();

    const unsubscribeMenu = subscribeToMenu(syncMenu);
    const unsubscribeVendorStatus = subscribeToVendorStatus(syncOutletStatus);

    return () => {
      unsubscribeMenu();
      unsubscribeVendorStatus();
    };
  }, [activeCanteenId, canteen]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => set.add(item.category));
    return Array.from(set);
  }, [items]);

  const filteredItems = useMemo(() => {
    let list = items;

    if (category) {
      list = list.filter((item) => item.category === category);
    }

    if (searchQ) {
      const query = searchQ.toLowerCase();
      list = list.filter((item) => item.name.toLowerCase().includes(query) || (item.description ?? "").toLowerCase().includes(query));
    }

    return list;
  }, [category, items, searchQ]);

  return (
    <div className="menu-page-root">
      <Navbar />
      <CanteenHeader canteen={canteen} />
      <ImageGallery canteen={canteen} />

      <div className="menu-page-container">
        <aside className="menu-sidebar">
          <CategorySidebar categories={categories} activeCategory={category} onSelect={(nextCategory) => setCategory(nextCategory)} />
        </aside>

        <main className="menu-main">
          <div className="menu-main-header">
            <h2>{category ?? "All"}</h2>
          </div>

          {!isOutletOpen && (
            <div className="menu-page-outlet-alert">
              <strong>{String(canteen?.name ?? "This outlet")} is currently closed.</strong>
              <p>The live menu is still visible, but checkout will stay locked until the vendor reopens the outlet.</p>
            </div>
          )}

          <div className="menu-items-list">
            {filteredItems.map((item) => (
              <MenuItemCard key={item.id} item={item} isOutletOpen={isOutletOpen} />
            ))}
          </div>
        </main>

        <aside className="menu-right">
          <div className="menu-right-top">
            <MenuSearch value={searchQ} onChange={setSearchQ} />
          </div>
          <MiniCart />
        </aside>
      </div>

      <Footer />
    </div>
  );
}

export default CanteenMenuPage;
