
function MenuSearch({ value, onChange }: { value: string, onChange: (v: string) => void }) {
    return (
        <div className="menu-search">
            <span className="menu-search-icon" aria-hidden="true">⌕</span>
            <input value={value} onChange={e => onChange(e.target.value)} placeholder="Search menu..." />
        </div>
    )
}

export default MenuSearch;
