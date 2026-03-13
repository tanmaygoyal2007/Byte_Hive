import React from "react";
import ReceiptCard from "../components/receipt/ReceiptCard";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

let ReceiptPage: React.FC = () => {

  let orderData = {
    orderId: "BH2025012601",
    outletName: "Punjabi Bites",
    pickupLocation: "Block A - Basement",
    estimatedTime: "15-20 minutes",
    items: [
      { name: "Chole Bhature", quantity: 2, price: 120 },
      { name: "Lassi", quantity: 1, price: 40 },
      { name: "Paneer Tikka", quantity: 1, price: 150 },
    ],
    subtotal: 310,
    taxes: 31,
    total: 341,
  };

  const handleDownload = async () => {

    const receipt = document.getElementById("receipt-content");
    if (!receipt) return;

    const canvas = await html2canvas(receipt, {
      scale: 2,
      backgroundColor: "#ffffff"
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");

    const imgWidth = 190;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);

    const now = new Date();

    const filename = `receipt_${orderData.orderId}_${now.getTime()}.pdf`;

    pdf.save(filename);
  };

  return (
    <ReceiptCard
      {...orderData}
      onDownload={handleDownload}
    />
  );
};

export default ReceiptPage;