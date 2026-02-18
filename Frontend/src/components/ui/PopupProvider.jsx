import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, X, XCircle } from "lucide-react";

const PopupContext = createContext(null);

const TYPE_THEME = {
  success: {
    ring: "ring-emerald-200",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-700",
    title: "text-emerald-800",
    body: "text-emerald-700",
  },
  error: {
    ring: "ring-rose-200",
    iconBg: "bg-rose-100",
    iconColor: "text-rose-700",
    title: "text-rose-800",
    body: "text-rose-700",
  },
  info: {
    ring: "ring-sky-200",
    iconBg: "bg-sky-100",
    iconColor: "text-sky-700",
    title: "text-sky-800",
    body: "text-sky-700",
  },
};

function PopupIcon({ type, className }) {
  if (type === "success") return <CheckCircle2 size={20} className={className} />;
  if (type === "error") return <XCircle size={20} className={className} />;
  return <CircleAlert size={20} className={className} />;
}

export function PopupProvider({ children }) {
  const [items, setItems] = useState([]);
  const timerMap = useRef(new Map());

  const closePopup = useCallback((id) => {
    const timer = timerMap.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timerMap.current.delete(id);
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const showPopup = useCallback((message, options = {}) => {
    const type = options.type || "info";
    const title =
      options.title ||
      (type === "success" ? "Success" : type === "error" ? "Error" : "Notice");
    const duration = Number(options.duration ?? 4200);

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const item = { id, type, title, message: String(message || "").trim() || "Notification" };
    setItems((prev) => [item, ...prev].slice(0, 4));

    const timer = setTimeout(() => closePopup(id), duration);
    timerMap.current.set(id, timer);
  }, [closePopup]);

  const value = useMemo(() => ({ showPopup, closePopup }), [showPopup, closePopup]);

  return (
    <PopupContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-24 z-[220] flex w-[min(92vw,24rem)] flex-col gap-3">
        {items.map((item) => {
          const theme = TYPE_THEME[item.type] || TYPE_THEME.info;
          return (
            <div
              key={item.id}
              className={`pointer-events-auto rounded-2xl border border-white/70 bg-white/95 p-4 shadow-2xl ring-1 backdrop-blur ${theme.ring}`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full ${theme.iconBg}`}>
                  <PopupIcon type={item.type} className={theme.iconColor} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-black uppercase tracking-widest ${theme.title}`}>{item.title}</p>
                  <p className={`mt-1 text-sm font-semibold ${theme.body}`}>{item.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => closePopup(item.id)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </PopupContext.Provider>
  );
}

export function usePopup() {
  const ctx = useContext(PopupContext);
  if (!ctx) {
    throw new Error("usePopup must be used inside PopupProvider");
  }
  return ctx;
}
