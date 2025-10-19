import { useMemo } from "react";
import type { ICandy } from "../../../models/ICandy";
import "./admin.css";

type Props = { candy: ICandy };

const uah = (n?: number) =>
    typeof n === "number"
        ? new Intl.NumberFormat("uk-UA", { style: "currency", currency: "UAH", maximumFractionDigits: 2 }).format(n)
        : "—";

const num = (v: unknown): number | undefined => {
    if (v === null || v === undefined) return undefined;
    const n = typeof v === "string" ? parseFloat(v) : (v as number);
    return Number.isFinite(n) ? n : undefined;
};

export default function OneCandyAdminPage({ candy }: Props) {
    const category = (candy as any).category as string | undefined;
    const isAvailable = (candy as any).isAvailable !== false;

    const photoUrl = useMemo<string | undefined>(() => {
        return (candy as any).photoUrl ?? (candy as any).imageUrl ?? (candy as any).photo ?? (candy as any).img;
    }, [candy]);

    const weightPerPieceG = num((candy as any).weightPerPiece ?? (candy as any).weightPerPieceG);
    const piecesPerKgRaw  = num((candy as any).piecesPerKg);

    const pricePerKgBuy   = num((candy as any).pricePerKgBuy);
    const pricePerKgSell  = num((candy as any).pricePerKgSell);

    const pricePerPcsBuyRaw  = num((candy as any).pricePerPcsBuy);
    const pricePerPcsSellRaw = num((candy as any).pricePerPcsSell);
    const piecePriceKop      = num((candy as any).piecePriceKop); // якщо десь зберігаєш у копійках

    const piecesPerKg =
        typeof piecesPerKgRaw === "number"
            ? Math.round(piecesPerKgRaw)
            : typeof weightPerPieceG === "number" && weightPerPieceG > 0
                ? Math.round(1000 / weightPerPieceG)
                : undefined;

    const pricePerPcsSell =
        pricePerPcsSellRaw ??
        (typeof piecePriceKop === "number" ? piecePriceKop / 100 : undefined) ??
        (typeof pricePerKgSell === "number" && typeof weightPerPieceG === "number"
            ? (pricePerKgSell * weightPerPieceG) / 1000
            : undefined);

    const pricePerPcsBuy =
        pricePerPcsBuyRaw ??
        (typeof pricePerKgBuy === "number" && typeof weightPerPieceG === "number"
            ? (pricePerKgBuy * weightPerPieceG) / 1000
            : undefined);

    return (
        <article className="admin-candy card">
            <div className="admin-candy__media">
                {photoUrl ? <img src={photoUrl} alt={candy.name} loading="lazy" /> : <div className="admin-candy__ph">🍬</div>}
                <div className="admin-candy__badges">
                    {category ? <span className="badge">{category}</span> : null}
                    <span className={"badge " + (isAvailable ? "badge--ok" : "badge--muted")}>
            {isAvailable ? "В наявності" : "Немає"}
          </span>
                </div>
            </div>

            <div className="admin-candy__body">
                <h3 className="admin-candy__title">
                    {candy.name} <small className="muted">({(candy as any)._id})</small>
                </h3>

                <div className="admin-grid-2">
                    <div className="kv-label">Вага 1 шт</div>
                    <div className="kv-value">{typeof weightPerPieceG === "number" ? `${weightPerPieceG} г` : "—"}</div>

                    <div className="kv-label">Штук у 1 кг</div>
                    <div className="kv-value">{typeof piecesPerKg === "number" ? piecesPerKg : "—"}</div>

                    <div className="kv-label">Ціна за 1000 г (вхідна)</div>
                    <div className="kv-value">{uah(pricePerKgBuy)}</div>

                    <div className="kv-label">Ціна за 1000 г (продаж)</div>
                    <div className="kv-value">{uah(pricePerKgSell)}</div>

                    <div className="kv-label">Ціна за 1 шт (вхідна)</div>
                    <div className="kv-value">{uah(pricePerPcsBuy)}</div>

                    <div className="kv-label">Ціна за 1 шт (продаж)</div>
                    <div className="kv-value">{uah(pricePerPcsSell)}</div>
                </div>
            </div>
        </article>
    );
}
