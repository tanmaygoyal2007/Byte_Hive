import { ArrowLeft, Bot, Clock3, Eye, MapPin, PackageCheck, Palette, QrCode, Settings, ShieldCheck, Smartphone, Store, UtensilsCrossed, Zap } from "lucide-react";
import { Link } from "@/components/lib/router";
import Footer from "@/components/components/layout/Footer";
import Navbar from "@/components/components/layout/Navbar";
import { getVendorLocation, getVendorOutlet } from "@/features/vendor/services/vendor-portal.service";

const workflowSteps = [
  {
    icon: Store,
    title: "Manage outlet status",
    description: "Open or close your outlet based on real operations. Schedule reopening time or keep closed until manual reopen.",
  },
  {
    icon: UtensilsCrossed,
    title: "Control menu & pricing",
    description: "Mark items available, adjust prices, create custom labels, and keep the student menu aligned with kitchen state.",
  },
  {
    icon: Clock3,
    title: "Update prep timing",
    description: "Add or reduce prep minutes, reset timings, and mark delayed orders so portal and chatbot stay in sync.",
  },
  {
    icon: QrCode,
    title: "QR pickup verification",
    description: "Scan live codes, paste manually, or verify ready orders and move into handoff confirmation.",
  },
  {
    icon: Eye,
    title: "Preview student view",
    description: "See exactly how your outlet, menu, and pricing appear in the student ordering flow.",
  },
];

const capabilityGroups = [
  {
    title: "Dashboard controls",
    icon: Settings,
    points: [
      "Track active and completed orders separately",
      "Live ETA countdowns with seconds",
      "Hide completed orders for cleaner view",
      "Quick actions: Accept Order & Mark Ready",
      "Manual close or scheduled reopen",
    ],
  },
  {
    title: "Preparation & queue",
    icon: Clock3,
    points: [
      "Increase or reduce prep time instantly",
      "Pause timer by marking delays",
      "Send delay notices to students",
      "Reset timing when kitchen catches up",
      "Expand orders for full details",
    ],
  },
  {
    title: "Menu manager",
    icon: UtensilsCrossed,
    points: [
      "Preview outlet as students see it",
      "Search items by name or category",
      "Create custom color labels",
      "Toggle item availability on/off",
      "Full menu control from any device",
    ],
  },
  {
    title: "AI Copilot",
    icon: Bot,
    points: [
      "Ops Help for queue insights",
      "Advanced menu & pricing controls",
      "Confirm changes before applying",
      "Ask to summarize queue instantly",
      "Shortcut layer with safety checks",
    ],
  },
  {
    title: "Cross-device sync",
    icon: Smartphone,
    points: [
      "Orders sync across all devices",
      "Menu edits reflect instantly",
      "ETA updates appear automatically",
      "Closures block checkout smoothly",
      "Pickup verification flow",
    ],
  },
];

const newerFeatures = [
  {
    icon: Eye,
    title: "Preview Mode",
    description: "Jump into student menu view directly and review your outlet before customers do.",
  },
  {
    icon: Palette,
    title: "Label Manager",
    description: "Create outlet-specific labels with colors to organize specials and categories.",
  },
  {
    icon: Zap,
    title: "Instant Sync",
    description: "Orders sync through server so vendor and student devices see same updates.",
  },
];

const bestPractices = [
  "Accept new orders quickly so students see progress",
  "Use Preview Mode after important menu edits",
  "Update prep time as soon as kitchen load changes",
  "Use delay notices when timing slips",
  "Keep QR page open near pickup time",
  "Update unavailable items early",
  "Use AI copilot for bulk changes with care",
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
            Back to Portal
          </Link>

          <section className="vendor-card vendor-guidance-hero">
            <div className="vendor-guidance-header">
              <div className="vendor-guidance-title-section">
                <span className="vendor-guidance-badge">
                  <ShieldCheck size={16} />
                  Vendor Portal Guide
                </span>
                <h1 className="vendor-page-title">Vendor Guidance</h1>
                <p>A clean walkthrough of everything you can manage from the ByteHive vendor portal.</p>
              </div>
              <div className="vendor-guidance-meta">
                <span className="vendor-guidance-meta-icon">
                  <Store size={28} />
                </span>
                <strong>{outletName}</strong>
                <span className="vendor-guidance-location">
                  <MapPin size={16} />
                  {outletLocation}
                </span>
              </div>
            </div>
          </section>

          <section className="vendor-card">
            <div className="vendor-section-title">
              <h2>How the portal works</h2>
              <p>Your operating flow during a live service window</p>
            </div>
            <div className="vendor-workflow-grid">
              {workflowSteps.map((step, index) => (
                <article key={step.title} className="vendor-workflow-card">
                  <div className="vendor-workflow-header">
                    <span className="vendor-workflow-number">{String(index + 1).padStart(2, '0')}</span>
                    <span className="vendor-workflow-icon">
                      <step.icon size={22} />
                    </span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="vendor-card">
            <div className="vendor-section-title">
              <h2>What you can do</h2>
              <p>Complete capabilities of the vendor portal</p>
            </div>
            <div className="vendor-capabilities-grid">
              {capabilityGroups.map((group) => (
                <article key={group.title} className="vendor-capability-card">
                  <div className="vendor-capability-header">
                    <span className="vendor-capability-icon">
                      <group.icon size={20} />
                    </span>
                    <h3>{group.title}</h3>
                  </div>
                  <ul className="vendor-feature-list">
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
                <h2>New features</h2>
                <p>Recently added capabilities</p>
              </div>
              <span className="vendor-section-icon"><PackageCheck size={22} /></span>
            </div>
            <div className="vendor-features-grid">
              {newerFeatures.map((feature) => (
                <article key={feature.title} className="vendor-feature-card">
                  <span className="vendor-feature-icon">
                    <feature.icon size={24} />
                  </span>
                  <div className="vendor-feature-badge">New</div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="vendor-card">
            <div className="vendor-card-header">
              <div className="vendor-section-title">
                <h2>AI Copilot actions</h2>
                <p>What you can ask the chatbot</p>
              </div>
              <span className="vendor-section-icon"><Bot size={22} /></span>
            </div>
            <div className="vendor-ai-grid">
              <article className="vendor-ai-card">
                <div className="vendor-ai-header">
                  <h3>Ops Help</h3>
                  <p>Queue questions, delays, and ETA insights</p>
                </div>
                <div className="vendor-ai-commands">
                  <span>"Summarize my queue"</span>
                  <span>"Show delayed orders"</span>
                  <span>"Average ETA today?"</span>
                </div>
              </article>
              <article className="vendor-ai-card">
                <div className="vendor-ai-header">
                  <h3>Advanced Controls</h3>
                  <p>Menu controls and outlet actions</p>
                </div>
                <div className="vendor-ai-commands">
                  <span>"Close outlet for 3 hours"</span>
                  <span>"Mark beverages unavailable"</span>
                  <span>"Set Cold Coffee to Rs 85"</span>
                </div>
              </article>
            </div>
          </section>

          <section className="vendor-card">
            <div className="vendor-card-header">
              <div className="vendor-section-title">
                <h2>Best practices</h2>
                <p>Tips for smooth operations</p>
              </div>
            </div>
            <div className="vendor-practices-grid">
              {bestPractices.map((practice, index) => (
                <div key={practice} className="vendor-practice-card">
                  <span className="vendor-practice-check">
                    <PackageCheck size={16} />
                  </span>
                  <span>{practice}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer variant="vendor" />
    </div>
  );
}

export default VendorGuidancePage;
