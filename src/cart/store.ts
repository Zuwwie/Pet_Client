// src/cart/store.ts
import type { ICandy } from "../models/ICandy";
import type { IPackaging } from "../models/IPackaging";

/* -------------------- keys & events -------------------- */
const KEY = "cart:v2";
const PACK_SEL_KEY = "cart:packaging";
const PACK_COUNT_KEY = "cart:packaging:count";
const PACK_CART_KEY = "pack:cart:v1";
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
    piecePriceKop: number;          // ціна «за 1 шт» (для вагових рахуємо з ціни/кг)
    pricingMode: "pcs" | "weight";  // визначається прапорцем «Вагові»
};

export type PackCartItem = {
    packagingId: string;
    title: string;
    priceKop: number;
    qty: number;
    imageUrl?: string;
    capacityG?: number;
};

/** Payload для БД (цукерки) */
export type OrderCandyPayload = {
    candyId: string;
    qtyPieces: number;           // для поштучних
    weightG: number;             // для вагових
    pricingMode: "pcs" | "weight";
    piecePriceKop: number;       // інформаційно
};

/** Payload для БД (пакування) */
export type OrderPackPayload = {
    packagingId: string;
    qty: number;
};

/* -------------------- utils (safe storage + notify) -------------------- */
const canUseLS = () =>
    typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const notifyCart = (): void => {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(CART_EVENT));
    }
};

const readJSON = <T,>(key: string, fallback: T): T => {
    if (!canUseLS()) return fallback;
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
};

const writeJSON = (key: string, value: unknown): void => {
    if (!canUseLS()) return;
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* ignore quota/serialization errors */
    }
    notifyCart();
};

/* -------------------- helpers: вагові/поштучні -------------------- */
/** Зіставляємо «Вагові» з БД/Excel у boolean. Підтримує різні назви/значення. */
const isWeightedFlag = (c: ICandy): boolean => {
    const any = c as any;
    const raw =
        any.isWeighted ??
        any.isWeight ??
        any.weighted ??
        any.isWeightBased ??
        any.isKgBased ??
        any["Вагові"] ??
        any["вагові"];

    if (typeof raw === "boolean") return raw;
    if (typeof raw === "number") return raw === 1;
    if (typeof raw === "string") return raw.trim() === "1" || raw.trim().toLowerCase() === "true";
    return false;
};

/* -------------------- candy price calculation -------------------- */
const calculatePiecePriceKop = (candy: ICandy): number => {
    // для UI/підсумків завжди хочемо мати «ціна за 1 шт»
    // 1) якщо задано pricePerPcsSell — беремо її
    // 2) інакше якщо є pricePerKgSell та weightPerPiece — рахуємо з кг
    // 3) інакше 0
    const hasPcs = candy.pricePerPcsSell != null && candy.pricePerPcsSell > 0;
    if (hasPcs) return toKop(candy.pricePerPcsSell!);

    const hasKg =
        candy.pricePerKgSell != null &&
        candy.pricePerKgSell > 0 &&
        (candy as any).weightPerPiece != null &&
        (candy as any).weightPerPiece > 0;

    if (hasKg) {
        const perPieceUAH = (candy.pricePerKgSell! * (candy as any).weightPerPiece!) / 1000;
        return toKop(perPieceUAH);
    }
    return 0;
};

/** Головне правило: спершу дивимось на прапорець «Вагові» */
const determinePricingMode = (candy: ICandy): "pcs" | "weight" => {
    if (isWeightedFlag(candy)) return "weight";
    // якщо прапорця немає — fallback по цінах
    const hasPiecePrice =
        candy.pricePerPcsSell !== undefined &&
        candy.pricePerPcsSell !== null &&
        candy.pricePerPcsSell > 0;
    if (hasPiecePrice) return "pcs";

    const hasKgPrice = candy.pricePerKgSell != null && candy.pricePerKgSell > 0;
    return hasKgPrice ? "weight" : "pcs";
};

