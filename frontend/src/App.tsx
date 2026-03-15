import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import ChatWidget from "./components/chatWidget/ChatWidget";
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
    <BrowserRouter>
      <AppRoutes />
      <ChatWidget orderContext={{ menu: trimmedMenu }} />
    </BrowserRouter>
  );
}

export default App;