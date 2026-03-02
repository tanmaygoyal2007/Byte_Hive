import "./CanteenMenuPage.css";
import Navbar from "../components/layout/Navbar";
import CanteenHeader from "../components/menu/CanteenHeader";
import ImageGallery from "../components/menu/ImageGallery";
import CategorySidebar from "../components/menu/CategorySidebar";
import MenuItemCard from "../components/menu/MenuItemCard";
import MenuSearch from "../components/menu/MenuSearch";
import MiniCart from "../components/menu/MiniCart";
import Footer from "../components/layout/Footer";

function CanteenMenuPage() {
    return(
        <div>
            <Navbar />
            <CanteenHeader />
            <ImageGallery />
            <div>
                <CategorySidebar />
                <MenuItemCard />
                <MenuSearch />
                <MiniCart />
            </div>
            <Footer />
        </div>
    )
}

export default CanteenMenuPage;