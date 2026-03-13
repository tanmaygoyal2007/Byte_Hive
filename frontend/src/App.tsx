import './App.css'
import CanteenCardsPage from './pages/CanteenCardsPage'

function App() {
    return (
        <CanteenCardsPage />
    );
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import ChatWidget from "./components/chatWidget/ChatWidget";

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <ChatWidget />
    </BrowserRouter>
  );
}

export default App;