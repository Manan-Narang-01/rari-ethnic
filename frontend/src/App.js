import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Account from "@/pages/Account";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminProductForm from "@/pages/admin/AdminProductForm";
import AdminCategories from "@/pages/admin/AdminCategories";
import AdminCategoryForm from "@/pages/admin/AdminCategoryForm";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminCampaigns from "@/pages/admin/AdminCampaigns";
import AdminCampaignForm from "@/pages/admin/AdminCampaignForm";

function App() {
  return (
    <div className="App">
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
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/account" element={<Account />} />
                </Route>

                {/* Admin — single login page lives at /login; this is a soft
                    redirect for anyone with the old URL bookmarked. */}
                <Route path="/admin/login" element={<Navigate to="/login" replace />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminProducts />} />
                  <Route path="products/new" element={<AdminProductForm mode="create" />} />
                  <Route path="products/:id/edit" element={<AdminProductForm mode="edit" />} />
                  <Route path="categories" element={<AdminCategories />} />
                  <Route path="categories/new" element={<AdminCategoryForm mode="create" />} />
                  <Route path="categories/:id/edit" element={<AdminCategoryForm mode="edit" />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route path="campaigns" element={<AdminCampaigns />} />
                  <Route path="campaigns/new" element={<AdminCampaignForm mode="create" />} />
                  <Route path="campaigns/:id/edit" element={<AdminCampaignForm mode="edit" />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </CartProvider>
        </SiteProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
