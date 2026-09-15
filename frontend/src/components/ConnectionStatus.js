import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Wifi, WifiOff } from "lucide-react";

export default function ConnectionStatus() {
  const reduceMotion = useReducedMotion();
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [restored, setRestored] = useState(false);
  const wasOffline = useRef(!online);

  useEffect(() => {
    let timer;
    const handleOffline = () => {
      clearTimeout(timer);
      wasOffline.current = true;
      setRestored(false);
      setOnline(false);
    };
    const handleOnline = () => {
      setOnline(true);
      if (wasOffline.current) {
        setRestored(true);
        wasOffline.current = false;
        timer = window.setTimeout(() => setRestored(false), 2600);
      }
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const visible = !online || restored;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[120] px-4 w-full max-w-sm pointer-events-none"
          role="status"
          aria-live="polite"
        >
          <div className={`mx-auto flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold shadow-xl backdrop-blur-xl ${
            online
              ? "border-emerald-200 bg-emerald-50/95 text-emerald-800"
              : "border-amber-200 bg-amber-50/95 text-amber-900"
          }`}>
            {online ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {online ? "Conexão restabelecida" : "Sem conexão. Verifique sua internet."}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
