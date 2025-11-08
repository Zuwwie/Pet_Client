// src/pages/orders/ordersDetails/OrderDetailsPage.tsx
import { useParams, Link } from "react-router-dom";
import { useOrder } from "@/services/orders.service";
import { formatUAH } from "@/cart/store.ts";
import "./OrderDetails.css";

const OrderDetailsPage = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const { data: order, isLoading, error } = useOrder(orderId);

    if (isLoading) {
        return (
            <div className="order-details-page">
                <div className="loading">Завантаження даних замовлення...</div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="order-details-page">
                <div className="error">
                    Помилка: {(error as Error)?.message || "Замовлення не знайдено"}
                </div>
                <Link to="/orders" className="back-link">
                    ← Назад до замовлень
                </Link>
            </div>
        );
    }

    // Розрахунки для замовлення
    const calc = {
        candiesCostPerPackKop: (order.candies ?? []).reduce(
            (sum: number, c: any) => sum + Number(c?.subtotalSellKop ?? 0),
            0
        ),
        packsCountRaw: (order.packs ?? []).reduce(
            (sum: number, p: any) => sum + Number(p?.qty ?? 0),
            0
        ),
        packsCostKop: (order.packs ?? []).reduce(
            (sum: number, p: any) =>
                sum + Number(p?.subtotalSellKop ?? (Number(p?.priceKop ?? 0) * Number(p?.qty ?? 0))),
            0
        )
    };

    const packsCount = Math.max(1, calc.packsCountRaw);
    const candiesAllPacksKop = calc.candiesCostPerPackKop * packsCount;
    const grandTotalKop = candiesAllPacksKop + calc.packsCostKop;

    // Сортування цукерок
    const sortedCandies = [...(order.candies ?? [])].sort((a, b) => {
        const qtyA = Number(a.qtyPieces ?? 0);
        const qtyB = Number(b.qtyPieces ?? 0);
        if (qtyA !== qtyB) return qtyB - qtyA;
        const priceA = Number(a.piecePriceKop ?? 0);
        const priceB = Number(b.piecePriceKop ?? 0);
        return priceB - priceA;
    });

    const statusColors: Record<string, string> = {
        "нове": "status-new",
        "підтверджено": "status-processing",
        "збирається": "status-processing",
        "відправлено": "status-processing",
        "отримано": "status-completed",
    };

    return (
        <div className="order-details-page">
            <div className="order-details-header">
                <Link to="/orders" className="back-link">
                    ← Назад до замовлень
                </Link>
                <h1>Замовлення #{order.orderNumber}</h1>
            </div>

            <div className="order-details-card">
                {/* Загальна інформація */}
                <div className="order-general-info">
                    <div className="info-section">
                        <h3>Інформація про замовлення</h3>
                        <div className="info-grid">
                            <div className="info-item">
                                <strong>Статус:</strong>
                                <span className={`status-badge ${statusColors[order.status] || "status-default"}`}>
                                    {order.status}
                                </span>
                            </div>
                            <div className="info-item">
                                <strong>Дата створення:</strong>
                                <span>
                                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString("uk-UA") : "Невідома дата"}
                                </span>
                            </div>
                            <div className="info-item">
                                <strong>Загальна сума:</strong>
                                <span className="total-amount">{formatUAH(grandTotalKop)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="info-section">
                        <h3>Інформація про клієнта</h3>
                        <div className="info-grid">
                            <div className="info-item">
                                <strong>Ім'я:</strong>
                                <span>{order.customer?.name || order.customerName || "Не вказано"}</span>
                            </div>
                            <div className="info-item">
                                <strong>Телефон:</strong>
                                <span>{order.customer?.phone || order.phone || "Не вказано"}</span>
                            </div>
                            <div className="info-item">
                                <strong>Email:</strong>
                                <span>{order.customer?.email || order.email || "Не вказано"}</span>
                            </div>
                        </div>
                    </div>

                    {order.comment && (
                        <div className="info-section">
                            <h3>Коментар до замовлення</h3>
                            <div className="order-comment">{order.comment}</div>
                        </div>
                    )}
                </div>

                {/* Склад замовлення */}
                <div className="order-composition">
                    <h3>Склад замовлення</h3>

                    {/* Цукерки */}
                    <div className="items-section">
                        <h4>Цукерки ({sortedCandies.length})</h4>
                        <div className="items-table">
                            <div className="table-header">
                                <div className="col-index">#</div>
                                <div className="col-name">Назва</div>
                                <div className="col-qty">Кількість</div>
                                <div className="col-weight">Вага</div>
                                <div className="col-price">Ціна за шт</div>
                                <div className="col-total">Сума</div>
                            </div>
                            {sortedCandies.map((candy: any, index: number) => {
                                const qtyPieces = Number(candy.qtyPieces ?? 0);
                                const weightG = Number(candy.weightG ?? 0);
                                const subtotalSellKop = Number(candy.subtotalSellKop ?? 0);
                                const unitPriceKop =
                                    Number(candy.piecePriceKop ?? 0) ||
                                    (qtyPieces > 0 ? Math.round(subtotalSellKop / qtyPieces) : 0);

                                return (
                                    <div key={candy.candyId || `candy-${index}`} className="table-row">
                                        <div className="col-index">{index + 1}</div>
                                        <div className="col-name">{candy.name || `Цукерка ${candy.candyId}`}</div>
                                        <div className="col-qty">
                                            <span>{qtyPieces} шт</span>
                                        </div>
                                        <div className="col-weight">{weightG} г</div>
                                        <div className="col-price">{formatUAH(unitPriceKop)}</div>
                                        <div className="col-total">{formatUAH(subtotalSellKop)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Пакування */}
                    {order.packs && order.packs.length > 0 && (
                        <div className="items-section">
                            <h4>Пакування ({order.packs.length})</h4>
                            <div className="items-table">
                                <div className="table-header">
                                    <div className="col-index">#</div>
                                    <div className="col-name">Назва</div>
                                    <div className="col-qty">Кількість</div>
                                    <div className="col-price">Ціна за шт</div>
                                    <div className="col-total">Сума</div>
                                </div>
                                {order.packs.map((pack: any, index: number) => (
                                    <div key={pack.packagingId || `pack-${index}`} className="table-row">
                                        <div className="col-index">{index + 1}</div>
                                        <div className="col-name">{pack.name || `Пакування ${pack.packagingId}`}</div>
                                        <div className="col-qty">{pack.qty || 0} шт</div>
                                        <div className="col-price">
                                            {formatUAH(Number(pack.priceKop ?? 0))}
                                        </div>
                                        <div className="col-total">
                                            {formatUAH(pack.subtotalSellKop ?? (Number(pack?.priceKop ?? 0) * Number(pack?.qty ?? 0)))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Підсумки */}
                <div className="order-summary-detailed">
                    <h3>Розрахунок вартості</h3>
                    <div className="summary-grid">
                        <div className="summary-row">
                            <span>Вартість цукерок (за 1 пакунок):</span>
                            <span>{formatUAH(calc.candiesCostPerPackKop)}</span>
                        </div>
                        <div className="summary-row">
                            <span>Кількість пакунків:</span>
                            <span>{packsCount}</span>
                        </div>
                        <div className="summary-row">
                            <span>Вартість цукерок за всі пакунки:</span>
                            <span>{formatUAH(candiesAllPacksKop)}</span>
                        </div>
                        <div className="summary-row">
                            <span>Вартість пакувань:</span>
                            <span>{formatUAH(calc.packsCostKop)}</span>
                        </div>
                        <div className="summary-row total">
                            <span>Разом до сплати:</span>
                            <span>{formatUAH(grandTotalKop)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderDetailsPage;