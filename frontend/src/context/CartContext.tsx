import { createContext, useReducer } from "react";
import type { ReactNode } from 'react';

type CartItem = {
	id: string;
	name: string;
	price: number;
	image?: string;
	quantity: number;
}

type State = {
	items: CartItem[];
}

type Action =
	| { type: 'add', item: Omit<CartItem, 'quantity'> }
	| { type: 'remove', id: string }
	| { type: 'increment', id: string }
	| { type: 'decrement', id: string }
	| { type: 'clear' }

const initialState: State = { items: [] };

function reducer(state: State, action: Action): State {
	switch (action.type) {
		case 'add': {
			const exists = state.items.find(i => i.id === action.item.id);
			if (exists) {
				return {
					items: state.items.map(i => i.id === action.item.id ? { ...i, quantity: i.quantity + 1 } : i)
				}
			}
			return { items: [...state.items, { ...action.item, quantity: 1 }] };
		}
		case 'remove':
			return { items: state.items.filter(i => i.id !== action.id) };
		case 'increment':
			return { items: state.items.map(i => i.id === action.id ? { ...i, quantity: i.quantity + 1 } : i) };
		case 'decrement':
			return { items: state.items.map(i => i.id === action.id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i) };
		case 'clear':
			return { items: [] };
		default:
			return state;
	}
}

type CartContextType = {
	state: State;
	addItem: (item: Omit<CartItem, 'quantity'>) => void;
	removeItem: (id: string) => void;
	increment: (id: string) => void;
	decrement: (id: string) => void;
	clear: () => void;
	total: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }){
	const [state, dispatch] = useReducer(reducer, initialState);

	const addItem = (item: Omit<CartItem,'quantity'>) => dispatch({ type: 'add', item });
	const removeItem = (id: string) => dispatch({ type: 'remove', id });
	const increment = (id: string) => dispatch({ type: 'increment', id });
	const decrement = (id: string) => dispatch({ type: 'decrement', id });
	const clear = () => dispatch({ type: 'clear' });
	const total = () => state.items.reduce((s, i) => s + i.price * i.quantity, 0);

	return (
		<CartContext.Provider value={{ state, addItem, removeItem, increment, decrement, clear, total }}>
			{children}
		</CartContext.Provider>
	)
}

export default CartContext;