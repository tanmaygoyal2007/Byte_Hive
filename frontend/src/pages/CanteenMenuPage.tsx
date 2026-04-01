import "./CanteenMenuPage.css";
import Navbar from "../components/layout/Navbar";
import CanteenHeader from "../components/menu/CanteenHeader";
import ImageGallery from "../components/menu/ImageGallery";
import CategorySidebar from "../components/menu/CategorySidebar";
import MenuItemCard from "../components/menu/MenuItemCard";
import MenuSearch from "../components/menu/MenuSearch";
import MiniCart from "../components/menu/MiniCart";
import Footer from "../components/layout/Footer";
import menuData from "../data/menu.json";
import { CANTEENS } from "../components/canteens/canteens";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

function CanteenMenuPage() {
    const { canteenId } = useParams();

    // fallback to first canteen if param missing
    const activeCanteenId = canteenId || CANTEENS[0]?.id;

    const items = useMemo(() => (
        (menuData as any[]).filter(i => i.canteenId === activeCanteenId)
    ), [activeCanteenId]);

    // extract categories in order
    const categories = useMemo(() => {
        const set = new Set<string>();
        items.forEach(i => set.add(i.category));
        return Array.from(set);
    }, [items]);

    const canteen = useMemo(() => (
        CANTEENS.find(c => c.id === activeCanteenId) || CANTEENS[0]
    ), [activeCanteenId]);

    // UI state for filtering and search
    const [searchQ, setSearchQ] = useState('');
    const [category, setCategory] = useState<string | null>(null);

    // filtered items by category and search
    const filteredItems = useMemo(() => {
        let list = items;
        if (category) {
            list = list.filter(i => i.category === category);
        }
        if (searchQ) {
            const q = searchQ.toLowerCase();
            list = list.filter(i => (i.name || '').toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q));
        }
        return list;
    }, [items, category, searchQ]);

    return (
        <div className="menu-page-root">
            <Navbar />
            <CanteenHeader canteen={canteen} />
            <ImageGallery canteen={canteen} />

            <div className="menu-page-container">
                <aside className="menu-sidebar">
                    <CategorySidebar categories={categories} activeCategory={category} onSelect={c => setCategory(c)} />
                </aside>

                <main className="menu-main">
                    <div className="menu-main-header">
                        <h2>{category ?? 'All'}</h2>
                    </div>

                    <div className="menu-items-list">
                        {filteredItems.map(item => (
                            <MenuItemCard key={item.id} item={item} />
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
    )
}

export default CanteenMenuPage;