import { motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";

// Subtle fade + slide transition on every route change, for a smoother
// native push/pop feel. Keyed by pathname so the wrapper remounts and replays
// the enter animation when the route changes.
export default function AnimatedOutlet() {
  const location = useLocation();
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <Outlet />
    </motion.div>
  );
}