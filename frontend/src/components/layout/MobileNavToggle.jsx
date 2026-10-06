import React, { useEffect } from "react";

const OPEN_CLASS = "portal-nav-open";

/**
 * Hamburger + backdrop that turns a `.portal-sidebar` into an off-canvas
 * drawer on small screens. Hidden on desktop via CSS (index.css).
 */
export default function MobileNavToggle() {
  useEffect(() => {
    const close = () => document.body.classList.remove(OPEN_CLASS);
    const onClick = (e) => {
      // Close the drawer after picking a destination inside the sidebar.
      if (e.target.closest(".portal-sidebar button, .portal-sidebar a")) close();
    };
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      close();
    };
  }, []);

  return (
    <>
      <button
        type="button"
        className="portal-burger"
        aria-label="Open navigation menu"
        onClick={() => document.body.classList.toggle(OPEN_CLASS)}
      >
        <span />
        <span />
        <span />
      </button>
      <div
        className="portal-backdrop"
        onClick={() => document.body.classList.remove(OPEN_CLASS)}
      />
    </>
  );
}
