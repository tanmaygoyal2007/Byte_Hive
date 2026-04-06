import { Navigate, Route, Routes } from "react-router-dom";
import AboutPage from "../pages/AboutPage";
import CanteenCardsPage from "../pages/CanteenCardsPage";
import CanteenMenuPage from "../pages/CanteenMenuPage";
import CartPage from "../pages/CartPage";
import HomePage from "../pages/HomePage";
import ReceiptPage from "../pages/ReceiptPage";
import VendorDashboardPage from "../pages/vendor/VendorDashboardPage";
import VendorGuidancePage from "../pages/vendor/VendorGuidancePage";
import VendorLoginPage from "../pages/vendor/VendorLoginPage";
import VendorMenuPage from "../pages/vendor/VendorMenuPage";
import VendorQrScannerPage from "../pages/vendor/VendorQrScannerPage";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/explore" element={<CanteenCardsPage />} />
      <Route path="/menu/:canteenId" element={<CanteenMenuPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/receipt/:orderId" element={<ReceiptPage />} />
      <Route path="/vendor" element={<Navigate to="/vendor/login" replace />} />
      <Route path="/vendor/login" element={<VendorLoginPage />} />
      <Route path="/vendor/dashboard" element={<VendorDashboardPage />} />
      <Route path="/vendor/about" element={<AboutPage />} />
      <Route path="/vendor/guidance" element={<VendorGuidancePage />} />
      <Route path="/vendor/menu" element={<VendorMenuPage />} />
      <Route path="/vendor/qr-scanner" element={<VendorQrScannerPage />} />
    </Routes>
  );
}

export default AppRoutes;
