import { Link } from "react-router-dom";
import "./CanteenHeader.css";

interface CanteenHeaderProps {
  canteen?: {
    name?: string;
    description?: string;
    block?: string;
    openingHours?: string;
    rating?: string | number;
  };
  isOutletOpen?: boolean;
  closureLabel?: string | null;
}

function CanteenHeader({ canteen, isOutletOpen = true, closureLabel = null }: CanteenHeaderProps) {
  if (!canteen) return null;

  return (
    <div className="canteen-header">
      <div className="canteen-header-left">
        <Link to="/explore" className="back-link">&lt; Back to Canteens</Link>
        <h1>{canteen.name}</h1>
        <div className="canteen-sub">{canteen.description} • {canteen.block}</div>
        <div className="canteen-meta">
          <span className={`open-badge${isOutletOpen ? "" : " open-badge-closed"}`}>
            {isOutletOpen ? "Open Now" : "Closed"}
          </span>
          <span className="timings">{canteen.openingHours}</span>
          {!isOutletOpen && closureLabel && <span className="timings">{closureLabel}</span>}
        </div>
      </div>

      <div className="canteen-header-right">
        <div className="rating">★ {canteen.rating}</div>
        <div className="phone">+91 98765 43210</div>
      </div>
    </div>
  );
}

export default CanteenHeader;
