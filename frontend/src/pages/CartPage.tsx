import "./CartPage.css";
import Navbar from "../components/layout/Navbar";
import SearchInput from "../components/common/SearchInput";
import Footer from "../components/layout/Footer";

import MenuItemCard from "../components/menu/MenuItemCard";

function CartPage() {
    return(
        <div>
            <Navbar />
            <SearchInput />
            <Footer />
        </div>
    )
}

export default CartPage;