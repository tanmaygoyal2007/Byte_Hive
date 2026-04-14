import { getMenuItems } from "@/lib/repositories/menu.repository";

export function listMenuItems() {
  return getMenuItems();
}
