import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

// Drop-in replacement for <input type="password" /> with a show/hide toggle.
// Accepts the same props as a plain input (value, onChange, data-testid, etc.).
export const PasswordInput = ({ className = "", ...props }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`${className} pr-8`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-[#6E7B85] hover:text-[#A0684E]"
      >
        {visible ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
};

export default PasswordInput;
