import { Component } from "react";

// Top-level safety net: without this, ANY uncaught render error anywhere in
// the tree (a malformed campaign section saved outside the admin builder UI,
// a third-party script, a future bug) unmounts the entire app to a blank
// white screen with no way back except a manual URL edit. React only offers
// this via a class component (no hook equivalent for componentDidCatch).
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Unhandled render error:", error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#E8E3D7] px-6">
          <div className="text-center max-w-sm">
            <p className="label-caps text-[#A0684E]">Something went wrong</p>
            <h1 className="font-display text-3xl mt-2 text-[#2A2E30]">
              This page hit a snag
            </h1>
            <p className="mt-3 text-sm text-[#6E7B85]">
              Please try reloading the page. If this keeps happening, let us know on WhatsApp.
            </p>
            <button
              onClick={() => window.location.assign("/")}
              className="inline-block mt-6 bg-[#A0684E] text-[#E8E3D7] px-8 py-3.5 rounded-sm uppercase tracking-widest text-sm hover:bg-[#8C4A3B] transition-colors"
            >
              Back to home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
