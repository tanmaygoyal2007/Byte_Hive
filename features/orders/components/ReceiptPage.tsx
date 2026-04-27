import React, { useEffect, useState } from "react";
import { ReceiptText, X } from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "@/components/lib/router";
import Footer from "@/components/components/layout/Footer";
import Navbar from "@/components/components/layout/Navbar";
import ReceiptCard from "@/features/orders/components/ReceiptCard";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  getOrderById,
  getOrderDelayCopy,
  getPickupCodeForOrder,
  getPickupSegmentsForOrder,
  getQrValueForPickupSegment,
  subscribeToOrders,
} from "@/features/orders/services/order-portal.service";

interface LocationState {
  paymentId?: string;
  orderId?: string;
  items?: { id: string; name: string; price: number; quantity: number; pickupPoint?: "counter" | "vendor_stall" }[];
  total?: number;
}

const ReceiptPage: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [downloadStatus, setDownloadStatus] = useState<"idle" | "downloading" | "failed">("idle");
  const [downloadedAt, setDownloadedAt] = useState<string | null>(null);
  const [showLeavePrompt, setShowLeavePrompt] = useState(false);

  const state = location.state as LocationState | null;
  const resolvedOrderId = state?.orderId ?? searchParams.get("orderId") ?? "";
  const [storedOrder, setStoredOrder] = useState(() => (resolvedOrderId ? getOrderById(resolvedOrderId) : null));
  const isRealPayment = !!(state?.paymentId || storedOrder?.paymentId);

  useEffect(() => {
    setStoredOrder(resolvedOrderId ? getOrderById(resolvedOrderId) : null);

    if (!resolvedOrderId) return;
    return subscribeToOrders(() => {
      setStoredOrder(getOrderById(resolvedOrderId));
    });
  }, [resolvedOrderId]);

  const formatReceiptTimestamp = (value: string) =>
    new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));

  const orderData = storedOrder
    ? {
        orderId: storedOrder.id,
        qrValue: storedOrder.status === "collected" ? undefined : getQrValueForPickupSegment(storedOrder),
        pickupCode: storedOrder.status === "collected" ? undefined : getPickupCodeForOrder(storedOrder),
        orderPlacedAt: formatReceiptTimestamp(storedOrder.createdAt),
        downloadedAt: downloadedAt ? formatReceiptTimestamp(downloadedAt) : undefined,
        paymentId: storedOrder.paymentId,
        fulfillmentType: storedOrder.fulfillmentType,
        scheduledFor: storedOrder.scheduledFor,
        outletName: storedOrder.outletName,
        pickupLocation: storedOrder.pickupLocation,
        estimatedTime: storedOrder.estimatedTime,
        delayMessage: getOrderDelayCopy(storedOrder),
        isQrExpired: storedOrder.status === "collected",
        pickupQrSections: getPickupSegmentsForOrder(storedOrder).map((segment) => ({
          id: segment.id,
          pickupPoint: segment.pickupPoint,
          title: segment.pickupPoint === "vendor_stall" ? "Collect at Vendor Stall" : "Collect at Counter",
          description:
            storedOrder.status === "collected"
              ? "This order has already been completed, so its pickup QR is no longer shown."
              : segment.status === "verified"
                ? `This ${segment.pickupPoint === "vendor_stall" ? "vendor stall" : "counter"} pickup point has already been verified.`
                : segment.pickupPoint === "vendor_stall"
                  ? "Show this QR code at the vendor stall to collect these items."
                  : "Show this QR code at the counter to collect these items.",
          qrValue:
            storedOrder.status === "collected" || segment.status === "verified"
              ? undefined
              : getQrValueForPickupSegment(storedOrder, segment.id),
          pickupCode:
            storedOrder.status === "collected" || segment.status === "verified"
              ? undefined
              : segment.pickupCode,
          isQrExpired: storedOrder.status === "collected" || segment.status === "verified",
        })),
        items: storedOrder.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          pickupPoint: item.pickupPoint,
        })),
        subtotal: storedOrder.subtotal,
        taxes: storedOrder.taxes,
        total: storedOrder.total,
      }
    : {
        orderId: resolvedOrderId || "BH2025012601",
        qrValue: resolvedOrderId ? getQrValueForPickupSegment(resolvedOrderId) : `ByteHive-Order-${resolvedOrderId || "BH2025012601"}`,
        pickupCode: undefined,
        orderPlacedAt: formatReceiptTimestamp(new Date().toISOString()),
        downloadedAt: downloadedAt ? formatReceiptTimestamp(downloadedAt) : undefined,
        paymentId: state?.paymentId,
        fulfillmentType: "instant" as const,
        scheduledFor: null,
        outletName: "Punjabi Bites",
        pickupLocation: "Block A - Basement",
        estimatedTime: "15-20 minutes",
        delayMessage: null,
        isQrExpired: false,
        pickupQrSections: [
          {
            id: "counter" as const,
            pickupPoint: "counter" as const,
            title: "Collect at Counter",
            description: "Show this QR code at the counter to collect these items.",
            qrValue: "ByteHive|punjabiBites|BH2025012601|counter|ABC123COUNTER",
            pickupCode: "0001az",
            isQrExpired: false,
          },
          {
            id: "vendor_stall" as const,
            pickupPoint: "vendor_stall" as const,
            title: "Collect at Vendor Stall",
            description: "Show this QR code at the vendor stall to collect these items.",
            qrValue: "ByteHive|punjabiBites|BH2025012601|vendor_stall|ABC123STALL",
            pickupCode: "0001mk",
            isQrExpired: false,
          },
        ],
        items: state?.items?.map((item) => ({ name: item.name, quantity: item.quantity, price: item.price, pickupPoint: item.pickupPoint })) ?? [
          { name: "Chole Bhature", quantity: 2, price: 120, pickupPoint: "vendor_stall" as const },
          { name: "Lassi", quantity: 1, price: 40, pickupPoint: "counter" as const },
          { name: "Paneer Tikka", quantity: 1, price: 150, pickupPoint: "vendor_stall" as const },
        ],
        subtotal: state?.total ?? 310,
        taxes: state?.total ? Math.round(state.total * 0.05) : 31,
        total: state?.total ? Math.round(state.total * 1.05) : 341,
      };

  const hasSplitPickupReceipt = (orderData.pickupQrSections?.length ?? 0) > 1;

  const leaveReceiptPage = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }

    navigate("/");
  };

  const handleDownload = async () => {
    const receipt = document.getElementById("receipt-content");
    if (!receipt) return;

    setDownloadStatus("downloading");
    const downloadTimestamp = new Date().toISOString();
    setDownloadedAt(downloadTimestamp);

    const prepareExportNode = (node: HTMLElement) => {
      node.classList.add("receipt-export-mode");
      node.style.width = `${receipt.offsetWidth}px`;
      node.style.position = "fixed";
      node.style.left = "-99999px";
      node.style.top = "0";
      node.style.zIndex = "-1";
      node.style.margin = "0";
      return node;
    };

    const createDownloadMetaNode = () => {
      const exportMeta = document.createElement("div");
      exportMeta.className = "receipt-export-download-meta";
      exportMeta.textContent = `Downloaded on ${formatReceiptTimestamp(downloadTimestamp)}`;
      return exportMeta;
    };

    const exportNode = prepareExportNode(receipt.cloneNode(true) as HTMLElement);
    const pickupGroups = Array.from(exportNode.querySelectorAll(".receipt-pickup-group")) as HTMLElement[];
    const exportPages: HTMLElement[] = [];

    if (pickupGroups.length > 1) {
      const rootChildren = Array.from(exportNode.children) as HTMLElement[];
      const orderHeader = rootChildren.find((child) => child.classList.contains("order-header"));
      const outletSection = rootChildren.find((child) => child.classList.contains("outlet-section"));
      const qrSection = rootChildren.find((child) => child.classList.contains("qr-section"));
      const itemsSection = rootChildren.find((child) => child.classList.contains("items-section"));
      const priceSection = rootChildren.find((child) => child.classList.contains("price-section"));
      const downloadMetaSection = rootChildren.find((child) => child.classList.contains("receipt-download-meta"));

      if (itemsSection) {
        const itemsTitle = itemsSection.querySelector(".section-title");
        const groupsContainer = itemsSection.querySelector(".receipt-pickup-groups");
        const firstGroup = pickupGroups[0];
        const remainingGroups = pickupGroups.slice(1);

        const pageOne = prepareExportNode(exportNode.cloneNode(false) as HTMLElement);
        if (orderHeader) pageOne.appendChild(orderHeader.cloneNode(true));
        if (outletSection) pageOne.appendChild(outletSection.cloneNode(true));
        if (qrSection) pageOne.appendChild(qrSection.cloneNode(true));

        const pageOneItems = itemsSection.cloneNode(false) as HTMLElement;
        if (itemsTitle) pageOneItems.appendChild(itemsTitle.cloneNode(true));
        if (groupsContainer && firstGroup) {
          const pageOneGroups = groupsContainer.cloneNode(false) as HTMLElement;
          pageOneGroups.appendChild(firstGroup.cloneNode(true));
          pageOneItems.appendChild(pageOneGroups);
        }
        pageOne.appendChild(pageOneItems);
        exportPages.push(pageOne);

        const pageTwo = prepareExportNode(exportNode.cloneNode(false) as HTMLElement);
        const pageTwoItems = itemsSection.cloneNode(false) as HTMLElement;
        if (itemsTitle) pageTwoItems.appendChild(itemsTitle.cloneNode(true));
        if (groupsContainer) {
          const pageTwoGroups = groupsContainer.cloneNode(false) as HTMLElement;
          remainingGroups.forEach((group) => pageTwoGroups.appendChild(group.cloneNode(true)));
          pageTwoItems.appendChild(pageTwoGroups);
        }
        pageTwo.appendChild(pageTwoItems);
        if (priceSection) pageTwo.appendChild(priceSection.cloneNode(true));
        if (downloadMetaSection) {
          pageTwo.appendChild(downloadMetaSection.cloneNode(true));
        } else {
          pageTwo.appendChild(createDownloadMetaNode());
        }
        exportPages.push(pageTwo);
      }
    }

    if (exportPages.length === 0) {
      exportNode.appendChild(createDownloadMetaNode());
      exportPages.push(exportNode);
    }

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 190;
      const pageHeight = 277;

      for (let pageIndex = 0; pageIndex < exportPages.length; pageIndex += 1) {
        const exportPage = exportPages[pageIndex];
        document.body.appendChild(exportPage);

        const canvas = await html2canvas(exportPage, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/png");
        const imgHeight = (canvas.height * pageWidth) / canvas.width;

        if (pageIndex > 0) {
          pdf.addPage();
        }

        if (imgHeight <= pageHeight) {
          pdf.addImage(imgData, "PNG", 10, 10, pageWidth, imgHeight);
        } else {
          let heightLeft = imgHeight;
          let position = 10;
          pdf.addImage(imgData, "PNG", 10, position, pageWidth, imgHeight);
          heightLeft -= pageHeight;

          while (heightLeft > 0) {
            pdf.addPage();
            position = heightLeft - imgHeight + 10;
            pdf.addImage(imgData, "PNG", 10, position, pageWidth, imgHeight);
            heightLeft -= pageHeight;
          }
        }
      }

      pdf.save(`receipt_${orderData.orderId}_${Date.now()}.pdf`);
      setDownloadStatus("idle");
    } catch (error) {
      console.error("Unable to generate receipt PDF:", error);
      setDownloadStatus("failed");
    } finally {
      exportPages.forEach((pageNode) => pageNode.remove());
    }
  };

  return (
    <div className="receipt-screen">
      <Navbar />
      <main className="receipt-screen-main">
        <section className={`receipt-shell ${hasSplitPickupReceipt ? "receipt-shell-split" : ""}`}>
          <div className="receipt-shell-top">
            <button
              type="button"
              className="receipt-exit-button"
              onClick={() => setShowLeavePrompt(true)}
              aria-label="Close receipt"
            >
              <X size={18} />
            </button>
          </div>

          <ReceiptCard
            {...orderData}
            paymentId={storedOrder?.paymentId ?? state?.paymentId}
            onDownload={handleDownload}
            onOrderMore={() => navigate("/canteens")}
            onBackHome={() => navigate("/")}
            downloadStatus={downloadStatus}
          />

          {!storedOrder && !isRealPayment && (
            <div className="receipt-fallback-note">
              <ReceiptText size={16} />
              <span>You are viewing a sample receipt because no stored order was found for this page.</span>
            </div>
          )}

          {downloadStatus === "failed" && (
            <div className="receipt-fallback-note">
              <ReceiptText size={16} />
              <span>We could not generate the PDF this time. Please try again.</span>
            </div>
          )}
        </section>
      </main>

      {showLeavePrompt && (
        <div className="receipt-leave-backdrop" role="dialog" aria-modal="true" aria-label="Leave receipt page">
          <div className="receipt-leave-card">
            <h3>Leave this receipt?</h3>
            <p>You can always reopen this receipt later from your active order or order history.</p>
            <div className="receipt-leave-actions">
              <button type="button" className="button-outline" onClick={() => setShowLeavePrompt(false)}>
                No
              </button>
              <button type="button" className="button-primary" onClick={leaveReceiptPage}>
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default ReceiptPage;
