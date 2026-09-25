import "@/App.css";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { SiteProvider } from "@/context/SiteContext";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { Layout } from "@/components/Layout";
import Home from "@/pages/Home";
import Category from "@/pages/Category";
import ProductDetail from "@/pages/ProductDetail";
import NavratriLanding from "@/pages/NavratriLanding";
import About from "@/pages/About";
import SizeGuide from "@/pages/SizeGuide";
import Contact from "@/pages/Contact";
import Checkout from "@/pages/Checkout";
import OrderConfirmation from "@/pages/OrderConfirmation";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import VerifyOtp from "@/pages/VerifyOtp";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Account from "@/pages/Account";
import NotFound from "@/pages/NotFound";

// Lazy-loaded as one chunk: the admin panel (drag-and-drop page builder,
// image cropper) pulls in @dnd-kit and react-easy-crop, which the ~95% of
// visitors who never touch /admin shouldn't have to download. React Router
// only renders these once a matching /admin/* route is actually visited.
const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout"));
const AdminProducts = lazy(() => import("@/pages/admin/AdminProducts"));
const AdminProductForm = lazy(() => import("@/pages/admin/AdminProductForm"));
const AdminCategories = lazy(() => import("@/pages/admin/AdminCategories"));
const AdminCategoryForm = lazy(() => import("@/pages/admin/AdminCategoryForm"));
const AdminOrders = lazy(() => import("@/pages/admin/AdminOrders"));
const AdminExchanges = lazy(() => import("@/pages/admin/AdminExchanges"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminCampaigns = lazy(() => import("@/pages/admin/AdminCampaigns"));
const AdminCampaignForm = lazy(() => import("@/pages/admin/AdminCampaignForm"));
const AdminCampaignLogs = lazy(() => import("@/pages/admin/AdminCampaignLogs"));
const AdminIntegrations = lazy(() => import("@/pages/admin/AdminIntegrations"));

const AdminFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#E8E3D7] text-[#6E7B85]">
    Loading…
  </div>
);

function App() {
  return (
    <div className="App">
      <HelmetProvider>
      <AuthProvider>
        <SiteProvider>
          <CartProvider>
            <BrowserRouter>
              <Routes>
                {/* Storefront */}
                <Route element={<Layout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/shop/:category" element={<Category />} />
                  <Route path="/product/:slug" element={<ProductDetail />} />
                  <Route path="/navratri" element={<NavratriLanding />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/size-guide" element={<SizeGuide />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/order/:orderNumber" element={<OrderConfirmation />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/verify-otp" element={<VerifyOtp />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/account" element={<Account />} />
                  <Route path="*" element={<NotFound />} />
                </Route>

                {/* Admin — single login page lives at /login; this is a soft
                    redirect for anyone with the old URL bookmarked. */}
                <Route path="/admin/login" element={<Navigate to="/login" replace />} />
                <Route
                  path="/admin"
                  element={
                    <Suspense fallback={<AdminFallback />}>
                      <AdminLayout />
                    </Suspense>
                  }
                >
                  <Route index element={<AdminProducts />} />
                  <Route path="products/new" element={<AdminProductForm mode="create" />} />
                  <Route path="products/:id/edit" element={<AdminProductForm mode="edit" />} />
                  <Route path="categories" element={<AdminCategories />} />
                  <Route path="categories/new" element={<AdminCategoryForm mode="create" />} />
                  <Route path="categories/:id/edit" element={<AdminCategoryForm mode="edit" />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="exchanges" element={<AdminExchanges />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route path="campaigns" element={<AdminCampaigns />} />
                  <Route path="campaigns/new" element={<AdminCampaignForm mode="create" />} />
                  <Route path="campaigns/logs" element={<AdminCampaignLogs />} />
                  <Route path="campaigns/:id/edit" element={<AdminCampaignForm mode="edit" />} />
                  <Route path="integrations" element={<AdminIntegrations />} />
                  <Route path="*" element={<Navigate to="/admin" replace />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </CartProvider>
        </SiteProvider>
      </AuthProvider>
      </HelmetProvider>
    </div>
  );
}

export default App;
