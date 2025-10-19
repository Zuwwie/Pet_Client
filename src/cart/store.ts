// src/cart/store.ts
import type { ICandy } from "../models/ICandy";
import type { IPackaging } from "../models/IPackaging";

/* -------------------- keys & events -------------------- */
const KEY = "cart:v1";                     // цукерки (fill)
const PACK_SEL_KEY = "cart:packaging";     // [legacy] одне вибране пакування
const PACK_COUNT_KEY = "cart:packaging:count"; // [legacy] лічильник пакунків
const PACK_CART_KEY = "pack:cart:v1";      // новий кошик пакувань (масив з qty)
const CART_EVENT = "cart:updated";

/* -------------------- money helpers -------------------- */
const toKop = (uah: number) => Math.round((uah || 0) * 100);

export const formatUAH = (kop: number) =>
    new Intl.NumberFormat("uk-UA", {
        style: "currency",
        currency: "UAH",
        maximumFractionDigits: 2,
    }).format((kop || 0) / 100);

/* -------------------- types -------------------- */
export type CartItem = {
    id: string;
    name: string;
    photoUrl?: string;
    qty: number;
    weightPerPieceG: number;
    piecePriceKop: number; // ціна за 1 шт (коп.)
};

export type PackCartItem = {
    packagingId: string;
    title: string;
    priceKop: number;
    qty: number;
    imageUrl?: string;
    capacityG?: number;
};

/* -------------------- utils -------------------- */
const notifyCart = () => {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(CART_EVENT));
    }
};

const readJSON = <T,>(key: string, fallback: T): T => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
};

const writeJSON = (key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
    notifyCart();
};

/* -------------------- price helpers -------------------- */
const piecePriceKop = (c: ICandy) => {
    const pcsPrice = (c as any).pricePerPcsSell;
    if (typeof pcsPrice === "number") return toKop(pcsPrice);

    const perKg = Number((c as any).pricePerKgSell ?? 0);
    const w = Number((c as any).weightPerPiece ?? (c as any).weightPerPieceG ?? 0);
    return toKop((perKg * w) / 1000);
};

/* -------------------- subscribe -------------------- */
export const onCartChange = (cb: () => void) => {
    const h = () => cb();
    const storageH = (e: StorageEvent) => {
        if ([KEY, PACK_SEL_KEY, PACK_COUNT_KEY, PACK_CART_KEY].includes(e.key || "")) cb();
    };

    if (typeof window !== "undefined") {
        window.addEventListener(CART_EVENT, h);
        window.addEventListener("storage", storageH);
    }

    return () => {
        if (typeof window !== "undefined") {
            window.removeEventListener(CART_EVENT, h);
            window.removeEventListener("storage", storageH);
        }
    };
};

/* =========================================================
   FILL CART (цукерки)
   ========================================================= */
const readFill = (): CartItem[] => readJSON<CartItem[]>(KEY, []);

export const getCart = () => readFill();
export const clearCart = () => writeJSON(KEY, []);

export const addToCart = (candy: ICandy, qty = 1) => {
    const items = readFill();
    const id = (candy as any)._id ?? (candy as any).id ?? String((candy as any).name);
    const idx = items.findIndex((i) => i.id === id);

    const base: Omit<CartItem, "qty"> = {
        id: String(id),
        name: (candy as any).name,
        photoUrl:
            (candy as any).photoUrl ??
            (candy as any).imageUrl ??
            (candy as any).photo ??
            (candy as any).img,
        weightPerPieceG: (candy as any).weightPerPiece ?? (candy as any).weightPerPieceG ?? 0,
        piecePriceKop: piecePriceKop(candy),
    };

    const n = Math.max(1, Math.floor(qty) || 1);
    if (idx >= 0) items[idx] = { ...items[idx], qty: items[idx].qty + n };
    else items.push({ ...base, qty: n });

    writeJSON(KEY, items);
};

export const setQty = (id: string, qty: number) => {
    const n = Math.max(1, Math.floor(qty) || 1);
    writeJSON(
        KEY,
        readFill().map((i) => (i.id === id ? { ...i, qty: n } : i))
    );
};

export const removeFromCart = (id: string) =>
    writeJSON(
        KEY,
        readFill().filter((i) => i.id !== id)
    );

export const getTotals = () => {
    const items = readFill();
    const itemsCount = items.reduce((s, i) => s + i.qty, 0);
    const totalWeightG = items.reduce((s, i) => s + i.qty * i.weightPerPieceG, 0);
    const subtotalKop = items.reduce((s, i) => s + i.qty * i.piecePriceKop, 0);
    return { items, itemsCount, totalWeightG, subtotalKop };
};

