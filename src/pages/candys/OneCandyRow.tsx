import { useMemo, useState } from "react";
import type { ICandy } from "../../../models/ICandy";
import { addToCart } from "@/cart/store.ts";

type Props = { candy: ICandy };

const uah = (n: number) =>
    new Intl.NumberFormat("uk-UA", {
        style: "currency",
        currency: "UAH",
        maximumFractionDigits: 2,
    }).format(n);

export default function OneCandyRow({ candy }: Props) {
    const [qty, setQty] = useState(1);

    const img = useMemo<string | undefined>(() => {
        return (
            (candy as any).photoUrl ??
            (candy as any).imageUrl ??
            (candy as any).photo ??
            (candy as any).img
        );
    }, [candy]);

    const weightG =
        (candy as any).weightPerPiece ?? (candy as any).weightPerPieceG;

    const pricePerKgSell = (candy as any).pricePerKgSell;

    const pricePerPcsSell =
        (candy as any).pricePerPcsSell ??
        (typeof pricePerKgSell === "number" && typeof weightG === "number"
            ? (pricePerKgSell * weightG) / 1000
            : undefined);

    const total = typeof pricePerPcsSell === "number" ? pricePerPcsSell * qty : 0;
    const grams = typeof weightG === "number" ? weightG * qty : 0;

    const available = (candy as any).isAvailable !== false; // true → в наявності
    const canAdd = available && typeof pricePerPcsSell === "number";

    const dec = () => setQty((q) => Math.max(1, q - 1));
    const inc = () => setQty((q) => q + 1);

    return (
        <article className={`row-card ${available ? "" : "is-out"}`}>
            <div className="row-media">
                {img ? (
                    <img src={img} alt={candy.name} loading="lazy" />
                ) : (
                    <div className="row-ph">🍬</div>
                )}
            </div>

            <div className="row-col row-col--name">
                <div className="row-name">{candy.name}</div>
                <div className="row-sub">
                    {candy.category ?? "—"}
                    {typeof weightG === "number" ? <span className="dot">·</span> : null}
                    {typeof weightG === "number" ? `${weightG} г/шт` : ""}
                </div>
            </div>

            <div className="row-col row-col--pricekg">
                {typeof pricePerKgSell === "number" ? uah(pricePerKgSell) : "—"}
            </div>

            <div className="row-col row-col--pricepc">
                {typeof pricePerPcsSell === "number" ? uah(pricePerPcsSell) : "—"}
            </div>

            <div className="row-col row-col--qty">
                <div className="qty-controls">
                    <button
                        className="qty-btn"
                        onClick={dec}
                        aria-label="Зменшити"
                        disabled={!available}
                    >
                        —
                    </button>
                    <input
                        className="qty-input"
                        type="number"
                        min={1}
                        inputMode="numeric"
                        value={qty}
                        onChange={(e) =>
                            setQty(Math.max(1, Number(e.target.value) || 1))
                        }
                        onWheel={(e) =>
                            (e.currentTarget as HTMLInputElement).blur()
                        }
                        disabled={!available}
                    />
                    <button
                        className="qty-btn"
                        onClick={inc}
                        aria-label="Збільшити"
                        disabled={!available}
                    >
                        +
                    </button>
                </div>
            </div>

            <div className="row-col row-col--grams">
                {grams ? `${grams} г` : "—"}
            </div>

            <div className="row-col row-col--total">{uah(total)}</div>

            {/* Колонку "Наявність" забрано. В дії показуємо кнопку або текст */}
            <div className="row-col row-col--act">
                {available ? (
                    <button
                        className="add-btn"
                        style={{ width: "100%" }}
                        type="button"
                        disabled={!canAdd}
                        onClick={() => canAdd && addToCart(candy, qty)}
                    >
                        Додати
                    </button>
                ) : (
                    <span className="na-label">немає в наявності</span>
                )}
            </div>
        </article>
    );
}
