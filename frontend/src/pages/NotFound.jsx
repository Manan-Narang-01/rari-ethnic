import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";

export const NotFound = () => {
  return (
    <div className="bg-[#E8E3D7] min-h-[60vh] flex items-center">
      <Seo title="Page not found" noindex />
      <div className="container-x py-24 text-center">
        <span className="label-caps text-[#A0684E]">404</span>
        <h1 className="font-display text-5xl sm:text-6xl mt-2">Page not found</h1>
        <p className="mt-4 text-[#6E7B85] max-w-md mx-auto">
          The page you're looking for doesn't exist or may have moved.
        </p>
        <Link
          to="/"
          data-testid="notfound-home-link"
          className="inline-block mt-8 bg-[#A0684E] text-[#E8E3D7] px-8 py-3.5 rounded-sm uppercase tracking-widest text-sm hover:bg-[#8C4A3B] transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
