import { useMemo, useState } from "react";
import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import CategorySidebar from "../components/menu/CategorySidebar";
import CanteenHeader from "../components/menu/CanteenHeader";
import ImageGallery from "../components/menu/ImageGallery";
import MenuItemCard from "../components/menu/MenuItemCard";
import MenuSearch from "../components/menu/MenuSearch";
import MiniCart from "../components/menu/MiniCart";
import menuData from "../data/menu.json";
import { CANTEENS } from "../components/canteens/canteens";
import { useParams } from "react-router-dom";
import "./CanteenMenuPage.css";

function CanteenMenuPage() {
  const { canteenId } = useParams();
  const activeCanteenId = canteenId || CANTEENS[0]?.id;

  const items = useMemo(
    () => (menuData as any[]).filter((item) => item.canteenId === activeCanteenId),
    [activeCanteenId]
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => set.add(item.category));
    return Array.from(set);
  }, [items]);

  const canteen = useMemo(
    () => CANTEENS.find((entry) => entry.id === activeCanteenId) || CANTEENS[0],
    [activeCanteenId]
  );

  const [searchQ, setSearchQ] = useState("");
  const [category, setCategory] = useState<string>("All");

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
        <CanteenHeader canteen={canteen} />
        <ImageGallery canteen={canteen} />

        <div className="menu-page-container">
          <aside className="menu-sidebar">
            <CategorySidebar categories={categories} activeCategory={category} onSelect={(nextCategory) => setCategory(nextCategory ?? "All")} />
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
                <MenuSearch value={searchQ} onChange={setSearchQ} />
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
