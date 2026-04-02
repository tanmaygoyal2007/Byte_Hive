import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import Navbar from "../components/layout/Navbar";
import { CanteenCard } from "../components/canteens/CanteenCard";
import Footer from "../components/layout/Footer";
import { CANTEENS } from "../components/canteens/canteens";
import menuData from "../data/menu.json";
import "./CanteenCardsPage.css";

interface SearchBarProps {
    value: string
    onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
    return (
        <div className="search-section">
            <div className="search-icon-wrapper">
                <Search size={20} />
            </div>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Search for food items or canteens..."
                className="search-input"
            />
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
        // 1. Block Filter Logic
        if (filter) {
            const isMatch = canteen.block.trim().toLowerCase() === filter.trim().toLowerCase();
            if (!isMatch) return false;
        }

        // 2. Search Filter Logic (scoped within block if block is selected)
        if (!searchValue) return true;

        const query = searchValue.toLowerCase();
        
        // Check canteen basic details
        const matchesCanteen = 
            canteen.name.toLowerCase().includes(query) ||
            (canteen.description || "").toLowerCase().includes(query) ||
            (canteen.block || "").toLowerCase().includes(query);
            
        if (matchesCanteen) return true;
        
        // Check if any item in this canteen matches the query
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
                    <h1 className="hero-title">Explore Campus Canteens</h1>
                    <p className="hero-subtitle">
                        Discover all the amazing food outlets across campus<br />
                        and find your next favorite meal
                    </p>
                </div>

                <div className={`hero-enter search-delay ${isVisible ? 'hero-visible' : ''}`}>
                    <SearchBar value={searchValue} onChange={setSearchValue} />
                </div>

                {filter && (
                    <div className="filter-indicator">
                        <span>Showing: <strong>{filter}</strong></span>
                        <button onClick={() => navigate('/explore')} className="clear-filter-btn">
                            Clear Filter
                        </button>
                    </div>
                )}

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