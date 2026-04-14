import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "@/component/lib/router";
import { Search, Trash2 } from "lucide-react";
import Navbar from "@/component/components/layout/Navbar";
import { CanteenCard } from "@/features/canteens/components/CanteenCard";
import Footer from "@/component/components/layout/Footer";
import { CANTEENS } from "@/features/canteens/components/canteens";
import menuData from "@/features/menu/data/menu.json";

interface SearchBarProps {
    value: string
    onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
    return (
        <div className="search-section">
            <div className="search-icon-wrapper">
                <Search className="icon-search" />
            </div>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Search for food items or canteens..."
                className="search-input"
            />
            {value && (
                <button 
                    className="search-clear-btn" 
                    onClick={() => onChange("")}
                    aria-label="Clear search"
                    type="button"
                >
                    <Trash2 size={24} className="icon-trash" />
                </button>
            )}
        </div>
    )
}

function CanteenCardsPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const filter = searchParams.get("filter");
    
    const [searchValue, setSearchValue] = useState("");
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 10);
        return () => clearTimeout(timer);
    }, []);

    const filteredCanteens = CANTEENS.filter((canteen) => {
        if (filter) {
            const isMatch = canteen.block.trim().toLowerCase() === filter.trim().toLowerCase();
            if (!isMatch) return false;
        }

        if (!searchValue) return true;

        const query = searchValue.toLowerCase();
        
        const matchesCanteen = 
            canteen.name.toLowerCase().includes(query) ||
            (canteen.description || "").toLowerCase().includes(query) ||
            (canteen.block || "").toLowerCase().includes(query);
            
        if (matchesCanteen) return true;
        
        return (menuData as any[]).some(item => 
            item.canteenId === canteen.id && 
            (item.name || "").toLowerCase().includes(query)
        );
    });

    return (
        <div className="page-container">
            <Navbar />
            <main className="main-content">
                <div className={`hero-section hero-enter ${isVisible ? 'hero-visible' : ''}`}>
                    <h1 className="hero-title" key={filter || "all"}>
                        {!filter ? "Explore Canteens" : 
                         filter === "Dominos" ? "Explore Dominos" : 
                         `Explore ${filter} Canteens`}
                    </h1>
                    <p className="hero-subtitle">
                        Discover all the amazing food outlets across campus<br />
                        and find your next favorite meal
                    </p>
                </div>

                <div className={`hero-enter search-delay ${isVisible ? 'hero-visible' : ''} search-controls`}>
                    <SearchBar value={searchValue} onChange={setSearchValue} />
                    {filter && (
                        <div className="filter-indicator">
                            <button onClick={() => navigate('/canteens')} className="clear-filter-btn">
                                Clear Filter
                            </button>
                        </div>
                    )}
                </div>

                <div className="cards-grid">
                    {filteredCanteens.map((canteen, index) => (
                        <div
                            key={canteen.id}
                            className={`card-enter ${isVisible ? 'card-visible' : ''} card-delay-${Math.min(index % 3, 2)}`}
                        >
                            <CanteenCard {...canteen} />
                        </div>
                    ))}
                </div>
            </main>
            <Footer />
        </div>
    )
}

export default CanteenCardsPage;
