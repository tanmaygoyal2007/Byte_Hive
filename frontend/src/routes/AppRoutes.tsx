import { Routes, Route } from "react-router-dom";

import HomePage from "../pages/HomePage";
import CanteenCardsPage from "../pages/CanteenCardsPage";
import CanteenMenuPage from "../pages/CanteenMenuPage";
import CartPage from "../pages/CartPage";
import ReceiptPage from "../pages/ReceiptPage";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/explore" element={<CanteenCardsPage />} />
      <Route path="/menu/:canteenId" element={<CanteenMenuPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/receipt" element={<ReceiptPage />} />
    </Routes>
  );
}

export default AppRoutes;