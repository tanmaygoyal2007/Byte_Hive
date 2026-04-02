import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

function VendorPortalPage() {
  return (
    <div>
      <Navbar />
      <main style={{ width: "min(100%, 1520px)", margin: "0 auto", padding: "120px 32px 72px" }}>
        <h1>This is vendors page</h1>
      </main>
      <Footer />
    </div>
  );
}

export default VendorPortalPage;
