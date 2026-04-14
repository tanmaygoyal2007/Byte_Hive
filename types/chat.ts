export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  isVeg: boolean;
  isSpicy?: boolean;
  prepTime: number;
  outlet: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface OrderContext {
  outletName?: string;
  pickupLocation?: string;
  estimatedTime?: number;
  cart?: CartItem[];
  menu?: MenuItem[];
  orderId?: string;
  orderStatus?: "pending" | "preparing" | "ready" | "collected";
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}