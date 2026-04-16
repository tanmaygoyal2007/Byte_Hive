
function CategorySidebar({ categories, activeCategory, onSelect, labelColors = {} }: { categories: string[], activeCategory?: string | null, onSelect?: (c: string | null) => void, labelColors?: Record<string, string> }) {
    const active = activeCategory ?? "All";

    return (
        <div className="category-sidebar">
            <h3>Categories</h3>
            <ul>
                <li className={active === "All" ? 'active' : ''} onClick={() => onSelect && onSelect(null)}>All</li>
                {categories.map(cat => {
                    const color = labelColors[cat.toLowerCase()];
                    return (
                        <li 
                            key={cat} 
                            className={active === cat ? 'active' : ''} 
                            onClick={() => onSelect && onSelect(cat)}
                            style={color ? { borderLeft: `3px solid ${color}`, background: `${color}15` } : undefined}
                        >
                            {cat}
                        </li>
                    );
                })}
            </ul>
        </div>
    )
}

export default CategorySidebar;
