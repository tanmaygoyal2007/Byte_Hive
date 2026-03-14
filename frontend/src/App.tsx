import "./App.css";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import ChatWidget from "./components/chatWidget/ChatWidget";
import { CartProvider } from "./context/CartContext";

function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <AppRoutes />
        <ChatWidget />
      </CartProvider>
    </BrowserRouter>
  );
}

export default App;