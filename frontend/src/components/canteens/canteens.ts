export interface Canteen {
    id: string | number;
    name: string;
    cuisine: string;
    rating: number;
    location: string;
    image?: string;
    tag?: string;
}
export const CANTEENS: Canteen[] = [
    { id: 1, name: "Taste of Delhi", cuisine: "Authentic North Indian flavors and street food delights", rating: 4.7, location: "Block A", image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=80", tag: "Popular" },
    { id: 2, name: "Punjabi Bites", cuisine: "Traditional Punjabi dishes with rich, bold flavors", rating: 4.6, location: "Block B", image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80" },
    { id: 3, name: "Rolls Lane", cuisine: "Fresh rolls, wraps, and quick bites for students on the go", rating: 4.4, location: "Basement", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80" },
    { id: 4, name: "Cafe Coffee Day", cuisine: "Premium coffee, beverages, and light snacks", rating: 4.5, location: "Block A", image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80" },
    { id: 5, name: "Amritsari Haveli", cuisine: "Amritsari kulchas, parathas, and traditional Punjabi fare", rating: 4.8, location: "Rooftop", image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&q=80", tag: "Top Rated" },
    { id: 6, name: "Gianis", cuisine: "Famous for shakes, ice creams, and sweet treats", rating: 4.7, location: "Block B", image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&q=80" },
    { id: 7, name: "Southern Delights", cuisine: "Authentic South Indian dosas, idlis, and filter coffee", rating: 4.5, location: "Block C", image: "https://images.unsplash.com/photo-1630383249896-424e482df921?w=600&q=80" },
    { id: 8, name: "Bites & Brews", cuisine: "Continental bites, burgers, and specialty beverages", rating: 4.3, location: "Block D", image: "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=600&q=80" },
    { id: 9, name: "Domino's", cuisine: "Popular pizza chain with variety of toppings and sides", rating: 4.2, location: "Block B", image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80" },
]
