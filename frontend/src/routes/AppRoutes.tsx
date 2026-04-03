import { Routes, Route } from "react-router-dom";

import HomePage from "../pages/HomePage";
import CanteenCardsPage from "../pages/CanteenCardsPage";
import CanteenMenuPage from "../pages/CanteenMenuPage";
import CartPage from "../pages/CartPage";
import ReceiptPage from "../pages/ReceiptPage";
import VendorPortalPage from "../pages/VendorPortalPage";
import AboutPage from "../pages/AboutPage";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/explore" element={<CanteenCardsPage />} />
      <Route path="/menu/:canteenId" element={<CanteenMenuPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/receipt/:orderId" element={<ReceiptPage />} />
      <Route path="/vendor/login" element={<VendorPortalPage />} />
    </Routes>
  );
}

export default AppRoutes;
