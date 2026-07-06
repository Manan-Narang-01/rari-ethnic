import { buildWaLink } from "@/lib/api";
import { MessageCircle } from "lucide-react";

export const WhatsAppFloat = () => {
  return (
    <a
      data-testid="whatsapp-float-button"
      href={buildWaLink("Hi Rari Ethnic! I saw your website and wanted to ask about a piece.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 md:bottom-8 md:right-8 z-50 flex items-center gap-2 bg-[#25D366] text-white pl-4 pr-5 py-3 rounded-full shadow-[0_10px_30px_-8px_rgba(37,211,102,0.55)] hover:scale-105 active:scale-95 transition-transform duration-200"
    >
      <MessageCircle className="w-5 h-5" strokeWidth={2.2} />
      <span className="font-body font-medium text-sm hidden sm:inline">
        Chat on WhatsApp
      </span>
    </a>
  );
};
