import "./MenuSearch.css";

function MenuSearch({ value, onChange }: { value: string, onChange: (v: string) => void }) {
    return (
        <div className="menu-search">
            <input value={value} onChange={e => onChange(e.target.value)} placeholder="Search menu..." />
        </div>
    )
}

export default MenuSearch;