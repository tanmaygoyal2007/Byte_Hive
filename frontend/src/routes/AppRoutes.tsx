import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "../pages/HomePage";
import CanteenCardsPage from "../pages/CanteenCardsPage";
import CanteenMenuPage from "../pages/CanteenMenuPage";
import CartPage from "../pages/CartPage";
import ReceiptPage from "../pages/ReceiptPage";
// import LoginPage from "../pages/LoginPage";
// import SignupPage from "../pages/SignupPage";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/explore" element={<CanteenCardsPage />} />
        <Route path="/menu/:canteenId" element={<CanteenMenuPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/receipt" element={<ReceiptPage />} />
        {/* <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;