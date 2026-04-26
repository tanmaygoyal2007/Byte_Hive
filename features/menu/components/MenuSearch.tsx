import { Search, SlidersHorizontal, X } from "lucide-react";
import "@/features/menu/components/MenuSearch.css";

function MenuSearch({
  value,
  onChange,
  onToggleFilters,
  hasActiveFilters = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onToggleFilters?: () => void;
  hasActiveFilters?: boolean;
}) {
  return (
    <div className="menu-search">
      <Search size={18} className="menu-search-icon" aria-hidden="true" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search menu..."
      />
      {value && (
        <button
          className="menu-search-clear"
          onClick={() => onChange("")}
          aria-label="Clear search"
          type="button"
        >
          <X size={16} />
        </button>
      )}
      {onToggleFilters && (
        <button
          className={`menu-search-filter-btn ${hasActiveFilters ? "menu-search-filter-btn-active" : ""}`}
          onClick={onToggleFilters}
          aria-label="Open label filters"
          type="button"
        >
          <SlidersHorizontal size={16} />
          <span>Labels</span>
        </button>
      )}
    </div>
  );
}

export default MenuSearch;
