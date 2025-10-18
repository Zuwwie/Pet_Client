import { useEffect, useState, type FormEvent } from "react";
// ↓ якщо немає alias "@", заміни на "../cart/store"
import { getTotals, setQty, removeFromCart, clearCart, formatUAH } from "@/cart/store.ts";
import "./basket.css";

type CartItem = ReturnType<typeof getTotals>["items"][number];

const BasketPage = () => {
    const [items, setItems] = useState<CartItem[]>([]);
    const [itemsCount, setItemsCount] = useState(0);
    const [totalWeightG, setTotalWeightG] = useState(0);
    const [subtotalKop, setSubtotalKop] = useState(0);

    const [packageName, setPackageName] = useState("");
    const [notes, setNotes] = useState("");

    const [packagesCount, setPackagesCount] = useState<number>(() => {
        const saved = localStorage.getItem("cart:packagesCount");
        return saved ? Math.max(1, Number(saved) || 1) : 1;
    });

    // Дані отримувача
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");

    const refresh = () => {
        const t = getTotals();
        setItems(t.items);
        setItemsCount(t.itemsCount);
        setTotalWeightG(t.totalWeightG);
        setSubtotalKop(t.subtotalKop);
    };

    useEffect(() => { refresh(); }, []);
    useEffect(() => {
        localStorage.setItem("cart:packagesCount", String(packagesCount));
    }, [packagesCount]);

    // qty для позицій
    const dec = (id: string, q: number) => { setQty(id, Math.max(1, q - 1)); refresh(); };
    const inc = (id: string, q: number) => { setQty(id, q + 1); refresh(); };
    const change = (id: string, val: string) => { setQty(id, Math.max(1, Number(val) || 1)); refresh(); };
    const remove = (id: string) => { removeFromCart(id); refresh(); };
    const clear = () => { clearCart(); refresh(); };

    // qty для пакунків
    const decPacks = () => setPackagesCount(v => Math.max(1, v - 1));
    const incPacks = () => setPackagesCount(v => v + 1);
    const changePacks = (val: string) => setPackagesCount(Math.max(1, Number(val) || 1));

    // демонстраційна відправка
    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const orderDraft = {
            items,
            itemsCount,
            totalWeightG,
            subtotalKop,
            packagesCount,
            packageName,
            notes,
            customerName,
            customerPhone,
        };
        console.log("ORDER DRAFT:", orderDraft);
    };

    if (items.length === 0) {
        return (
            <div className="basket-wrap">
                <h1 className="basket-title">Кошик</h1>
                <div className="card empty">Кошик порожній. Додайте цукерки до замовлення.</div>
            </div>
        );
    }

    return (
        <div className="basket-grid">
            {/* LEFT: items */}
            <section className="basket-left">
                <h1 className="basket-title">Кошик</h1>

                <div className="basket-list">
                    {items.map((it) => {
                        const lineWeight = it.weightPerPieceG * it.qty;         // г
                        const lineKop = it.piecePriceKop * it.qty;
                        return (
                            <article key={it.id} className="card basket-item">
                                <div className="basket-row">
                                    {/* thumb */}
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

                                    {/* info */}
                                    <div className="basket-info">
                                        <h3 className="basket-name">{it.name}</h3>
                                        <div className="basket-meta">{`${it.weightPerPieceG}г × ${it.qty} = ${lineWeight}г`}</div>
                                        <div className="basket-line-price">{formatUAH(lineKop)}</div>
                                    </div>

                                    {/* controls */}
                                    <div className="basket-controls">
                                        <div className="qty-controls basket-qty">
                                            <button className="qty-btn" aria-label="–" onClick={() => dec(it.id, it.qty)}>—</button>
                                            <input
                                                className="qty-input"
                                                type="number"
                                                min={1}
                                                inputMode="numeric"
                                                value={it.qty}
                                                onChange={(e) => change(it.id, e.target.value)}
                                                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                            />
                                            <button className="qty-btn" aria-label="+" onClick={() => inc(it.id, it.qty)}>+</button>
                                        </div>

                                        <button className="danger-btn" onClick={() => remove(it.id)} aria-label="Видалити">
                                            <svg viewBox="0 0 24 24" aria-hidden="true" className="icon-trash">
                                                <path d="M3 6h18" />
                                                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                <rect x="6" y="6" width="12" height="14" rx="2" />
                                                <path d="M10 11v6M14 11v6" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>

            {/* RIGHT: summary */}
            <aside className="card summary-card">
                <h2 className="summary-title">Підсумок замовлення</h2>

                <form className="summary-form" onSubmit={handleSubmit}>
                    <ul className="summary-list">
                        <li><span>Кількість:</span><b>{itemsCount} шт.</b></li>
                        <li><span>Загальна вага:</span><b>{totalWeightG} г</b></li>

                        {/* Рядок з контролами пакунків в один ряд */}
                        <li className="summary-row summary-row--packs">
                            <span className="summary-label m-0">Кількість пакунків</span>
                            <div className="summary-qty">
                                <div className="qty-controls">
                                    <button className="qty-btn" type="button" aria-label="–" onClick={decPacks}>—</button>
                                    <input
                                        className="qty-input"
                                        type="number"
                                        min={1}
                                        inputMode="numeric"
                                        value={packagesCount}
                                        onChange={(e) => changePacks(e.target.value)}
                                        onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                    />
                                    <button className="qty-btn" type="button" aria-label="+" onClick={incPacks}>+</button>
                                </div>
                            </div>
                        </li>

                        <li className="summary-total"><span>Загальна вартість:</span><b>{formatUAH(subtotalKop)}</b></li>
                    </ul>

                    <label className="summary-label">ПІБ отримувача</label>
                    <input
                        className="summary-input"
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Прізвище Ім'я По батькові"
                    />

                    <label className="summary-label">Номер телефону</label>
                    <input
                        className="summary-input"
                        type="tel"
                        inputMode="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="+380 __ ___ __ __"
                        pattern="^(\+?38)?0\d{9}$"
                    />

                    <label className="summary-label">Назва пакету</label>
                    <input
                        className="summary-input"
                        type="text"
                        value={packageName}
                        onChange={(e) => setPackageName(e.target.value)}
                        placeholder="Наприклад: Подарунковий набір"
                    />

                    <label className="summary-label">Примітки</label>
                    <textarea
                        className="summary-textarea"
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Додаткові побажання до замовлення…"
                    />

                    <button className="add-btn summary-submit" type="submit">Оформити замовлення</button>
                    <button className="summary-clear" type="button" onClick={clear}>Очистити кошик</button>
                </form>
            </aside>
        </div>
    );
};

export default BasketPage;
