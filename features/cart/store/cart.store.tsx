import { createContext, useEffect, useReducer, useCallback, useRef } from "react";
import type { ReactNode } from "react";

type CartItem = {
  id: string;
  name: string;
  price: number;
  image?: string;
  canteenId?: string;
  isAvailable?: boolean;
  quantity: number;
};

type State = {
  items: CartItem[];
  sourceCanteen?: string;
};

type Action =
  | { type: "add"; item: Omit<CartItem, "quantity"> }
  | { type: "remove"; id: string }
  | { type: "increment"; id: string }
  | { type: "decrement"; id: string }
  | { type: "clear" }
  | { type: "setSourceCanteen"; canteenId: string }
  | { type: "restore"; items: CartItem[]; sourceCanteen?: string }
  | { type: "replaceItems"; items: CartItem[]; sourceCanteen?: string };

const CART_STORAGE_KEY = "bytehiveCart";

function readInitialState(): State {
  if (typeof window === "undefined") return { items: [], sourceCanteen: undefined };

  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return { items: [], sourceCanteen: undefined };
    const parsed = JSON.parse(stored);
    if (!parsed?.items?.length) return { items: [], sourceCanteen: undefined };
    return {
      items: parsed.items || [],
      sourceCanteen: parsed.sourceCanteen,
    };
  } catch (error) {
    console.error("Unable to restore cart:", error);
    return { items: [], sourceCanteen: undefined };
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "add": {
      const currentOutletId = state.items[0]?.canteenId;
      const nextOutletId = action.item.canteenId;
      if (currentOutletId && nextOutletId && currentOutletId !== nextOutletId) {
        return { items: [{ ...action.item, quantity: 1 }], sourceCanteen: nextOutletId };
      }

      const exists = state.items.find((item) => item.id === action.item.id);
      if (exists) {
        return {
          items: state.items.map((item) => item.id === action.item.id ? { ...item, quantity: item.quantity + 1 } : item),
          sourceCanteen: state.sourceCanteen || nextOutletId,
        };
      }

      return { items: [...state.items, { ...action.item, quantity: 1 }], sourceCanteen: state.sourceCanteen || nextOutletId };
    }
    case "remove":
      return { items: state.items.filter((item) => item.id !== action.id), sourceCanteen: state.sourceCanteen };
    case "increment":
      return { items: state.items.map((item) => item.id === action.id ? { ...item, quantity: item.quantity + 1 } : item), sourceCanteen: state.sourceCanteen };
    case "decrement":
      return {
        items: state.items
          .map((item) => item.id === action.id ? { ...item, quantity: item.quantity - 1 } : item)
          .filter((item) => item.quantity > 0),
        sourceCanteen: state.sourceCanteen,
      };
    case "clear":
      return { items: [], sourceCanteen: undefined };
    case "setSourceCanteen":
      return { ...state, sourceCanteen: action.canteenId };
    case "restore":
      return { items: action.items, sourceCanteen: action.sourceCanteen };
    case "replaceItems":
      return {
        items: action.items,
        sourceCanteen: action.sourceCanteen ?? action.items[0]?.canteenId ?? state.sourceCanteen,
      };
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
  setSourceCanteen: (canteenId: string) => void;
  replaceItems: (items: CartItem[], sourceCanteen?: string) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, readInitialState);
  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (!initialLoadRef.current) return;
    initialLoadRef.current = false;

    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.items?.length > 0) {
          dispatch({ type: "restore", items: parsed.items, sourceCanteen: parsed.sourceCanteen });
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Unable to persist cart:", error);
    }
  }, [state]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">) => dispatch({ type: "add", item }), []);
  const removeItem = useCallback((id: string) => dispatch({ type: "remove", id }), []);
  const increment = useCallback((id: string) => dispatch({ type: "increment", id }), []);
  const decrement = useCallback((id: string) => dispatch({ type: "decrement", id }), []);
  const clear = useCallback(() => dispatch({ type: "clear" }), []);
  const total = useCallback(() => state.items.reduce((sum, item) => sum + item.price * item.quantity, 0), [state.items]);
  const setSourceCanteen = useCallback((canteenId: string) => dispatch({ type: "setSourceCanteen", canteenId }), []);
  const replaceItems = useCallback((items: CartItem[], sourceCanteen?: string) => {
    dispatch({ type: "replaceItems", items, sourceCanteen });
  }, []);

  return (
    <CartContext.Provider value={{ state, addItem, removeItem, increment, decrement, clear, total, setSourceCanteen, replaceItems }}>
      {children}
    </CartContext.Provider>
  );
}

export default CartContext;
