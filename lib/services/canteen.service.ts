import { getAllCanteens } from "@/lib/repositories/canteen.repository";

export function listCanteens() {
  return getAllCanteens();
}
