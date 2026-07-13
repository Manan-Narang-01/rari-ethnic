import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminProductForm from "@/pages/admin/AdminProductForm";
import AdminOrders from "@/pages/admin/AdminOrders";

function App() {
  return (
    <div className="App">
      <AuthProvider>
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
              </Route>

              {/* Admin */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminProducts />} />
                <Route path="products/new" element={<AdminProductForm mode="create" />} />
                <Route path="products/:id/edit" element={<AdminProductForm mode="edit" />} />
                <Route path="orders" element={<AdminOrders />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