/* =========================================================
   [LEGACY] SINGLE SELECTED PACKAGING + COUNT
   (можеш не використовувати; лишено для сумісності)
   ========================================================= */
export const getPackaging = (): IPackaging | null => readJSON<IPackaging | null>(PACK_SEL_KEY, null);

export const setPackaging = (p: IPackaging | null) => {
    if (p) writeJSON(PACK_SEL_KEY, p);
    else {
        localStorage.removeItem(PACK_SEL_KEY);
        notifyCart();
    }
};

export const getPackagingKop = () => getPackaging()?.priceKop ?? 0;

export const getPackagesCount = (): number => {
    const n = readJSON<number>(PACK_COUNT_KEY, 1);
    return Math.max(1, Math.floor(n) || 1);
};

export const setPackagesCount = (count: number) => {
    const n = Math.max(1, Math.floor(count) || 1);
    writeJSON(PACK_COUNT_KEY, n);
};

export const incPackagesCount = () => setPackagesCount(getPackagesCount() + 1);
export const decPackagesCount = () => setPackagesCount(Math.max(1, getPackagesCount() - 1));

// ціна одного пакунка (fill + одне вибране пакування)
export const getPricePerPackageKop = () => getTotals().subtotalKop + getPackagingKop();

// загальна сума для legacy-моделі
export const calcGrandTotalKop = (packagesCount?: number) => {
    const count = packagesCount ?? getPackagesCount();
    return getPricePerPackageKop() * Math.max(1, Math.floor(count) || 1);
};

export const getGrandTotals = () => {
    const { totalWeightG, subtotalKop: fillKop } = getTotals();
    const packKop = getPackagingKop();
    const perPackKop = fillKop + packKop;
    const count = getPackagesCount();

    return {
        count,
        perPack: { fillKop, packagingKop: packKop, totalKop: perPackKop, weightG: totalWeightG },
        allPacks: {
            itemsCostAllPacksKop: fillKop * count,
            packagingCostAllPacksKop: packKop * count,
            grandTotalKop: perPackKop * count,
            totalWeightG: totalWeightG * count,
        },
    };
};

/* =========================================================
   NEW: MULTI PACKAGING CART (масив пакувань з qty)
   Використовуй це на сторінці пакувань зі степпером.
   ========================================================= */
export const getPackCart = (): PackCartItem[] => readJSON<PackCartItem[]>(PACK_CART_KEY, []);
export const clearPackCart = () => writeJSON(PACK_CART_KEY, []);

export const getPackQty = (packagingId: string) =>
    getPackCart().find((x) => x.packagingId === packagingId)?.qty ?? 0;

export function addPack(p: IPackaging, qty = 1) {
    const n = Math.max(1, Math.floor(qty) || 1);
    const cart = getPackCart();
    const id = String((p as any).id ?? (p as any)._id ?? p.name);
    const i = cart.findIndex((x) => x.packagingId === id);

    if (i >= 0) cart[i].qty += n;
    else
        cart.push({
            packagingId: id,
            title: p.name,
            priceKop: p.priceKop,
            qty: n,
            imageUrl: (p as any).imageUrl,
            capacityG: p.capacityG,
        });

    writeJSON(PACK_CART_KEY, cart);
}

export function setPackQty(packagingId: string, qty: number) {
    const n = Math.max(0, Math.floor(qty) || 0);
    const cart = getPackCart()
        .map((x) => (x.packagingId === packagingId ? { ...x, qty: n } : x))
        .filter((x) => x.qty > 0);

    writeJSON(PACK_CART_KEY, cart);
}

export function removePack(packagingId: string) {
    writeJSON(
        PACK_CART_KEY,
        getPackCart().filter((x) => x.packagingId !== packagingId)
    );
}

export const getTotalPacksCount = () => getPackCart().reduce((s, x) => s + x.qty, 0);

/* Підсумки для multi-pack кошика:
   сума = (ціна НАПОВНЕННЯ × сума qty усіх пакунків) + (сума цін пакувань × їх qty) */
export function getGrandTotalsPacks() {
    const fill = getTotals();
    const totalPacks = getTotalPacksCount();
    const itemsCostAllPacksKop = fill.subtotalKop * totalPacks;
    const packagingCostKop = getPackCart().reduce((s, x) => s + x.priceKop * x.qty, 0);
    const grandTotalKop = itemsCostAllPacksKop + packagingCostKop;
    const totalWeightG = fill.totalWeightG * totalPacks;

    return {
        totalPacks,
        perPack: { fillKop: fill.subtotalKop }, // ціна пакування різна — не усереднюємо
        allPacks: {
            itemsCostAllPacksKop,
            packagingCostKop,
            grandTotalKop,
            totalWeightG,
        },
    };
}
