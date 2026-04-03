import React, { useMemo, useState } from "react";
import { CheckCircle2, House, ReceiptText } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import ReceiptCard from "../components/receipt/ReceiptCard";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { getOrderById, getQrValueForOrder } from "../utils/orderPortal";

interface LocationState {
  paymentId?: string;
  orderId?: string;
  items?: { id: string; name: string; price: number; quantity: number }[];
  total?: number;
}

const ReceiptPage: React.FC = () => {
  const location = useLocation();
  const { orderId: paramOrderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [downloadStatus, setDownloadStatus] = useState<"idle" | "downloading" | "failed">("idle");

  const state = location.state as LocationState | null;
  const resolvedOrderId = state?.orderId ?? paramOrderId ?? "";
  const storedOrder = useMemo(() => (resolvedOrderId ? getOrderById(resolvedOrderId) : null), [resolvedOrderId]);
  const isRealPayment = !!(state?.paymentId || storedOrder?.paymentId);

  const orderData = storedOrder
    ? {
        orderId: storedOrder.id,
        qrValue: getQrValueForOrder(storedOrder),
        pickupCode: storedOrder.pickupCode,
        paymentId: storedOrder.paymentId,
        outletName: storedOrder.outletName,
        pickupLocation: storedOrder.pickupLocation,
        estimatedTime: storedOrder.estimatedTime,
        items: storedOrder.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal: storedOrder.subtotal,
        taxes: storedOrder.taxes,
        total: storedOrder.total,
      }
    : {
        orderId: resolvedOrderId || "BH2025012601",
        qrValue: resolvedOrderId ? getQrValueForOrder(resolvedOrderId) : `ByteHive-Order-${resolvedOrderId || "BH2025012601"}`,
        pickupCode: undefined,
        paymentId: state?.paymentId,
        outletName: "Punjabi Bites",
        pickupLocation: "Block A - Basement",
        estimatedTime: "15-20 minutes",
        items: state?.items?.map((item) => ({ name: item.name, quantity: item.quantity, price: item.price })) ?? [
          { name: "Chole Bhature", quantity: 2, price: 120 },
          { name: "Lassi", quantity: 1, price: 40 },
          { name: "Paneer Tikka", quantity: 1, price: 150 },
        ],
        subtotal: state?.total ?? 310,
        taxes: state?.total ? Math.round(state.total * 0.05) : 31,
        total: state?.total ? Math.round(state.total * 1.05) : 341,
      };

  const handleDownload = async () => {
    const receipt = document.getElementById("receipt-content");
    if (!receipt) return;

    setDownloadStatus("downloading");
    const exportNode = receipt.cloneNode(true) as HTMLElement;
    exportNode.classList.add("receipt-export-mode");
    exportNode.style.width = `${receipt.offsetWidth}px`;
    exportNode.style.position = "fixed";
    exportNode.style.left = "-99999px";
    exportNode.style.top = "0";
    exportNode.style.zIndex = "-1";
    document.body.appendChild(exportNode);

    try {
      const canvas = await html2canvas(exportNode, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 190;
      const pageHeight = 277;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;
      pdf.addImage(imgData, "PNG", 10, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`receipt_${orderData.orderId}_${Date.now()}.pdf`);
      setDownloadStatus("idle");
    } catch (error) {
      console.error("Unable to generate receipt PDF:", error);
      setDownloadStatus("failed");
    } finally {
      exportNode.remove();
    }
  };

  return (
    <div className="receipt-screen">
      <Navbar />
      <main className="receipt-screen-main">
        <section className="receipt-shell">
          {isRealPayment && (
            <div className="receipt-success-banner" role="status" aria-live="polite">
              <div className="receipt-success-copy">
                <span className="receipt-success-icon" aria-hidden="true">
                  <CheckCircle2 size={20} />
                </span>
                <div>
                  <strong>Payment successful</strong>
                  <p>Payment ID: {orderData.paymentId ?? state?.paymentId}</p>
                </div>
              </div>
              <button type="button" className="receipt-banner-action" onClick={() => navigate("/")}>
                <House size={16} />
                Back to Home
              </button>
            </div>
          )}

          <ReceiptCard
            {...orderData}
            onDownload={handleDownload}
            onOrderMore={() => navigate("/explore")}
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
      <Footer />
    </div>
  );
};

export default ReceiptPage;