/* -------------------- subscribe -------------------- */
export const onCartChange = (cb: () => void) => {
    const h = () => cb();
    const storageH = (e: StorageEvent) => {
        if ([KEY, PACK_SEL_KEY, PACK_COUNT_KEY, PACK_CART_KEY].includes(e.key ?? "")) cb();
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
export const getCart = (): CartItem[] => readFill();

export const clearCart = (): void => {
    console.log("🧹 Очищення кошика з цукерками");
    writeJSON(KEY, []);
};

export const addToCart = (candy: ICandy, qty = 1): void => {
    console.log("🛒 Додавання цукерки до кошика:", candy.name, { qty, candy });

    const items = readFill();
    const id = String((candy as any)._id ?? (candy as any).id ?? candy.name);
    const existingIndex = items.findIndex((item) => item.id === id);

    // Тип ціноутворення й "ціна за 1 шт"
    const pricingMode = determinePricingMode(candy);
    const piecePriceKop = calculatePiecePriceKop(candy);

    const baseItem: Omit<CartItem, "qty"> = {
        id,
        name: (candy as any).name,
        photoUrl: (candy as any).photoUrl ?? (candy as any).imageUrl,
        weightPerPieceG: Number((candy as any).weightPerPiece ?? 0),
        piecePriceKop,
        pricingMode,
    };

    const quantity = Math.max(1, Math.floor(qty) || 1);

    if (existingIndex >= 0) {
        items[existingIndex] = {
            ...items[existingIndex],
            qty: items[existingIndex].qty + quantity,
        };
    } else {
        items.push({ ...baseItem, qty: quantity });
    }
    writeJSON(KEY, items);
};

export const setQty = (id: string, qty: number): void => {
    const quantity = Math.max(1, Math.floor(qty) || 1);
    const items = readFill().map((item) => (item.id === id ? { ...item, qty: quantity } : item));
    writeJSON(KEY, items);
};

export const removeFromCart = (id: string): void => {
    const items = readFill().filter((item) => item.id !== id);
    writeJSON(KEY, items);
};

export const incInCart = (id: string, delta = 1): void => {
    const increment = Math.max(1, Math.floor(delta) || 1);
    const items = readFill();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return;
    items[idx].qty += increment;
    writeJSON(KEY, items);
};

export const decFromCart = (id: string, delta = 1): void => {
    const decrement = Math.max(1, Math.floor(delta) || 1);
    const items = readFill()
        .map((item) => (item.id === id ? { ...item, qty: item.qty - decrement } : item))
        .filter((item) => item.qty > 0);
    writeJSON(KEY, items);
};

export const getTotals = () => {
    const items = readFill();
    const itemsCount = items.reduce((sum, item) => sum + item.qty, 0);
    const totalWeightG = items.reduce((sum, item) => sum + item.qty * item.weightPerPieceG, 0);
    const subtotalKop = items.reduce((sum, item) => sum + item.qty * item.piecePriceKop, 0);

    console.log("📊 Підсумки кошика:", {
        itemsCount,
        totalWeightG,
        subtotalKop: formatUAH(subtotalKop),
        items: items.map((item) => ({
            name: item.name,
            qty: item.qty,
            price: item.piecePriceKop,
            mode: item.pricingMode,
            total: item.qty * item.piecePriceKop,
        })),
    });

    return { items, itemsCount, totalWeightG, subtotalKop };
};

// 🆕 До БД: завжди повертаємо і qtyPieces, і weightG (бекенд бере те, що відповідає mode)
export const mapCartToOrderCandies = (): OrderCandyPayload[] =>
    readFill().map((it) => ({
        candyId: it.id,
        qtyPieces: it.qty,
        weightG: Math.round((it.weightPerPieceG || 0) * it.qty) || 0,
        pricingMode: it.pricingMode,
        piecePriceKop: it.piecePriceKop,
    }));

export const mapPackCartToOrderPacks = (): OrderPackPayload[] =>
    getPackCart().map((p) => ({ packagingId: p.packagingId, qty: p.qty }));

// Функція для дебагу
export const debugCart = () => {
    const items = readFill();
    const totals = getTotals();
    console.log("🐛 ДЕБАГ КОШИКА:", {
        items,
        totals,
        localStorage: canUseLS() ? window.localStorage.getItem(KEY) : "localStorage недоступний",
    });
    return { items, totals };
};

/* =========================================================
   MULTI PACKAGING CART (масив пакувань з qty)
   ========================================================= */
export const getPackCart = (): PackCartItem[] => readJSON<PackCartItem[]>(PACK_CART_KEY, []);

export const clearPackCart = (): void => {
    console.log("🧹 Очищення кошика з пакуваннями");
    writeJSON(PACK_CART_KEY, []);
};

export const getPackQty = (packagingId: string): number =>
    getPackCart().find((item) => item.packagingId === packagingId)?.qty ?? 0;

export const addPack = (packaging: IPackaging, qty = 1): void => {
    const quantity = Math.max(1, Math.floor(qty) || 1);
    const cart = getPackCart();
    const packagingId = String((packaging as any)._id ?? (packaging as any).id ?? packaging.name);

    const existingIndex = cart.findIndex((item) => item.packagingId === packagingId);

    if (existingIndex >= 0) {
        cart[existingIndex].qty += quantity;
    } else {
        cart.push({
            packagingId,
            title: (packaging as any).name,
            priceKop: (packaging as any).priceKop,
            qty: quantity,
            imageUrl: (packaging as any).imageUrl,
            capacityG: (packaging as any).capacityG,
        });
    }
    writeJSON(PACK_CART_KEY, cart);
};

export const setPackQty = (packagingId: string, qty: number): void => {
    const quantity = Math.max(0, Math.floor(qty) || 0);
    const cart = getPackCart()
        .map((item) => (item.packagingId === packagingId ? { ...item, qty: quantity } : item))
        .filter((item) => item.qty > 0);
    writeJSON(PACK_CART_KEY, cart);
};

export const removePack = (packagingId: string): void => {
    const cart = getPackCart().filter((item) => item.packagingId !== packagingId);
    writeJSON(PACK_CART_KEY, cart);
};

export const incPack = (packagingId: string, delta = 1): void => {
    const increment = Math.max(1, Math.floor(delta) || 1);
    const cart = getPackCart();
    const idx = cart.findIndex((item) => item.packagingId === packagingId);
    if (idx === -1) return;
    cart[idx].qty += increment;
    writeJSON(PACK_CART_KEY, cart);
};

export const decPack = (packagingId: string, delta = 1): void => {
    const decrement = Math.max(1, Math.floor(delta) || 1);
    const cart = getPackCart()
        .map((item) => (item.packagingId === packagingId ? { ...item, qty: item.qty - decrement } : item))
        .filter((item) => item.qty > 0);
    writeJSON(PACK_CART_KEY, cart);
};

export const getTotalPacksCount = (): number =>
    getPackCart().reduce((sum, item) => sum + item.qty, 0);

export const getGrandTotalsPacks = () => {
    const fill = getTotals();

    // якщо пакувань 0 — мінімум 1 пакунок (без коробки)
    const totalPacksRaw = getTotalPacksCount();
    const totalPacks = Math.max(1, totalPacksRaw);

    const itemsCostAllPacksKop = fill.subtotalKop * totalPacks;
    const packagingCostKop = getPackCart().reduce((sum, item) => sum + item.priceKop * item.qty, 0);
    const grandTotalKop = itemsCostAllPacksKop + packagingCostKop;
    const totalWeightG = fill.totalWeightG * totalPacks;

    return {
        totalPacks,
        totalPacksRaw,
        perPack: { fillKop: fill.subtotalKop },
        allPacks: { itemsCostAllPacksKop, packagingCostKop, grandTotalKop, totalWeightG },
    };
};

/* =========================================================
   Допоміжні функції
   ========================================================= */
export const clearAllCarts = (): void => {
    console.log("🔥 Повне очищення всіх кошиків");
    if (canUseLS()) {
        window.localStorage.removeItem(KEY);
        window.localStorage.removeItem(PACK_SEL_KEY);
        window.localStorage.removeItem(PACK_COUNT_KEY);
        window.localStorage.removeItem(PACK_CART_KEY);
    }
    notifyCart();
};

export const fixCartData = (): void => {
    const items = readFill();
    let fixed = false;

    const fixedItems = items.map((item) => {
        if (item.qty < 1) {
            fixed = true;
            return { ...item, qty: 1 };
        }
        return item;
    });

    if (fixed) {
        writeJSON(KEY, fixedItems);
        console.log("✅ Дані кошика виправлено");
    }
};

export const migrateV1ToV2 = (): void => {
    if (!canUseLS()) return;
    try {
        const v1Data = window.localStorage.getItem("cart:v1");
        if (v1Data) {
            console.log("🔄 Міграція даних з v1 на v2");
            const v1Items = JSON.parse(v1Data);
            const v2Items = v1Items.map((item: any) => ({
                ...item,
                // якщо в старих даних є прапорець — поважаємо його, інакше по наявності piecePriceKop
                pricingMode:
                    item?.isWeighted === 1 || item?.isWeighted === true
                        ? "weight"
                        : item?.piecePriceKop > 0
                            ? "pcs"
                            : "weight",
            }));
            window.localStorage.setItem(KEY, JSON.stringify(v2Items));
            console.log("✅ Міграція завершена");
        }
    } catch (error) {
        console.warn("❌ Помилка міграції даних кошика:", error);
    }
};

// Ініціалізація
if (typeof window !== "undefined") {
    migrateV1ToV2();
    fixCartData();
}

// Експортуємо функцію для примусового виправлення даних
export const forceFixCart = fixCartData;
