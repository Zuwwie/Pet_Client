// cart/store.ts
import type { ICandy } from "../models/ICandy";

const KEY = "cart:v1";
const CART_EVENT = "cart:updated";

const toKop = (uah: number) => Math.round(uah * 100);

export const formatUAH = (kop: number) =>
    new Intl.NumberFormat("uk-UA", {
        style: "currency",
        currency: "UAH",
        maximumFractionDigits: 2,
    }).format(kop / 100);

export type CartItem = {
    id: string;
    name: string;
    photoUrl?: string;
    qty: number;
    weightPerPieceG: number;
    piecePriceKop: number; // ціна за 1 шт у копійках
};

const piecePriceKop = (c: ICandy) =>
    typeof (c as any).pricePerPcsSell === "number"
        ? toKop((c as any).pricePerPcsSell)
        : toKop(((c as any).pricePerKgSell * (c as any).weightPerPiece) / 1000);

// ---- helpers: storage + events ----
const safeRead = (): CartItem[] => {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
        return [];
    }
};

const notifyCart = () => {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(CART_EVENT));
    }
};

const write = (items: CartItem[]) => {
    try {
        localStorage.setItem(KEY, JSON.stringify(items));
    } finally {
        notifyCart();
    }
};

// ---- API ----
export const onCartChange = (cb: () => void) => {
    const h = () => cb();
    const storageH = (e: StorageEvent) => {
        if (e.key === KEY) cb();
    };

    if (typeof window !== "undefined") {
        window.addEventListener(CART_EVENT, h);
        window.addEventListener("storage", storageH);
    }

    // повертаємо відписку
    return () => {
        if (typeof window !== "undefined") {
            window.removeEventListener(CART_EVENT, h);
            window.removeEventListener("storage", storageH);
        }
    };
};

export const getCart = () => safeRead();
export const clearCart = () => write([]);

export const addToCart = (candy: ICandy, qty = 1) => {
    const items = safeRead();
    const id =
        (candy as any)._id ?? (candy as any).id ?? String((candy as any).name);
    const idx = items.findIndex((i) => i.id === id);

    const base: Omit<CartItem, "qty"> = {
        id,
        name: (candy as any).name,
        photoUrl: (candy as any).photoUrl,
        weightPerPieceG: (candy as any).weightPerPiece,
        piecePriceKop: piecePriceKop(candy),
    };

    const howMany = Math.max(1, Math.floor(qty) || 1);

    if (idx >= 0) {
        items[idx] = { ...items[idx], qty: items[idx].qty + howMany };
    } else {
        items.push({ ...base, qty: howMany });
    }

    write(items);
};

export const setQty = (id: string, qty: number) => {
    const howMany = Math.max(1, Math.floor(qty) || 1);
    const items = safeRead().map((i) =>
        i.id === id ? { ...i, qty: howMany } : i
    );
    write(items);
};

export const removeFromCart = (id: string) =>
    write(safeRead().filter((i) => i.id !== id));

export const getTotals = () => {
    const items = safeRead();
    const itemsCount = items.reduce((s, i) => s + i.qty, 0);
    const totalWeightG = items.reduce(
        (s, i) => s + i.qty * i.weightPerPieceG,
        0
    );
    const subtotalKop = items.reduce(
        (s, i) => s + i.qty * i.piecePriceKop,
        0
    );
    return { items, itemsCount, totalWeightG, subtotalKop };
};
