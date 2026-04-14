import { Bot, CircleDollarSign, Clock3, MapPin, PackageCheck, QrCode, ShieldCheck, Store, UtensilsCrossed } from "lucide-react";
import { Link } from "@/component/lib/router";
import Footer from "@/component/components/layout/Footer";
import Navbar from "@/component/components/layout/Navbar";
import { getVendorLocation, getVendorOutlet } from "@/features/vendor/services/vendor-portal.service";

const workflowSteps = [
  {
    icon: Store,
    title: "Manage outlet status",
    description:
      "Open or close your outlet based on real operations. You can schedule a reopening time or keep the outlet closed until you manually reopen it.",
  },
  {
    icon: UtensilsCrossed,
    title: "Control menu availability and pricing",
    description:
      "Mark items available or unavailable, adjust prices, add new menu items, and keep the student-facing menu aligned with the real kitchen state.",
  },
  {
    icon: Clock3,
    title: "Update preparation timing",
    description:
      "Add or reduce preparation minutes for live orders, reset timings, and mark delayed orders so the student portal and ByteBot stay in sync.",
  },
  {
    icon: QrCode,
    title: "Complete pickups with QR verification",
    description:
      "Use the QR scanner page to verify student pickup codes and move ready orders cleanly into completed history.",
  },
];

const capabilityGroups = [
  {
    title: "Dashboard controls",
    points: [
      "Track active and completed orders in separate sections.",
      "See live ETA countdowns with seconds for active orders.",
      "Hide completed orders when you want a cleaner working view.",
      "Use quick order actions like Accept Order and Mark as Ready.",
    ],
  },
  {
    title: "Preparation and delay tools",
    points: [
      "Increase or reduce prep time using fixed minute buttons or a custom value.",
      "Pause the live timer by marking an order delayed.",
      "Send a delay notice to students directly from the order card.",
      "Reset timing changes when the kitchen catches up.",
    ],
  },
  {
    title: "Vendor AI Copilot",
    points: [
      "Use Ops Help for queue questions, delayed orders, and ETA insights.",
      "Use the Advanced menu for menu controls, pricing updates, and outlet actions.",
      "Confirm changes before the chatbot applies them, so operational edits stay safe.",
      "Ask the bot to summarize your queue, close the outlet, or manage menu availability.",
    ],
  },
  {
    title: "Student-side impact",
    points: [
      "Menu edits reflect in the student portal and customer chatbot.",
      "Order ETA and delay updates appear in student order tracking automatically.",
      "Outlet closures block checkout while still allowing browsing and cart building.",
      "Pickup verification moves orders into completed history and closes the student flow properly.",
    ],
  },
];

const bestPractices = [
  "Accept new orders quickly so students see progress instead of a static preparing state.",
  "Update prep time as soon as kitchen load changes to keep ETA trustworthy.",
  "Use delay notices when timing slips instead of silently increasing prep minutes.",
  "Keep unavailable items updated early to avoid failed customer expectations.",
  "Use the AI copilot for bulk changes carefully and confirm previews before applying them.",
];

function VendorGuidancePage() {
  const outletName = getVendorOutlet() ?? "Vendor Portal";
  const outletLocation = getVendorLocation(outletName);

  return (
    <div className="vendor-page">
      <Navbar />
      <main className="vendor-main">
        <div className="vendor-shell vendor-stack">
          <Link to="/vendor/dashboard" className="vendor-back-link">
            Back to Vendor Portal
          </Link>

          <section className="vendor-card vendor-guidance-hero">
            <div className="vendor-card-header">
              <div className="vendor-section-title">
                <div className="vendor-outlet-meta">
                  <span className="vendor-section-icon"><ShieldCheck size={22} /></span>
                  <div>
                    <h1 className="vendor-page-title">Vendor Guidance</h1>
                    <p>A clean walkthrough of everything you can manage from the ByteHive vendor portal.</p>
                  </div>
                </div>
              </div>
              <div className="vendor-guidance-meta">
                <strong>{outletName}</strong>
                <span><MapPin size={15} /> {outletLocation}</span>
              </div>
            </div>
          </section>

          <section className="vendor-card">
            <div className="vendor-section-title">
              <h2>How the portal works</h2>
              <p>Use this as your operating flow during a live service window.</p>
            </div>
            <div className="vendor-guidance-grid">
              {workflowSteps.map(({ icon: Icon, title, description }) => (
                <article key={title} className="vendor-guidance-card">
                  <span className="vendor-section-icon"><Icon size={20} /></span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="vendor-card">
            <div className="vendor-section-title">
              <h2>What you can do</h2>
              <p>Everything below is already connected to the live student and vendor flows.</p>
            </div>
            <div className="vendor-guidance-columns">
              {capabilityGroups.map((group) => (
                <article key={group.title} className="vendor-guidance-panel">
                  <h3>{group.title}</h3>
                  <ul className="vendor-guidance-list">
                    {group.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <section className="vendor-card">
            <div className="vendor-card-header">
              <div className="vendor-section-title">
                <h2>AI-assisted actions</h2>
                <p>The vendor chatbot is built for operational work, not just questions.</p>
              </div>
              <span className="vendor-section-icon"><Bot size={22} /></span>
            </div>
            <div className="vendor-guidance-columns vendor-guidance-columns-two">
              <article className="vendor-guidance-panel">
                <h3>Ops Help</h3>
                <ul className="vendor-guidance-list">
                  <li>Summarize my queue</li>
                  <li>Show urgent or delayed orders</li>
                  <li>What is my average ETA today?</li>
                  <li>Which order should I prepare next?</li>
                </ul>
              </article>
              <article className="vendor-guidance-panel">
                <h3>Advanced controls</h3>
                <ul className="vendor-guidance-list">
                  <li>Close this outlet for next 3 hours</li>
                  <li>Reopen this outlet now</li>
                  <li>Mark all beverages unavailable</li>
                  <li>Increase all beverages by 2%</li>
                  <li>Set Cold Coffee to Rs 85</li>
                </ul>
              </article>
            </div>
          </section>

          <section className="vendor-card">
            <div className="vendor-card-header">
              <div className="vendor-section-title">
                <h2>Best practices</h2>
                <p>These are the habits that make the vendor portal feel reliable and product-ready.</p>
              </div>
              <div className="vendor-guidance-icons">
                <span className="vendor-section-icon"><PackageCheck size={20} /></span>
                <span className="vendor-section-icon"><CircleDollarSign size={20} /></span>
              </div>
            </div>
            <ul className="vendor-guidance-list vendor-guidance-list-spacious">
              {bestPractices.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default VendorGuidancePage;
