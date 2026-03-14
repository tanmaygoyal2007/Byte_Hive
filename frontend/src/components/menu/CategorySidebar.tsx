import "./CategorySidebar.css";

function CategorySidebar({ categories, activeCategory, onSelect }: { categories: string[], activeCategory?: string | null, onSelect?: (c: string | null) => void }) {
    // `activeCategory` is intentionally nullable: null === All selected
    const active = activeCategory === undefined ? null : activeCategory;

    return (
        <div className="category-sidebar">
            <h3>Categories</h3>
            <ul>
                <li className={active === null ? 'active' : ''} onClick={() => onSelect && onSelect(null)}>All</li>
                {categories.map(cat => (
                    <li key={cat} className={active === cat ? 'active' : ''} onClick={() => onSelect && onSelect(cat)}>{cat}</li>
                ))}
            </ul>
        </div>
    )
}

export default CategorySidebar;