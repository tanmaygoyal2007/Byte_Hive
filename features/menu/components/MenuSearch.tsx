
function MenuSearch({ value, onChange }: { value: string, onChange: (v: string) => void }) {
    return (
        <div className="menu-search">
            <span className="menu-search-icon" aria-hidden="true">⌕</span>
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
                    🗑
                </button>
            )}
        </div>
    )
}

export default MenuSearch;
