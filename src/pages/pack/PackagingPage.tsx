import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./packaging.css";

import { PACKAGING_OPTIONS } from "@/services/packaging.options";
import type { IPackaging } from "@/models/IPackaging";
import { formatUAH, getTotals, addPack, getPackQty, onCartChange } from "@/cart/store.ts";

export default function PackagingPage() {
    const navigate = useNavigate();

    // сума ваги з кошика цукерок (для підказки "вмістить/не вмістить")
    const [totalWeightG, setTotalWeightG] = useState(0);
    useEffect(() => {
        const upd = () => setTotalWeightG(getTotals().totalWeightG);
        upd();
        return onCartChange(upd);
    }, []);

    // локальний стан степперів по картках (за замовчуванням 1)
    const [qty, setQty] = useState<Record<string, number>>({});
    const setLocal = (id: string, v: number) =>
        setQty((m) => ({ ...m, [id]: Math.max(1, Math.floor(v) || 1) }));

    const dec = (id: string) => setLocal(id, (qty[id] ?? 1) - 1);
    const inc = (id: string) => setLocal(id, (qty[id] ?? 1) + 1);

    const hintFor = (p: IPackaging) => {
        if (!p.capacityG || p.capacityG <= 0) return null;
        if (totalWeightG === 0) return null;
        const ok = totalWeightG <= p.capacityG;
        return ok ? "✅ вмістить поточну вагу" : "⚠️ не вмістить поточну вагу";
    };

    const items = useMemo(() => {
        const arr = [...PACKAGING_OPTIONS];
        arr.sort((a, b) => {
            const isBagA = a.name.toLowerCase().includes("пакет");
            const isBagB = b.name.toLowerCase().includes("пакет");
            if (isBagA !== isBagB) return isBagA ? 1 : -1; // коробки спочатку
            return (a.capacityG ?? 0) - (b.capacityG ?? 0);
        });
        return arr;
    }, []);

    // щоб картки оновлювали «В кошику N» при зміні з інших сторінок
    const [, force] = useState(0);
    useEffect(() => onCartChange(() => force((x) => x + 1)), []);

    return (
        <div className="pack-page">
            <div className="pack-head">
                <h1 className="pack-title">Пакування</h1>
                <div className="pack-tools">
                    <button className="btn link" type="button" onClick={() => navigate("/basket")}>
                        До кошика
                    </button>
                </div>
            </div>

            <div className="pack-grid">
                {items.map((p) => {
                    const id = (p as any).id ?? (p as any)._id;
                    const hint = hintFor(p);
                    const inCartQty = getPackQty(id); // скільки вже в кошику
                    const q = qty[id] ?? 1;

                    return (
                        <article key={id} className="pack-card is-vertical">
                            <div className="pack-media">
                                {p.imageUrl ? (
                                    <img src={p.imageUrl} alt={p.name} loading="lazy" decoding="async" />
                                ) : (
                                    <div className="ph">🎁</div>
                                )}
                            </div>

                            <h3 className="pack-name">{p.name}</h3>
                            <div className="pack-sub">
                                {p.capacityG ? <>до ~{p.capacityG} г</> : <>без обмеження</>}
                            </div>

                            <div className="pack-actions">
                                <div className="pack-price">{formatUAH(p.priceKop)}</div>
                                {hint ? (
                                    <div className={`pack-hint ${hint.includes("⚠️") ? "bad" : "ok"}`}>{hint}</div>
                                ) : (
                                    <div className="pack-hint">&nbsp;</div>
                                )}

                                {/* Степпер кількості */}
                                <div className="pack-qty">
                                    <button className="pack-qty-btn" type="button" onClick={() => dec(id)}>−</button>
                                    <div className="pack-qty-input">{q}</div>
                                    <button className="pack-qty-btn" type="button" onClick={() => inc(id)}>+</button>
                                </div>

                                {/* Кнопка додати */}
                                <button
                                    className="btn solid pack-btn"
                                    type="button"
                                    onClick={() => { addPack(p, q); setLocal(id, 1); }}
                                >
                                    Додати {q > 1 ? `×${q}` : ""} в кошик
                                </button>

                                {/* Бейдж скільки вже додано */}
                                {inCartQty > 0 ? (
                                    <div className="pack-hint ok">В кошику: {inCartQty}</div>
                                ) : (
                                    <div className="pack-hint">&nbsp;</div>
                                )}
                            </div>
                        </article>
                    );
                })}
            </div>
        </div>
    );
}
