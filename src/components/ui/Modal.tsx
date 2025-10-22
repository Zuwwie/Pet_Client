import { useEffect } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    className?: string;
};

export default function Modal({ open, onClose, children, className }: ModalProps) {
    useEffect(() => {
        document.body.classList.toggle("has-modal", open);
        return () => document.body.classList.remove("has-modal");
    }, [open]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    if (!open) return null;

    return createPortal(
        <div
            className="modal-overlay"
            style={{ zIndex: 2147483647 }}        // ← броня проти будь-яких z-index
            onClick={onClose}
        >
            <div
                className={`modal ${className ?? ""}`}
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>,
        document.body
    );
}
