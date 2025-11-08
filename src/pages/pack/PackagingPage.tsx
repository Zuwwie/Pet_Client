// src/pages/packaging/PackagingPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./packaging.css";

import type { IPackaging } from "@/models/IPackaging";
import {
    formatUAH,
    getTotals,
    addPack,
    getPackQty,
    onCartChange,
    removePack,
} from "@/cart/store.ts";
import { usePackaging } from "@/services/packaging.service";
import LazyImg from "@/components/LazyImg";

const EAGER_COUNT = 8;

export default function PackagingPage() {
    const navigate = useNavigate();

    const [totalWeightG, setTotalWeightG] = useState(0);
    useEffect(() => {
        const upd = () => setTotalWeightG(getTotals().totalWeightG);
        upd();
        return onCartChange(upd);
    }, []);

    const { data: options = [], isLoading, isError } = usePackaging();

    // Діагностика - логування даних
    useEffect(() => {
        if (options.length > 0) {
            console.log('Packaging data:', options);
            const unavailable = options.filter(p => p.isAvailable === false);
            console.log('Unavailable items:', unavailable);
        }
    }, [options]);

    // локальні степпери
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

    // === Сортування ===
    const items = useMemo(() => {
        const isAvail = (p: any) => p?.isAvailable !== false;
        const priceOf = (p: any) =>
            typeof p?.priceKop === "number" ? p.priceKop : Number.POSITIVE_INFINITY;

        const arr = [...options];
        arr.sort((a: any, b: any) => {
            const avA = isAvail(a) ? 1 : 0;
            const avB = isAvail(b) ? 1 : 0;
            if (avA !== avB) return avB - avA;

            const pa = priceOf(a);
            const pb = priceOf(b);
            if (pa !== pb) return pa - pb;

            return String(a?.name ?? "").localeCompare(String(b?.name ?? ""), "uk");
        });

        console.log('Sorted items:', arr.map(item => ({
            name: item.name,
            isAvailable: item.isAvailable,
            priceKop: item.priceKop,
            _id: item._id, // Додаємо _id для діагностики
            key: item.key
        })));

        return arr;
    }, [options]);

    // щоб «В кошику N» оновлювалось при змінах з інших сторінок
    const [, force] = useState(0);
    useEffect(() => onCartChange(() => force((x) => x + 1)), []);

    // зелений стан кнопки "Додано" (2с)
    const [flash, setFlash] = useState<Record<string, boolean>>({});
    const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    useEffect(() => {
        return () => Object.values(timersRef.current).forEach(clearTimeout);
    }, []);

    if (isLoading) {
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
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="product-card sk" />
                    ))}
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="pack-page">
                <div className="pack-head">
                    <h1 className="pack-title">Пакування</h1>
                </div>
                <p className="error">Не вдалось завантажити пакування</p>
            </div>
        );
    }

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
                {items.map((p, i) => {
                    // ВИПРАВЛЕННЯ: Використовуємо _id замість key
                    const id = String(p._id); // Тепер це буде "68f55f97f1405318be097b34"
                    const hint = hintFor(p);
                    const inCartQty = getPackQty(id);
                    const q = qty[id] ?? 1;
                    const isAvailable = p.isAvailable !== false;

                    console.log(`Rendering ${p.name}, ID: ${id}, isAvailable: ${isAvailable}`);

                    const onAdd = () => {
                        if (!isAvailable) return;

                        // Створюємо об'єкт з правильним _id для передачі в кошик
                        const packForCart = {
                            ...p,
                            id: id, // Передаємо _id як id
                            packagingId: id // Додатково передаємо packagingId
                        };

                        addPack(packForCart, q);
                        setLocal(id, 1);
                        setFlash((s) => ({ ...s, [id]: true }));
                        if (timersRef.current[id]) clearTimeout(timersRef.current[id]);
                        timersRef.current[id] = setTimeout(() => {
                            setFlash((s) => ({ ...s, [id]: false }));
                        }, 2000);
                    };

                    const onRemoveAll = () => removePack(id);

                    return (
                        <article key={id} className={`pack-card is-vertical ${!isAvailable ? 'not-available' : ''}`}>
                            <div className="pack-media">
                                {p.imageUrl ? (
                                    <LazyImg
                                        src={p.imageUrl}
                                        alt={p.name}
                                        eager={i < EAGER_COUNT}
                                        className="pack-img"
                                    />
                                ) : (
                                    <div className="ph">🎁</div>
                                )}
                                {!isAvailable && <div className="availability-overlay">Немає в наявності</div>}
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

                                {/* степпер */}
                                <div className="pack-qty">
                                    <button
                                        className="pack-qty-btn"
                                        type="button"
                                        onClick={() => dec(id)}
                                        disabled={!isAvailable}
                                    >−</button>
                                    <div className="pack-qty-input">{q}</div>
                                    <button
                                        className="pack-qty-btn"
                                        type="button"
                                        onClick={() => inc(id)}
                                        disabled={!isAvailable}
                                    >+</button>
                                </div>

                                {/* додати */}
                                <button
                                    className={`btn solid pack-btn${flash[id] ? " is-green" : ""}${!isAvailable ? " disabled" : ""}`}
                                    type="button"
                                    onClick={onAdd}
                                    disabled={!isAvailable}
                                    aria-live="polite"
                                >
                                    {!isAvailable
                                        ? "Немає в наявності"
                                        : (flash[id]
                                                ? "Додано"
                                                : <>Додати {q > 1 ? `×${q}` : ""} в кошик</>
                                        )
                                    }
                                </button>

                                {inCartQty > 0 ? (
                                    <div className="pack-inline">
                                        <div className="in-cart-pill" title="Кількість у кошику">
                                            <span className="in-cart-dot" aria-hidden />
                                            <span className="in-cart-label">Кошик</span>
                                            <span className="in-cart-count">{inCartQty}</span>
                                        </div>
                                        <button className="btn danger ghost pack-remove" type="button" onClick={onRemoveAll}>
                                            Видалити
                                        </button>
                                    </div>
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