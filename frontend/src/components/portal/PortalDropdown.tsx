import { GraduationCap, Store } from "lucide-react";
import { Link } from "react-router-dom";
import "./PortalDropdown.css";

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

      <Link to="/vendor/login" className="portal-dropdown-item" onClick={onClose}>
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
