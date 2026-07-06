import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { WhatsAppFloat } from "./WhatsAppFloat";
import { CartDrawer } from "./CartDrawer";
import { Toaster } from "sonner";

export const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF6F0]">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppFloat />
      <CartDrawer />
      <Toaster
        position="bottom-left"
        theme="light"
        toastOptions={{
          style: {
            background: "#FAF6F0",
            border: "1px solid rgba(43,33,30,0.12)",
            color: "#2B211E",
            fontFamily: "Jost, sans-serif",
          },
        }}
      />
    </div>
  );
};
