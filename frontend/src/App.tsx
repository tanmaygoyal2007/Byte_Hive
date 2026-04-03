import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import ChatWidget from "./components/chatWidget/ChatWidget";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import menuData from "./data/menu.json";

function App() {
  const trimmedMenu = (menuData as any[])
    .filter((item) => item.isAvailable)
    .map((item) => ({
      name: item.name,
      price: item.price,
      category: item.category,
      isVeg: item.isVeg,
      canteenId: item.canteenId,
    }));

  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <AppRoutes />
          <ChatWidget orderContext={{ menu: trimmedMenu }} />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
