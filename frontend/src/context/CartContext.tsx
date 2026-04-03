import { createContext, useEffect, useReducer } from "react";
import type { ReactNode } from "react";
import { getCurrentUserSession, subscribeToUserSession } from "../utils/orderPortal";

type CartItem = {
  id: string;
  name: string;
  price: number;
  image?: string;
  canteenId?: string;
  quantity: number;
};

type State = {
  items: CartItem[];
};

type Action =
  | { type: "add"; item: Omit<CartItem, "quantity"> }
  | { type: "remove"; id: string }
  | { type: "increment"; id: string }
  | { type: "decrement"; id: string }
  | { type: "clear" };

const CART_STORAGE_KEY = "bytehiveCart";

function readInitialState(): State {
  if (typeof window === "undefined") return { items: [] };

  try {
    const session = getCurrentUserSession();
    if (!session) return { items: [] };

    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return { items: [] };
    return JSON.parse(stored) as State;
  } catch (error) {
    console.error("Unable to restore cart:", error);
    return { items: [] };
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "add": {
      const currentOutletId = state.items[0]?.canteenId;
      const nextOutletId = action.item.canteenId;
      if (currentOutletId && nextOutletId && currentOutletId !== nextOutletId) {
        return { items: [{ ...action.item, quantity: 1 }] };
      }

      const exists = state.items.find((item) => item.id === action.item.id);
      if (exists) {
        return {
          items: state.items.map((item) => item.id === action.item.id ? { ...item, quantity: item.quantity + 1 } : item),
        };
      }

      return { items: [...state.items, { ...action.item, quantity: 1 }] };
    }
    case "remove":
      return { items: state.items.filter((item) => item.id !== action.id) };
    case "increment":
      return { items: state.items.map((item) => item.id === action.id ? { ...item, quantity: item.quantity + 1 } : item) };
    case "decrement":
      return { items: state.items.map((item) => item.id === action.id ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item) };
    case "clear":
      return { items: [] };
    default:
      return state;
  }
}

type CartContextType = {
  state: State;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  increment: (id: string) => void;
  decrement: (id: string) => void;
  clear: () => void;
  total: () => number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, readInitialState);

  useEffect(() => {
    const syncCartForSession = () => {
      const session = getCurrentUserSession();
      if (!session) {
        dispatch({ type: "clear" });
      }
    };

    syncCartForSession();
    return subscribeToUserSession(syncCartForSession);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Unable to persist cart:", error);
    }
  }, [state]);

  const addItem = (item: Omit<CartItem, "quantity">) => dispatch({ type: "add", item });
  const removeItem = (id: string) => dispatch({ type: "remove", id });
  const increment = (id: string) => dispatch({ type: "increment", id });
  const decrement = (id: string) => dispatch({ type: "decrement", id });
  const clear = () => dispatch({ type: "clear" });
  const total = () => state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ state, addItem, removeItem, increment, decrement, clear, total }}>
      {children}
    </CartContext.Provider>
  );
}

export default CartContext;
