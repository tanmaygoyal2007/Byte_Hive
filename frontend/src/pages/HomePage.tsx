import "./HomePage.css";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

import HeroSection from "../components/home/HeroSection";
import QuickDeliverySection from "../components/home/QuickDeliverySection";
import PopularCanteensSection from "../components/home/PopularCanteensSection";
import ContactSection from "../components/home/ContactSection";

function HomePage() {
    return(
        <div>
            <Navbar/>
            <HeroSection/>
            <QuickDeliverySection/>
            <PopularCanteensSection/>
            <ContactSection/>
            <Footer/>
        </div>
    )
}

export default HomePage;