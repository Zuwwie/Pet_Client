import { useEffect, useMemo, useState } from "react";
import type { ICandy } from "../../../models/ICandy";
import "./candy.css";
import { addToCart } from "@/cart/store.ts";

type Props = { candy: ICandy };

const uah = (n: number) =>
    new Intl.NumberFormat("uk-UA", {
        style: "currency",
        currency: "UAH",
        maximumFractionDigits: 2,
    }).format(n);

const showUAH = (n?: number) =>
    typeof n === "number" ? uah(n) : "—";

export default function OneCandyPage({ candy }: Props) {
    const [qty, setQty] = useState(1);

    // 1) фото з документа (пріоритезуємо photoUrl)
    const initialImg = useMemo<string | undefined>(() => {
        return (
            (candy as any).photoUrl ??
            (candy as any).imageUrl ??
            (candy as any).photo ??
            (candy as any).img
        );
    }, [candy]);

    // 2) керований src з фолбеком на локальний проксі, якщо прямий хотлінк блокується
    const [imgSrc, setImgSrc] = useState<string | undefined>(initialImg);
    const [imgFailed, setImgFailed] = useState(false);

    useEffect(() => {
        setImgSrc(initialImg);
        setImgFailed(false);
    }, [initialImg]);

    const handleImgError = () => {
        if (!imgSrc) return;
        const alreadyProxied = imgSrc.startsWith("/api/img?u=");
        const isExternal = /^https?:\/\//i.test(imgSrc);
        if (isExternal && !alreadyProxied) {
            setImgSrc(`/api/img?u=${encodeURIComponent(imgSrc)}`);
            return;
        }
        setImgFailed(true);
    };

    // Дані товару / похідні
    const available = (candy as any).isAvailable !== false;

    const weightG = (candy as any).weightPerPiece ?? (candy as any).weightPerPieceG; // г/шт
    const pricePerKg = (candy as any).pricePerKgSell as number | undefined;          // ₴/кг

    const derivedPerPiece =
        typeof weightG === "number" && typeof pricePerKg === "number"
            ? (pricePerKg * weightG) / 1000
            : undefined;

    const piecePrice =
        (candy as any).pricePerPcsSell ??
        derivedPerPiece ??
        0;

    const canAdd = available && piecePrice > 0;

    const totalWeight = typeof weightG === "number" ? qty * weightG : undefined;
    const totalPrice = qty * (piecePrice || 0);

    const decQty = () => setQty((q) => Math.max(1, q - 1));
    const incQty = () => setQty((q) => q + 1);

    return (
        <article className={`product-card ${available ? "" : "is-out"}`}>
            {/* МЕДІАБЛОК (фото зверху) */}
            <div className="product-media">
                {imgSrc && !imgFailed ? (
                    <img
                        src={imgSrc}
                        alt={candy.name}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={handleImgError}
                    />
                ) : (
                    // плейсхолдер
                    <svg className="ph" viewBox="0 0 24 24" aria-hidden>
                        <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" />
                        <circle cx="9" cy="11" r="2" fill="currentColor" />
                        <path d="M3 16l5-5 4 4 3-3 6 6" fill="none" stroke="currentColor" />
                    </svg>
                )}
            </div>

            {/* Хедер */}
            <div className="product-header">
                <h3 className="product-title">{candy.name}</h3>
                <span className="badge-pill">
          {available ? "В наявності" : "Немає"}
        </span>
            </div>

            {/* Характеристики */}
            <div className="kv">
                <div className="label">Категорія:</div>
                <div className="value">{(candy as any).category ?? "—"}</div>

                <div className="label">Вага однієї цукерки:</div>
                <div className="value">{typeof weightG === "number" ? `${weightG}г` : "—"}</div>

                <div className="label">Ціна за 1000г:</div>
                <div className="value">{showUAH(pricePerKg)}</div>
            </div>

            {/* Лічильник */}
            <div className="qty-row">
                <div className="qty-controls">
                    <button
                        type="button"
                        className="qty-btn"
                        onClick={decQty}
                        aria-label="Зменшити"
                        disabled={!available}
                    >
                        —
                    </button>
                    <input
                        className="qty-input"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        value={qty}
                        onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                        onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                        disabled={!available}
                    />
                    <button
                        type="button"
                        className="qty-btn"
                        onClick={incQty}
                        aria-label="Збільшити"
                        disabled={!available}
                    >
                        +
                    </button>
                </div>
            </div>

            {/* Підрахунок */}
            <div className="per-piece">
                {qty} шт.
                {typeof totalWeight === "number" ? ` = ${totalWeight}г` : ""} = {uah(totalPrice)}
            </div>

            {/* Кнопка */}
            <button
                className="add-btn"
                type="button"
                disabled={!canAdd}
                title={available ? "" : "Товару немає в наявності"}
                onClick={() => canAdd && addToCart(candy, qty)}
            >
                Додати в кошик
            </button>
        </article>
    );
}
