
import { Search, Trash2 } from "lucide-react";

function MenuSearch({ value, onChange }: { value: string, onChange: (v: string) => void }) {
    return (
        <div className="menu-search">
            <Search className="menu-search-icon" aria-hidden="true" size={18} />
            <input 
                value={value} 
                onChange={e => onChange(e.target.value)} 
                placeholder="Search menu..." 
            />
            {value && (
                <button 
                    className="menu-search-clear" 
                    onClick={() => onChange("")}
                    aria-label="Clear search"
                    type="button"
                >
                    <Trash2 size={16} aria-hidden="true" />
                </button>
            )}
        </div>
    )
}

export default MenuSearch;
