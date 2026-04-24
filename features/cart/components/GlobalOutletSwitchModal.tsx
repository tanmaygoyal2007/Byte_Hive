"use client";

import { AlertTriangle } from "lucide-react";
import useCart from "@/features/cart/hooks/useCart";
import { useCallback } from "react";
import { useOutletSwitch } from "./OutletSwitchContext";
import "@/features/cart/components/OutletSwitchConfirm.css";

export default function GlobalOutletSwitchModal() {
  const { pendingSwitch, hideConfirm } = useOutletSwitch();
  const { addItem, clear } = useCart();

  const handleConfirm = useCallback(() => {
    if (pendingSwitch) {
      clear();
      addItem(pendingSwitch.item);
      hideConfirm();
    }
  }, [pendingSwitch, clear, addItem, hideConfirm]);

  if (!pendingSwitch) return null;

  return (
    <div className="outlet-switch-overlay" onClick={hideConfirm}>
      <div className="outlet-switch-modal" onClick={(e) => e.stopPropagation()}>
        <div className="outlet-switch-icon">
          <AlertTriangle size={32} />
        </div>
        <h3>Switch Outlet?</h3>
        <p>
          Your cart has <strong>{pendingSwitch.itemCount} item{pendingSwitch.itemCount !== 1 ? "s" : ""}</strong> from{" "}
          <strong>{pendingSwitch.currentOutletName}</strong>.
        </p>
        <p>
          Adding <strong>{pendingSwitch.newOutletName}</strong> will remove all current items. Do you want to continue?
        </p>
        <div className="outlet-switch-actions">
          <button type="button" className="outlet-switch-cancel" onClick={hideConfirm}>
            Cancel
          </button>
          <button type="button" className="outlet-switch-confirm" onClick={handleConfirm}>
            Switch & Add
          </button>
        </div>
      </div>
    </div>
  );
}