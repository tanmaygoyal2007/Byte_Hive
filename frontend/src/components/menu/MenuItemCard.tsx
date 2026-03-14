import "./MenuItemCard.css";
import useCart from "../../hooks/useCart";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  image?: string;
  category?: string;
  isVeg?: boolean;
  isAvailable?: boolean;
}

function MenuItemCard({ item }: { item: MenuItem }) {
    const { addItem } = useCart();

    const handleAdd = () => {
        addItem({ id: item.id, name: item.name, price: item.price, image: item.image });
    }

    return(
        <div className="menu-item-card">
            <img className="menu-item-image" src={item.image || '/images/tasteOfDelhi/tandoori-paneer-tikka.jpg'} alt={item.name} />
            <div className="menu-item-body">
                <h4 className="menu-item-title">{item.name}</h4>
                <p className="menu-item-desc">{(item as any).description || 'Delicious item'}</p>
                <div className="menu-item-controls">
                    <div className="menu-item-price">₹{item.price}</div>
                    <button className="menu-item-add" onClick={handleAdd}>+ Add</button>
                </div>
            </div>
        </div>
    )
}

export default MenuItemCard;