import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { WhatsAppFloat } from "./WhatsAppFloat";
import { CartDrawer } from "./CartDrawer";
import { Toaster } from "sonner";

export const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#E8E3D7]">
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
            background: "#E8E3D7",
            border: "1px solid rgba(43,33,30,0.12)",
            color: "#2A2E30",
            fontFamily: "Jost, sans-serif",
          },
        }}
      />
    </div>
  );
};
