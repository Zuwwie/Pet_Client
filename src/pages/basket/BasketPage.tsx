import { useEffect, useState, type FormEvent } from "react";
import {
    getTotals, setQty, removeFromCart, clearCart, formatUAH,
    getPackCart, setPackQty, removePack as removePackaging, clearPackCart,
    getGrandTotalsPacks, onCartChange
} from "@/cart/store.ts";
import "./basket.css";

type CartItem = ReturnType<typeof getTotals>["items"][number];
type PackItem = ReturnType<typeof getPackCart>[number];

const BasketPage = () => {
    // ---- candies (fill) ----
    const [items, setItems] = useState<CartItem[]>([]);
    const [itemsCount, setItemsCount] = useState(0);
    const [totalWeightG, setTotalWeightG] = useState(0);
    const [subtotalKop, setSubtotalKop] = useState(0);

    // ---- packaging cart ----
    const [packs, setPacks] = useState<PackItem[]>([]);
    const [packTotals, setPackTotals] = useState(getGrandTotalsPacks());

    // form fields
    const [packageName, setPackageName] = useState("");
    const [notes, setNotes] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");

    const refresh = () => {
        const t = getTotals();
        setItems(t.items);
        setItemsCount(t.itemsCount);
        setTotalWeightG(t.totalWeightG);
        setSubtotalKop(t.subtotalKop);

        setPacks(getPackCart());
        setPackTotals(getGrandTotalsPacks());
    };

    useEffect(() => {
        refresh();
        return onCartChange(refresh);
    }, []);

    // qty для цукерок
    const dec = (id: string, q: number) => setQty(id, Math.max(1, q - 1));
    const inc = (id: string, q: number) => setQty(id, q + 1);
    const change = (id: string, val: string) => setQty(id, Math.max(1, Number(val) || 1));

    // qty для пакувань
    const decPack = (id: string, q: number) => setPackQty(id, Math.max(0, q - 1)); // 0 → зникне
    const incPack = (id: string, q: number) => setPackQty(id, q + 1);
    const changePack = (id: string, val: string) => setPackQty(id, Math.max(0, Number(val) || 0));

    const clearAll = () => { clearCart(); clearPackCart(); };

    // submit (демо)
    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const orderDraft = {
            fill: { items, itemsCount, totalWeightG, subtotalKop },
            packages: packs,
            totals: packTotals,
            packageName, notes, customerName, customerPhone,
        };
        console.log("ORDER DRAFT:", orderDraft);
    };

    if (items.length === 0 && packs.length === 0) {
        return (
            <div className="basket-wrap">
                <h1 className="basket-title">Кошик</h1>
                <div className="card empty">Кошик порожній. Додайте цукерки та/або пакування.</div>
            </div>
        );
    }

    return (
        <div className="basket-grid">
            {/* LEFT: packaging FIRST, then candies */}
            <section className="basket-left">
                <div className="basket-head">
                    <h1 className="basket-title">Кошик</h1>
                    <button type="button" className="btn-clear-cart" onClick={clearAll} title="Очистити все">
                        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                            <path d="M3 6h18" fill="none" stroke="currentColor" />
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" />
                            <rect x="6" y="6" width="12" height="14" rx="2" fill="none" stroke="currentColor" />
                            <path d="M10 11v6M14 11v6" fill="none" stroke="currentColor" />
                        </svg>
                        <span>Очистити</span>
                    </button>
                </div>

                {/* ---- ПАКУВАННЯ (першими) ---- */}
                <h2 className="basket-subtitle">Пакування</h2>
                <div className="packcart-list">
                    {packs.length === 0 ? (
                        <div className="card empty">Пакування не обрано. Додайте їх на сторінці «Пакування».</div>
                    ) : (
                        packs.map((p) => {
                            const lineKop = p.priceKop * p.qty;
                            return (
                                <article key={p.packagingId} className="card packcart-item">
                                    <div className="packcart-media">
                                        {p.imageUrl ? <img src={p.imageUrl} alt={p.title} loading="lazy" /> : <div className="ph">🎁</div>}
                                    </div>

                                    <div className="packcart-info">
                                        <h3 className="packcart-name">{p.title}</h3>
                                        <div className="packcart-meta">{p.capacityG ? `до ~${p.capacityG} г` : "без обмеження"}</div>
                                        <div className="packcart-price">{formatUAH(p.priceKop)}</div>
                                    </div>

                                    <div className="packcart-controls">
                                        <div className="qty-controls">
                                            <button className="qty-btn" onClick={() => decPack(p.packagingId, p.qty)}>—</button>
                                            <input
                                                className="qty-input" type="number" min={0} inputMode="numeric" value={p.qty}
                                                onChange={(e) => changePack(p.packagingId, e.target.value)}
                                                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                            />
                                            <button className="qty-btn" onClick={() => incPack(p.packagingId, p.qty)}>+</button>
                                        </div>

                                        <div className="packcart-line">{formatUAH(lineKop)}</div>
                                        <button className="danger-btn" onClick={() => removePackaging(p.packagingId)} aria-label="Видалити">×</button>
                                    </div>
                                </article>
                            );
                        })
                    )}
                </div>

                {/* ---- ЦУКЕРКИ (після пакувань) ---- */}
                <h2 className="basket-subtitle">Цукерки</h2>
                {items.length === 0 ? (
                    <div className="card empty">Цукерки ще не додані.</div>
                ) : (
                    <div className="basket-list">
                        {items.map((it) => {
                            const lineWeight = it.weightPerPieceG * it.qty;
                            const lineKop = it.piecePriceKop * it.qty;
                            return (
                                <article key={it.id} className="card basket-item">
                                    <div className="basket-row">
                                        <div className="basket-media">
                                            {it.photoUrl ? (
                                                <img src={it.photoUrl} alt={it.name} loading="lazy" />
                                            ) : (
                                                <svg className="ph" viewBox="0 0 24 24" aria-hidden>
                                                    <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" />
                                                    <circle cx="9" cy="11" r="2" fill="currentColor" />
                                                    <path d="M3 16l5-5 4 4 3-3 6 6" fill="none" stroke="currentColor" />
                                                </svg>
                                            )}
                                        </div>

                                        <div className="basket-info">
                                            <h3 className="basket-name">{it.name}</h3>
                                            <div className="basket-meta">{`${it.weightPerPieceG}г × ${it.qty} = ${lineWeight}г`}</div>
                                            <div className="basket-line-price">{formatUAH(lineKop)}</div>
                                        </div>

                                        <div className="basket-controls">
                                            <div className="qty-controls basket-qty">
                                                <button className="qty-btn" aria-label="–" onClick={() => dec(it.id, it.qty)}>—</button>
                                                <input
                                                    className="qty-input" type="number" min={1} inputMode="numeric" value={it.qty}
                                                    onChange={(e) => change(it.id, e.target.value)}
                                                    onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                                />
                                                <button className="qty-btn" aria-label="+" onClick={() => inc(it.id, it.qty)}>+</button>
                                            </div>

                                            <button className="danger-btn" onClick={() => removeFromCart(it.id)} aria-label="Видалити">
                                                <svg viewBox="0 0 24 24" aria-hidden="true" className="icon-trash">
                                                    <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                    <rect x="6" y="6" width="12" height="14" rx="2" /><path d="M10 11v6M14 11в6" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* RIGHT: summary */}
            <aside className="card summary-card">
                <h2 className="summary-title">Підсумок замовлення</h2>

                <form className="summary-form" onSubmit={handleSubmit}>
                    <ul className="summary-list">
                        <li><span>Кількість пакунків:</span><b>{packTotals.totalPacks}</b></li>
                        <li><span>Ціна цукерок за 1 пакунок:</span><b>{formatUAH(packTotals.perPack.fillKop)}</b></li>
                        <li><span>Ціна цукерок за  {packTotals.totalPacks} пакунків:</span><b>{formatUAH(packTotals.allPacks.itemsCostAllPacksKop)}</b></li>
                        <li><span>Ціна за упаковки:</span><b>{formatUAH(packTotals.allPacks.packagingCostKop)}</b></li>
                        <li><span>Вага одного пакунка:</span><b>{totalWeightG} г</b></li>
                        <li><span>Загальна вага:</span><b>{packTotals.allPacks.totalWeightG} г</b></li>

                        <li className="summary-total">
                            <span>Разом до сплати:</span>
                            <b>{formatUAH(packTotals.allPacks.grandTotalKop)}</b>
                        </li>
                    </ul>

                    <label className="summary-label">ПІБ отримувача</label>
                    <input className="summary-input" type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Прізвище Ім'я По батькові" />

                    <label className="summary-label">Номер телефону</label>
                    <input className="summary-input" type="tel" inputMode="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+380 __ ___ __ __" pattern="^(\+?38)?0\d{9}$" />

                    <label className="summary-label">Назва пакету</label>
                    <input className="summary-input" type="text" value={packageName} onChange={(e) => setPackageName(e.target.value)} placeholder="Наприклад: Для дівчинки / Для хлопчика" />

                    <label className="summary-label">Примітки</label>
                    <textarea className="summary-textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Додаткові побажання до замовлення…" />

                    <button className="add-btn summary-submit" type="submit">Оформити замовлення</button>
                    <button className="summary-clear" type="button" onClick={clearAll}>Очистити кошик</button>
                </form>
            </aside>
        </div>
    );
};

export default BasketPage;
