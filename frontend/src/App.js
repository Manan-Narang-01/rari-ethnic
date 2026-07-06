import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
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

function App() {
  return (
    <div className="App">
      <CartProvider>
        <BrowserRouter>
          <Routes>
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
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </div>
  );
}

export default App;
