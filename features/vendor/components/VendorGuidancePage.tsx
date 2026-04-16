import { ArrowLeft, Bot, CircleDollarSign, Clock3, Eye, MapPin, PackageCheck, Palette, QrCode, ShieldCheck, Smartphone, Store, UtensilsCrossed } from "lucide-react";
import { Link } from "@/components/lib/router";
import Footer from "@/components/components/layout/Footer";
import Navbar from "@/components/components/layout/Navbar";
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
    title: "Control menu, labels, and pricing",
    description:
      "Mark items available or unavailable, adjust prices, add new menu items, create custom labels, and keep the student-facing menu aligned with the real kitchen state.",
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
      "Use the QR scanner page to scan live codes, paste a payload manually, or verify the latest ready order and move it into handoff confirmation.",
  },
  {
    icon: Eye,
    title: "Preview the student experience",
    description:
      "Open the Preview page to see exactly how your outlet, menu availability, and item pricing appear in the student ordering flow.",
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
      "Close the outlet manually or schedule a reopen time with a student-facing closure note.",
    ],
  },
  {
    title: "Preparation and queue tools",
    points: [
      "Increase or reduce prep time using fixed minute buttons or a custom value.",
      "Pause the live timer by marking an order delayed.",
      "Send a delay notice to students directly from the order card.",
      "Reset timing changes when the kitchen catches up.",
      "Expand orders to inspect items, customer info, pickup point, and live countdown state.",
    ],
  },
  {
    title: "Menu and preview controls",
    points: [
      "Preview the outlet exactly the way a student sees it before service starts.",
      "Search items by name, category, or description from the menu manager.",
      "Create custom color labels and attach them while editing menu items.",
      "Add, edit, delete, and toggle item availability from both desktop and mobile layouts.",
    ],
  },
  {
    title: "Vendor AI Copilot",
    points: [
      "Use Ops Help for queue questions, delayed orders, and ETA insights.",
      "Use the Advanced menu for menu controls, pricing updates, and outlet actions.",
      "Confirm changes before the chatbot applies them, so operational edits stay safe.",
      "Ask the bot to summarize your queue, close the outlet, or manage menu availability.",
      "Use it as a shortcut layer, but keep final control with the confirmation step.",
    ],
  },
  {
    title: "Cross-device and student-side behavior",
    points: [
      "Orders now sync through the shared app server, so vendor devices and student devices can see the same live order updates.",
      "Menu edits reflect in the student portal and customer chatbot.",
      "Order ETA and delay updates appear in student order tracking automatically.",
      "Outlet closures block checkout while still allowing browsing and cart building.",
      "Pickup verification moves orders into handoff first, then collected after the student confirms receipt.",
    ],
  },
];

const newerFeatures = [
  {
    icon: Eye,
    title: "Preview Mode",
    description: "Jump into the student menu view directly from the vendor navbar or menu page and review your outlet before customers do.",
  },
  {
    icon: Palette,
    title: "Label Manager",
    description: "Create outlet-specific labels with colors, then reuse them inside the menu editor to organize specials, tags, and categories.",
  },
  {
    icon: Smartphone,
    title: "Cross-device Sync",
    description: "Orders sync across devices through the local app server, so a student order placed on one device can be managed from another vendor device.",
  },
];

const bestPractices = [
  "Accept new orders quickly so students see progress instead of a static preparing state.",
  "Use Preview Mode after important menu edits so you see exactly what students will see.",
  "Update prep time as soon as kitchen load changes to keep ETA trustworthy.",
  "Use delay notices when timing slips instead of silently increasing prep minutes.",
  "Keep the QR page open near pickup time and switch the camera off only when you need to save battery or use manual verification.",
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
            <ArrowLeft size={18} />
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
              <p>Everything below reflects the portal as it works now, including the newer menu, preview, and sync features.</p>
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
                <h2>What was added later</h2>
                <p>These are some of the newer vendor-side features that were added after the original portal guidance was drafted.</p>
              </div>
              <span className="vendor-section-icon"><PackageCheck size={22} /></span>
            </div>
            <div className="vendor-guidance-grid">
              {newerFeatures.map(({ icon: Icon, title, description }) => (
                <article key={title} className="vendor-guidance-card">
                  <span className="vendor-section-icon"><Icon size={20} /></span>
                  <h3>{title}</h3>
                  <p>{description}</p>
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
      <Footer variant="vendor" />
    </div>
  );
}

export default VendorGuidancePage;
