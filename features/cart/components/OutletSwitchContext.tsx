"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type PendingOutletSwitch = {
  item: {
    id: string;
    name: string;
    price: number;
    image?: string;
    canteenId?: string;
  };
  currentOutletName: string;
  newOutletName: string;
  itemCount: number;
};

type OutletSwitchContextType = {
  pendingSwitch: PendingOutletSwitch | null;
  showConfirm: (data: PendingOutletSwitch) => void;
  hideConfirm: () => void;
};

const OutletSwitchContext = createContext<OutletSwitchContextType | undefined>(undefined);

export function OutletSwitchProvider({ children }: { children: ReactNode }) {
  const [pendingSwitch, setPendingSwitch] = useState<PendingOutletSwitch | null>(null);

  const showConfirm = useCallback((data: PendingOutletSwitch) => {
    setPendingSwitch(data);
  }, []);

  const hideConfirm = useCallback(() => {
    setPendingSwitch(null);
  }, []);

  return (
    <OutletSwitchContext.Provider value={{ pendingSwitch, showConfirm, hideConfirm }}>
      {children}
    </OutletSwitchContext.Provider>
  );
}

export function useOutletSwitch() {
  const context = useContext(OutletSwitchContext);
  if (!context) {
    throw new Error("useOutletSwitch must be used within OutletSwitchProvider");
  }
  return context;
}