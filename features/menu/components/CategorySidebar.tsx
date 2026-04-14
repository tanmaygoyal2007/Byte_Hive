
function CategorySidebar({ categories, activeCategory, onSelect }: { categories: string[], activeCategory?: string | null, onSelect?: (c: string | null) => void }) {
    const active = activeCategory ?? "All";

    return (
        <div className="category-sidebar">
            <h3>Categories</h3>
            <ul>
                <li className={active === "All" ? 'active' : ''} onClick={() => onSelect && onSelect(null)}>All</li>
                {categories.map(cat => (
                    <li key={cat} className={active === cat ? 'active' : ''} onClick={() => onSelect && onSelect(cat)}>{cat}</li>
                ))}
            </ul>
        </div>
    )
}

export default CategorySidebar;
