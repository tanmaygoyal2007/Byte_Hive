import { GraduationCap, Store } from "lucide-react";
import { Link } from "@/components/lib/router";
import { getVendorLoginHref } from "@/features/vendor/services/vendor-portal.service";

type PortalDropdownProps = {
  isOpen: boolean;
  onClose: () => void;
  onOpenStudentLogin: () => void;
};

function PortalDropdown({ isOpen, onClose, onOpenStudentLogin }: PortalDropdownProps) {
  if (!isOpen) return null;

  const handleStudentClick = () => {
    onClose();
    onOpenStudentLogin();
  };

  const handleVendorClick = () => {
    onClose();
  };

  return (
    <div className="portal-dropdown" role="menu" aria-label="Portal options">
      <button type="button" className="portal-dropdown-item" onClick={handleStudentClick}>
        <span className="portal-dropdown-icon">
          <GraduationCap size={22} />
        </span>
        <span className="portal-dropdown-copy">
          <strong>Student / Faculty</strong>
          <small>Browse menus, place orders, and track campus food</small>
        </span>
      </button>

      <Link to={getVendorLoginHref()} className="portal-dropdown-item" onClick={handleVendorClick}>
        <span className="portal-dropdown-icon">
          <Store size={22} />
        </span>
        <span className="portal-dropdown-copy">
          <strong>Vendor Portal</strong>
          <small>Manage menu items, prices, and orders</small>
        </span>
      </Link>
    </div>
  );
}

export default PortalDropdown;
