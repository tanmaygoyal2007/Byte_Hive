import { Link } from "@/components/lib/router";

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
  hideBackLink?: boolean;
  backLinkUrl?: string;
}

function CanteenHeader({ canteen, isOutletOpen = true, closureLabel = null, hideBackLink = false, backLinkUrl, }: CanteenHeaderProps) {
  if (!canteen) return null;

  return (
    <div className="canteen-header">
      <div className="canteen-header-left">
        {!hideBackLink && (
          <Link to={backLinkUrl ?? "/canteens"} className="back-link">&lt; Back</Link>
        )}
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
