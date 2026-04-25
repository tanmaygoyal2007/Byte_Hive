"use client";

import Navbar from "@/components/components/layout/Navbar";

type NavbarWrapperProps = {
  forceUserMode?: boolean;
};

export default function NavbarWrapper({ forceUserMode = false }: NavbarWrapperProps) {
  return <Navbar forceUserMode={forceUserMode} />;
}
