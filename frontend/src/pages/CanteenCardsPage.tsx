import "./CanteenCardsPage.css";
import Navbar from "../components/layout/Navbar";
import SearchInput from "../components/common/SearchInput";
import CanteenCard from "../components/canteens/CanteenCard";
import Footer from "../components/layout/Footer";

function CanteenCardsPage() {
    return(
        <div>
            <Navbar/>
            <SearchInput/>
            <CanteenCard/>
            <Footer/>
        </div>
    )
}

export default CanteenCardsPage;