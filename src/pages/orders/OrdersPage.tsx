import { useState, useMemo } from "react";
import { useOrders } from "@/services/orders.service";
import { formatUAH } from "@/cart/store.ts";
import { Link } from "react-router-dom";
import "./orders.css";

const OrderCard = ({ order }: { order: any }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const calc = useMemo(() => {
        const candiesCostPerPackKop = (order.candies ?? []).reduce(
            (sum: number, c: any) => sum + Number(c?.subtotalSellKop ?? 0),
            0
        );

        const packsCountRaw = (order.packs ?? []).reduce(
            (sum: number, p: any) => sum + Number(p?.qty ?? 0),
            0
        );
        const packsCount = Math.max(1, packsCountRaw);

        const packsCostKop = (order.packs ?? []).reduce(
            (sum: number, p: any) =>
                sum + Number(p?.subtotalSellKop ?? (Number(p?.priceKop ?? 0) * Number(p?.qty ?? 0))),
            0
        );

        const candiesAllPacksKop = candiesCostPerPackKop * packsCount;
        const grandTotalKop = candiesAllPacksKop + packsCostKop;

        return { candiesCostPerPackKop, packsCount, packsCostKop, candiesAllPacksKop, grandTotalKop, packsCountRaw };
    }, [order]);

    // 🔹 Сортування: кількість ↓, потім ціна за шт ↓
    const sortedCandies = useMemo(() => {
        return [...(order.candies ?? [])].sort((a, b) => {
            const qtyA = Number(a.qtyPieces ?? 0);
            const qtyB = Number(b.qtyPieces ?? 0);
            if (qtyA !== qtyB) return qtyB - qtyA;
            const priceA = Number(a.piecePriceKop ?? 0);
            const priceB = Number(b.piecePriceKop ?? 0);
            return priceB - priceA;
        });
    }, [order.candies]);

    const statusColors: Record<string, string> = {
        "нове": "status-new",
        "підтверджено": "status-processing",
        "збирається": "status-processing",
        "відправлено": "status-processing",
        "отримано": "status-completed",
    };

    const orderId = order.id || order._id;

    return (
        <div className="order-card">
            <div className="order-header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="order-main-info">
                    <div className="order-number">Замовлення #{order.orderNumber}</div>
                    <div className="customer-info">
                        <strong>{order.customer?.name || order.customerName}</strong>
                        <span>{order.customer?.phone || order.phone}</span>
                        {(order.customer?.email || order.email) && (
                            <span>{order.customer?.email || order.email}</span>
                        )}
                    </div>
                </div>

                <div className="order-meta">
                    <span className={`status-badge ${statusColors[order.status] || "status-default"}`}>
                        {order.status}
                    </span>
                    <div className="order-total">{formatUAH(calc.grandTotalKop)}</div>
                    <div className="order-date">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString("uk-UA") : "Невідома дата"}
                    </div>

                    {/* Кнопка детальніше */}
                    <Link
                        to={`/orders/${orderId}`}
                        className="details-btn"
                        onClick={(e) => e.stopPropagation()} // Запобігає спрацюванню кліку на всьому заголовку
                    >
                        Детальніше
                    </Link>

                    <button className="expand-btn">{isExpanded ? "▲" : "▼"}</button>
                </div>
            </div>

            {isExpanded && (
                <div className="order-details">
                    {order.comment && (
                        <div className="order-comment">
                            <strong>Коментар:</strong> {order.comment}
                        </div>
                    )}

                    <div className="order-items">
                        <div className="items-section">
                            <h4>Цукерки ({sortedCandies.length})</h4>
                            {sortedCandies.map((candy: any, index: number) => {
                                const qtyPieces = Number(candy.qtyPieces ?? 0);
                                const weightG = Number(candy.weightG ?? 0);
                                const subtotalSellKop = Number(candy.subtotalSellKop ?? 0);
                                const unitPriceKop =
                                    Number(candy.piecePriceKop ?? 0) ||
                                    (qtyPieces > 0 ? Math.round(subtotalSellKop / qtyPieces) : 0);

                                return (
                                    <div
                                        key={candy.candyId || `candy-${index}`}
                                        className="item-row"
                                    >
                                        <div className="item-index">{index + 1}.</div>
                                        <div className="item-name">{candy.name || `Цукерка ${candy.candyId}`}</div>
                                        <div className="item-qty">
                                            <span className="qty-black">{qtyPieces} шт</span>
                                            <span className="item-unit">
                                                {formatUAH(unitPriceKop)} / шт
                                            </span>
                                        </div>
                                        <div className="item-weight">{weightG} г</div>
                                        <div className="item-price">{formatUAH(subtotalSellKop)}</div>
                                    </div>
                                );
                            })}
                        </div>

                        {order.packs && order.packs.length > 0 && (
                            <div className="items-section">
                                <h4>Пакування ({order.packs.length})</h4>
                                {order.packs.map((pack: any, index: number) => (
                                    <div key={pack.packagingId || `pack-${index}`} className="item-row">
                                        <div className="item-index">{index + 1}.</div>
                                        <div className="item-name">{pack.name || `Пакування ${pack.packagingId}`}</div>
                                        <div className="item-qty qty-black">{pack.qty || 0} шт</div>
                                        <div className="item-price">
                                            {formatUAH(pack.subtotalSellKop ?? (Number(pack?.priceKop ?? 0) * Number(pack?.qty ?? 0)))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="order-summary">
                        <div className="summary-row">
                            <span>Вартість цукерок (за 1 пакунок):</span>
                            <span>{formatUAH(calc.candiesCostPerPackKop)}</span>
                        </div>
                        <div className="summary-row">
                            <span>Кількість пакунків:</span>
                            <span>{calc.packsCount}</span>
                        </div>
                        <div className="summary-row">
                            <span>Вартість цукерок за всі пакунки:</span>
                            <span>{formatUAH(calc.candiesAllPacksKop)}</span>
                        </div>
                        <div className="summary-row">
                            <span>Вартість пакувань:</span>
                            <span>{formatUAH(calc.packsCostKop)}</span>
                        </div>
                        <div className="summary-row summary-total">
                            <span>Разом до сплати (цукерки × пакунки + пакування):</span>
                            <span>{formatUAH(calc.grandTotalKop)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function OrdersPage() {
    const [statusFilter, setStatusFilter] = useState<string>("всі");
    const [searchQuery, setSearchQuery] = useState("");
    const { data: orders = [], isLoading, error } = useOrders();

    const filteredOrders = useMemo(() => {
        return orders.filter((order: any) => {
            const matchesStatus = statusFilter === "всі" || order.status === statusFilter;
            const q = searchQuery.toLowerCase();
            const matchesSearch =
                q === "" ||
                order.customerName?.toLowerCase?.().includes(q) ||
                order.customer?.name?.toLowerCase?.().includes(q) ||
                order.phone?.includes(searchQuery) ||
                order.customer?.phone?.includes(searchQuery) ||
                order.id?.toLowerCase?.().includes(q) ||
                String(order.orderNumber || "").includes(searchQuery);
            return matchesStatus && matchesSearch;
        });
    }, [orders, statusFilter, searchQuery]);

    const statuses = useMemo(() => {
        const allStatuses = orders.map((order: any) => order.status);
        return ["всі", ...Array.from(new Set(allStatuses))];
    }, [orders]);

    if (isLoading)
        return (
            <div className="orders-page">
                <div className="loading">Завантаження замовлень...</div>
            </div>
        );

    if (error)
        return (
            <div className="orders-page">
                <div className="error">Помилка: {(error as Error).message}</div>
            </div>
        );

    return (
        <div className="orders-page">
            <div className="orders-header">
                <h1>Замовлення ({filteredOrders.length})</h1>
                <div className="orders-controls">
                    <input
                        type="text"
                        placeholder="Пошук..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="status-filter"
                    >
                        {statuses.map((status) => (
                            <option key={status} value={status}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="orders-list">
                {filteredOrders.length === 0 ? (
                    <div className="empty-state">
                        {searchQuery || statusFilter !== "всі"
                            ? "Не знайдено замовлень за вашими критеріями"
                            : "Немає замовлень"}
                    </div>
                ) : (
                    filteredOrders.map((order: any) => (
                        <OrderCard key={order.id || order._id} order={order} />
                    ))
                )}
            </div>
        </div>
    );
}