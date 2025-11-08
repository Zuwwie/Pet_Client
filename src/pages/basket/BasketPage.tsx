import { useEffect, useState, type FormEvent } from "react";
import {
    getTotals, setQty, removeFromCart, clearCart, formatUAH,
    getPackCart, setPackQty, removePack as removePackaging, clearPackCart,
    getGrandTotalsPacks, onCartChange, debugCart, forceFixCart,
    mapCartToOrderCandies, mapPackCartToOrderPacks
} from "@/cart/store.ts";
import { useCreateOrder } from "@/services/orders.service";
import "./basket.css";

type CartItem = ReturnType<typeof getTotals>["items"][number];
type PackItem  = ReturnType<typeof getPackCart>[number];

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
    const [customerEmail, setCustomerEmail] = useState("");

    // loading and error states
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Mutation для створення замовлення
    const createOrderMutation = useCreateOrder();

    const refresh = () => {
        console.log("🔄 Оновлення даних кошика...");
        const t = getTotals();
        setItems(t.items);
        setItemsCount(t.itemsCount);
        setTotalWeightG(t.totalWeightG);
        setSubtotalKop(t.subtotalKop);

        const packsData = getPackCart();
        const packTotalsData = getGrandTotalsPacks();

        setPacks(packsData);
        setPackTotals(packTotalsData);

        console.log("📊 Оновлені дані кошика:", {
            itemsCount: t.itemsCount,
            totalWeightG: t.totalWeightG,
            subtotalKop: t.subtotalKop,
            formattedSubtotal: formatUAH(t.subtotalKop),
            packsCount: packsData.length,
            packTotals: packTotalsData
        });
    };

    useEffect(() => {
        console.log("🏁 BasketPage завантажено");
        debugCart();
        refresh();
        return onCartChange(refresh);
    }, []);

    // qty для цукерок
    const dec    = (id: string, q: number) => setQty(id, Math.max(1, q - 1));
    const inc    = (id: string, q: number) => setQty(id, q + 1);
    const change = (id: string, val: string) => setQty(id, Math.max(1, Number(val) || 1));

    // qty для пакувань
    const decPack    = (id: string, q: number) => setPackQty(id, Math.max(0, q - 1));
    const incPack    = (id: string, q: number) => setPackQty(id, q + 1);
    const changePack = (id: string, val: string) => setPackQty(id, Math.max(0, Number(val) || 0));

    const clearAll = () => {
        clearCart();
        clearPackCart();
        setSuccess(false);
        setError(null);
    };

    // Функція для дебагу кошика
    const handleDebugCart = () => {
        console.log("🐛 Ручний дебаг кошика:");
        debugCart();
        forceFixCart();
        refresh();
    };

    // Функція для перевірки, чи є ID валідним ObjectId
    const isValidObjectId = (id: string): boolean => /^[0-9a-fA-F]{24}$/.test(id);

    // submit - відправка замовлення
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        // Детальна перевірка даних перед відправкою
        console.log("🔍 ПЕРЕДВІДПРАВНА ПЕРЕВІРКА:");
        const currentTotals = getTotals();
        console.log("📊 Поточні підсумки:", {
            items: currentTotals.items,
            totalWeightG: currentTotals.totalWeightG,
            subtotalKop: currentTotals.subtotalKop,
            formattedTotal: formatUAH(currentTotals.subtotalKop)
        });

        currentTotals.items.forEach(item => {
            console.log(`🍬 Деталі "${item.name}":`, {
                id: item.id,
                qty: item.qty,
                weightPerPieceG: item.weightPerPieceG,
                piecePriceKop: item.piecePriceKop,
                pricingMode: item.pricingMode,
                totalPrice: item.qty * item.piecePriceKop,
                totalWeight: item.qty * item.weightPerPieceG,
                calculatedPrice: formatUAH(item.qty * item.piecePriceKop)
            });
        });

        // Валідація обов'язкових полів
        if (!customerName.trim()) {
            setError("Будь ласка, введіть ПІБ отримувача");
            setLoading(false);
            return;
        }
        if (!customerPhone.trim()) {
            setError("Будь ласка, введіть номер телефону");
            setLoading(false);
            return;
        }
        if (items.length === 0 && packs.length === 0) {
            setError("Кошик порожній. Додайте цукерки або пакування.");
            setLoading(false);
            return;
        }
        if (currentTotals.subtotalKop === 0 && packs.length === 0) {
            setError("Немає даних для замовлення. Можливо, ціни не встановлені для товарів.");
            setLoading(false);
            return;
        }

        // Перевірка ID
        const invalidCandies = items.filter(item => !isValidObjectId(item.id));
        const invalidPacks   = packs.filter(pack => !isValidObjectId(pack.packagingId));

        console.log("🔍 Перевірка ID:", {
            items: items.map(i => ({ id: i.id, valid: isValidObjectId(i.id) })),
            packs: packs.map(p => ({ packagingId: p.packagingId, valid: isValidObjectId(p.packagingId) })),
            invalidCandies,
            invalidPacks
        });

        if (invalidCandies.length > 0 || invalidPacks.length > 0) {
            const invalidItems = [
                ...invalidCandies.map(item => `цукерка "${item.name}" (ID: ${item.id})`),
                ...invalidPacks.map(pack => `пакування "${pack.title}" (ID: ${pack.packagingId})`)
            ].join(", ");
            setError(`Деякі товари мають неправильні ідентифікатори: ${invalidItems}. Спробуйте додати товари знову.`);
            setLoading(false);
            return;
        }

        // ✅ Формуємо payload через хелпери, щоб завжди були і qtyPieces, і weightG
        const orderData = {
            customer: {
                name:  customerName.trim(),
                phone: customerPhone.trim(),
                email: customerEmail.trim() || undefined
            },
            comment: [packageName.trim(), notes.trim()].filter(Boolean).join(" | ") || undefined,
            candies: mapCartToOrderCandies(),
            packs:   mapPackCartToOrderPacks()
        };

        console.log("📦 Відправляємо замовлення:", JSON.stringify(orderData, null, 2));

        try {
            const result = await createOrderMutation.mutateAsync(orderData);
            console.log("✅ Замовлення успішно створено:", result);

            // Очищаємо кошик після успішного замовлення
            clearCart();
            clearPackCart();
            setSuccess(true);

            // Скидаємо форму
            setCustomerName("");
            setCustomerPhone("");
            setCustomerEmail("");
            setPackageName("");
            setNotes("");
        } catch (err: any) {
            console.error("❌ Помилка при створенні замовлення:", err);

            if (err.response) {
                const status = err.response.status;
                const data = err.response.data;

                console.error("📋 Відповідь сервера:", {
                    status,
                    data,
                    headers: err.response.headers
                });

                if (status === 400) {
                    setError(`Неправильні дані: ${data.message || JSON.stringify(data)}`);
                } else if (status === 500) {
                    setError(`Помилка сервера (500). Деталі: ${data.message || data.error || "внутрішня помилка сервера"}`);
                } else {
                    setError(`Помилка ${status}: ${data.message || "невідома помилка"}`);
                }
            } else if (err.request) {
                setError("Не вдалося з'єднатися з сервером. Перевірте підключення до інтернету.");
            } else {
                setError(`Помилка: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    if (items.length === 0 && packs.length === 0 && !success) {
        return (
            <div className="basket-wrap">
                <h1 className="basket-title">Кошик</h1>
                <div className="card empty">Кошик порожній. Додайте цукерки та/або пакування.</div>
            </div>
        );
    }

    // Показати повідомлення про успіх
    if (success) {
        return (
            <div className="basket-wrap">
                <h1 className="basket-title">Кошик</h1>
                <div className="card success-message">
                    <h2>✅ Замовлення успішно оформлено!</h2>
                    <p>Ваше замовлення було відправлено. Ми зв'яжемося з вами найближчим часом для підтвердження.</p>
                    <button
                        className="add-btn"
                        onClick={() => setSuccess(false)}
                        style={{ marginTop: "1rem" }}
                    >
                        Створити нове замовлення
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="basket-grid">
            {/* Ліва частина - товари */}
            <section className="basket-left">
                <div className="basket-head">
                    <h1 className="basket-title">Кошик</h1>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <button
                            type="button"
                            className="btn-clear-cart"
                            onClick={handleDebugCart}
                            style={{ background: "#2196F3", color: "white" }}
                            title="Дебаг кошика"
                        >
                            🐛 Дебаг
                        </button>
                        <button
                            type="button"
                            className="btn-clear-cart"
                            onClick={clearAll}
                            title="Очистити все"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                                <path d="M3 6h18" fill="none" stroke="currentColor" />
                                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" />
                                <rect x="6" y="6" width="12" height="14" rx="2" fill="none" stroke="currentColor" />
                                <path d="M10 11v6M14 11v6" fill="none" stroke="currentColor" />
                            </svg>
                            <span>Очистити</span>
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="card error-message">
                        <h3>❌ Помилка</h3>
                        <p>{error}</p>
                        <button
                            className="summary-clear"
                            onClick={() => setError(null)}
                            style={{ marginTop: "0.5rem" }}
                        >
                            Зрозуміло
                        </button>
                    </div>
                )}

                {/* Пакування */}
                <h2 className="basket-subtitle">Пакування</h2>
                <div className="packcart-list">
                    {packs.length === 0 ? (
                        <div className="card empty">Пакування не обрано. Додайте їх на сторінці «Пакування».</div>
                    ) : (
                        packs.map((p) => {
                            const lineKop  = p.priceKop * p.qty;
                            const isValidId = isValidObjectId(p.packagingId);

                            return (
                                <article key={p.packagingId} className={`card packcart-item ${!isValidId ? "invalid-id" : ""}`}>
                                    {!isValidId && (
                                        <div
                                            className="invalid-warning"
                                            style={{
                                                background: "#ffebee",
                                                color: "#c62828",
                                                padding: "8px",
                                                margin: "-16px -16px 16px -16px",
                                                borderRadius: "8px 8px 0 0",
                                                fontSize: "14px",
                                            }}
                                        >
                                            ⚠️ Це пакування не може бути використане для замовлення (неправильний ID)
                                        </div>
                                    )}
                                    <div className="packcart-media">
                                        {p.imageUrl ? <img src={p.imageUrl} alt={p.title} loading="lazy" /> : <div className="ph">🎁</div>}
                                    </div>

                                    <div className="packcart-info">
                                        <h3 className="packcart-name">{p.title}</h3>
                                        <div className="packcart-meta">{p.capacityG ? `до ~${p.capacityG} г` : "без обмеження"}</div>
                                        <div className="packcart-price">{formatUAH(p.priceKop)}</div>
                                        {!isValidId && (
                                            <div className="packcart-id-warning" style={{ fontSize: "12px", color: "#c62828", marginTop: "4px" }}>
                                                ID: {p.packagingId}
                                            </div>
                                        )}
                                    </div>

                                    <div className="packcart-controls">
                                        <div className="qty-controls">
                                            <button className="qty-btn" onClick={() => decPack(p.packagingId, p.qty)}>—</button>
                                            <input
                                                className="qty-input"
                                                type="number"
                                                min={0}
                                                inputMode="numeric"
                                                value={p.qty}
                                                onChange={(e) => changePack(p.packagingId, e.target.value)}
                                                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                            />
                                            <button className="qty-btn" onClick={() => incPack(p.packagingId, p.qty)}>+</button>
                                        </div>

                                        <div className="packcart-line">{formatUAH(lineKop)}</div>
                                        <button className="danger-btn" onClick={() => removePackaging(p.packagingId)} aria-label="Видалити">
                                            ×
                                        </button>
                                    </div>
                                </article>
                            );
                        })
                    )}
                </div>

                {/* Цукерки */}
                <h2 className="basket-subtitle">Цукерки</h2>
                {items.length === 0 ? (
                    <div className="card empty">Цукерки ще не додані.</div>
                ) : (
                    <div className="basket-list">
                        {items.map((it) => {
                            const lineWeight = it.weightPerPieceG * it.qty;
                            const lineKop    = it.piecePriceKop * it.qty;
                            const isValidId  = isValidObjectId(it.id);

                            return (
                                <article key={it.id} className={`card basket-item ${!isValidId ? "invalid-id" : ""}`}>
                                    {!isValidId && (
                                        <div
                                            className="invalid-warning"
                                            style={{
                                                background: "#ffebee",
                                                color: "#c62828",
                                                padding: "8px",
                                                margin: "-16px -16px 16px -16px",
                                                borderRadius: "8px 8px 0 0",
                                                fontSize: "14px",
                                            }}
                                        >
                                            ⚠️ Ця цукерка не може бути використана для замовлення (неправильний ID)
                                        </div>
                                    )}
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
                                            <div className="basket-meta">
                                                {/* ціна/шт */}
                                                {`${it.qty} шт × ${formatUAH(it.piecePriceKop)} = ${formatUAH(lineKop)}`}
                                                {it.pricingMode === "weight" && (
                                                    <>
                                                        <br />
                                                        <span>{`${it.weightPerPieceG}г × ${it.qty} = ${lineWeight}г`}</span>
                                                    </>
                                                )}
                                                {/* ✅ явний показ кількості */}
                                                <br />
                                                <span>Кількість: <b>{it.qty} шт</b></span>
                                                <br />
                                                <small style={{ color: "#666" }}>
                                                    Тип: {it.pricingMode === "pcs" ? "штучна" : "вагова"} | Ціна: {formatUAH(it.piecePriceKop)}/шт
                                                </small>
                                            </div>
                                            <div className="basket-line-price">{formatUAH(lineKop)}</div>
                                            {!isValidId && (
                                                <div className="basket-id-warning" style={{ fontSize: "12px", color: "#c62828", marginTop: "4px" }}>
                                                    ID: {it.id}
                                                </div>
                                            )}
                                        </div>

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

                                            <button className="danger-btn" onClick={() => removeFromCart(it.id)} aria-label="Видалити">
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
                )}
            </section>

            {/* Права частина - підсумок */}
            <aside className="card summary-card">
                <h2 className="summary-title">Підсумок замовлення</h2>

                <div style={{ padding: "10px", background: "#f5f5f5", borderRadius: "8px", marginBottom: "15px" }}>
                    <strong>Загальна інформація:</strong>
                    <div>Цукерок: {itemsCount} шт</div>
                    <div>Загальна вага: {totalWeightG} г</div>
                    <div>Вартість цукерок: {formatUAH(subtotalKop)}</div>
                </div>

                <form className="summary-form" onSubmit={handleSubmit}>
                    <ul className="summary-list">
                        <li><span>Кількість пакунків:</span><b>{packTotals.totalPacks}</b></li>
                        {/* ✅ нові рядки з кількістю */}
                        <li><span>Кількість цукерок у 1 пакунку:</span><b>{itemsCount} шт</b></li>
                        <li><span>Загальна кількість цукерок:</span><b>{itemsCount * packTotals.totalPacks} шт</b></li>

                        <li><span>Ціна цукерок за 1 пакунок:</span><b>{formatUAH(packTotals.perPack.fillKop)}</b></li>
                        <li><span>Ціна цукерок за {packTotals.totalPacks} пакунків:</span><b>{formatUAH(packTotals.allPacks.itemsCostAllPacksKop)}</b></li>
                        <li><span>Ціна за упаковки:</span><b>{formatUAH(packTotals.allPacks.packagingCostKop)}</b></li>
                        <li><span>Вага одного пакунка:</span><b>{totalWeightG} г</b></li>
                        <li><span>Загальна вага:</span><b>{packTotals.allPacks.totalWeightG} г</b></li>

                        <li className="summary-total">
                            <span>Разом до сплати:</span>
                            <b>{formatUAH(packTotals.allPacks.grandTotalKop)}</b>
                        </li>
                    </ul>

                    <label className="summary-label">ПІБ отримувача *</label>
                    <input
                        className="summary-input"
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Прізвище Ім'я По батькові"
                        required
                    />

                    <label className="summary-label">Номер телефону *</label>
                    <input
                        className="summary-input"
                        type="tel"
                        inputMode="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="+380 __ ___ __ __"
                        required
                    />

                    <label className="summary-label">Email (необов'язково)</label>
                    <input
                        className="summary-input"
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="email@example.com"
                    />

                    <label className="summary-label">Назва пакету</label>
                    <input
                        className="summary-input"
                        type="text"
                        value={packageName}
                        onChange={(e) => setPackageName(e.target.value)}
                        placeholder="Наприклад: Для дівчинки / Для хлопчика"
                    />

                    <label className="summary-label">Примітки</label>
                    <textarea
                        className="summary-textarea"
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Додаткові побажання до замовлення…"
                    />

                    <button
                        className="add-btn summary-submit"
                        type="submit"
                        disabled={loading || (items.length === 0 && packs.length === 0) || subtotalKop === 0}
                    >
                        {loading ? "Відправка..." : "Оформити замовлення"}
                    </button>
                    <button
                        className="summary-clear"
                        type="button"
                        onClick={clearAll}
                        disabled={loading}
                    >
                        Очистити кошик
                    </button>
                </form>
            </aside>
        </div>
    );
};

export default BasketPage;
