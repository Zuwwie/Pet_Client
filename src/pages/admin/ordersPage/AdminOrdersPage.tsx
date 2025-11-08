// src/pages/admin/AdminOrdersPage.tsx
import { useMemo, useState } from "react";
import { formatUAH } from "@/cart/store";
import {
    useOrders,
    useOrder,
    useUpdateOrderStatus,
    useDeleteOrder,      // ← важливо: цей хук має бути в services
    type OrderStatus,
} from "@/services/orders.service";
import "./adminOrder.css";

const STATUS_OPTIONS: OrderStatus[] = [
    "нове",
    "підтверджено",
    "збирається",
    "відправлено",
    "отримано",
];

const STATUS_CLASS: Record<OrderStatus, "new" | "processing" | "done"> = {
    нове: "new",
    підтверджено: "processing",
    збирається: "processing",
    відправлено: "processing",
    отримано: "done",
};

export default function AdminOrdersPage() {
    const { data: orders = [], isLoading, error, refetch, isFetching } = useOrders();

    const [openId, setOpenId] = useState<string | null>(null);
    const [q, setQ] = useState("");
    const [filter, setFilter] = useState<"всі" | OrderStatus>("всі");

    const filtered = useMemo(() => {
        const term = q.trim().toLowerCase();
        return orders.filter((o) => {
            const byStatus = filter === "всі" || o.status === filter;
            if (!byStatus) return false;
            if (!term) return true;
            const fields = [
                o.customerName,
                o.customer?.name,
                o.customer?.email,
                o.phone,
                o.customer?.phone,
                o.id,                         // пошук по справжньому id
                String(o.orderNumber || ""), // і по номеру
            ]
                .filter(Boolean)
                .map((s) => String(s).toLowerCase());
            return fields.some((s) => s.includes(term));
        });
    }, [orders, q, filter]);

    const stats = useMemo(() => {
        const total = filtered.reduce((s, o) => s + (o.totalKop || 0), 0);
        const cost = filtered.reduce((s, o) => s + (o.costKop || 0), 0);
        const profit = total - cost;
        const margin = total > 0 ? (profit / total) * 100 : 0;
        return { total, cost, profit, margin };
    }, [filtered]);

    if (isLoading) return <div className="admin__card">Завантаження…</div>;
    if (error) return <div className="admin__card error">Помилка: {(error as Error).message}</div>;

    return (
        <div className="admin">
            <header className="admin__top">
                <h1 className="admin__title">Управління замовленнями</h1>
                <button className="btn" onClick={() => refetch()} disabled={isFetching}>
                    Оновити
                </button>
            </header>

            {/* KPI */}
            <div className="kpi-grid">
                <KpiCard icon="💲" label="Загальний дохід" value={formatUAH(stats.total)} />
                <KpiCard icon="🧱" label="Собівартість" value={formatUAH(stats.cost)} />
                <KpiCard
                    icon="📈"
                    label="Чистий прибуток"
                    value={<span style={{ color: "#16a34a" }}>{formatUAH(stats.profit)}</span>}
                />
                <KpiCard
                    icon="📈"
                    label="Маржа"
                    value={<span style={{ color: "#7c3aed" }}>{stats.margin.toFixed(1)}%</span>}
                />
            </div>

            {/* Пошук + фільтр */}
            <div className="admin__card orders-toolbar">
                <input
                    className="admin-search__input"
                    placeholder="Пошук: ім'я, телефон, email, № або id…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />
                <select
                    className="btn-edit"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                >
                    {(["всі", ...STATUS_OPTIONS] as const).map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>
            </div>

            {filtered.length === 0 ? (
                <div className="admin__card">Немає замовлень за критеріями.</div>
            ) : (
                <div className="admin-list">
                    {filtered.map((o) => {
                        const opened = openId === o.id; // відкриваємо за справжнім id
                        return (
                            <div key={o.id}>
                                <article
                                    className="admin-order clickable"
                                    onClick={() => setOpenId(opened ? null : o.id)}
                                >
                                    <div className="admin-order__line">
                                        <b>№ {o.orderNumber || "—"}</b>
                                        <span className="muted">ID: {o.id?.slice(-6)}</span>
                                        <span className={"badge badge--" + STATUS_CLASS[o.status]}>{o.status}</span>
                                    </div>
                                    <div className="admin-order__line">
                                        <span>{o.customerName || o.customer?.name || "Клієнт"}</span>
                                        {o.phone || o.customer?.phone ? (
                                            <span className="muted">{o.phone || o.customer?.phone}</span>
                                        ) : null}
                                        {o.customer?.email ? <span className="muted">{o.customer.email}</span> : null}
                                    </div>
                                    <div className="admin-order__line">
                    <span className="muted">
                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString("uk-UA") : ""}
                    </span>
                                        <b>{formatUAH(o.totalKop)}</b>
                                    </div>
                                </article>

                                {opened && (
                                    <div className="admin__card">
                                        {/* передаємо зручні пропси: номер (для підтвердження) і колбек після видалення */}
                                        <AdminOrderInline
                                            orderId={o.id}
                                            orderNumber={o.orderNumber}
                                            onDeleted={() => setOpenId(null)}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/* ---------- Inline details ---------- */

function AdminOrderInline({
                              orderId,
                              orderNumber,
                              onDeleted,
                          }: {
    orderId: string;
    orderNumber?: string | number;
    onDeleted?: () => void;
}) {
    const { data: order, isLoading, error } = useOrder(orderId);
    const { mutate: updateStatus, isPending } = useUpdateOrderStatus();
    const { mutate: deleteOrder, isPending: isDeleting } = useDeleteOrder();

    if (isLoading) return <div>Завантаження…</div>;
    if (error || !order) return <div className="error">Помилка завантаження деталей</div>;

    const marginPct =
        order.totalKop > 0 ? (((order.profitKop || 0) / order.totalKop) * 100).toFixed(1) + "%" : "—";

    // конвертація ваги у к-сть штук (для вагових позицій)
    const calcPiecesFromWeight = (c: any) => {
        const weightG = Number(c?.weightG ?? 0);
        const pieceWeightG = Number(c?.weightPerPieceG ?? c?.pieceWeightG ?? 0);
        const piecesPerKg = Number(c?.piecesPerKg ?? 0);

        if (pieceWeightG > 0) return Math.max(0, Math.round(weightG / pieceWeightG));
        if (piecesPerKg > 0) return Math.max(0, Math.round((weightG / 1000) * piecesPerKg));
        return Number(c?.qtyPieces ?? 0) || 0;
    };

    const handleDelete = () => {
        const shortId = orderId?.slice(-6);
        const num = orderNumber ?? order.orderNumber ?? "—";
        const ok = window.confirm(`Видалити замовлення № ${num} (ID: …${shortId})? Дію неможливо скасувати.`);
        if (!ok) return;

        // видаляємо по справжньому id; після успіху — закриваємо картку
        deleteOrder(orderId, {
            onSuccess: () => {
                onDeleted?.();
            },
            onError: (e: any) => {
                console.error("Не вдалось видалити замовлення", e);
                alert(`Помилка видалення: ${e?.response?.data?.message || e?.message || "невідома помилка"}`);
            },
        });
    };

    return (
        <div className="admin-inline">
            {/* верхній ряд: статус + зміна + дії */}
            <div className="admin-inline__top">
                <span className={"badge badge--" + STATUS_CLASS[order.status]}>{order.status}</span>
                <select
                    defaultValue={order.status}
                    disabled={isPending}
                    onChange={(e) => updateStatus({ id: order.id, status: e.target.value as OrderStatus })}
                    className="btn-edit"
                    title="Змінити статус"
                >
                    {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>

                <div className="admin-inline__meta">
                    <b>{formatUAH(order.totalKop)}</b>
                    <span className="muted">
            {order.createdAt ? new Date(order.createdAt).toLocaleString("uk-UA") : ""}
          </span>
                </div>

                <div className="admin-order__actions">
                    {/* Кнопка видалення — без «копіювати ID» */}
                    <button className="btn btn--danger" onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting ? "Видалення…" : "Видалити"}
                    </button>
                </div>
            </div>

            {/* KPI для одного замовлення */}
            <div className="kpi-grid">
                <KpiCard icon="💲" label="Дохід" value={formatUAH(order.totalKop)} />
                <KpiCard icon="🧱" label="Собівартість" value={formatUAH(order.costKop || 0)} />
                <KpiCard
                    icon="📈"
                    label="Прибуток"
                    value={<span style={{ color: "#16a34a" }}>{formatUAH(order.profitKop || 0)}</span>}
                />
                <KpiCard icon="📈" label="Маржа" value={<span style={{ color: "#7c3aed" }}>{marginPct}</span>} />
            </div>

            {/* клієнт */}
            <section>
                <h3 className="section-title">Клієнт</h3>
                <div className="grid-3">
                    <Field label="Ім'я" value={order.customer?.name || "—"} />
                    <Field label="Телефон" value={order.customer?.phone || "—"} />
                    <Field label="Email" value={order.customer?.email || "—"} />
                </div>
                {order.comment ? (
                    <div className="mt-6">
                        <div className="muted field__label">Коментар</div>
                        <div className="field__value">{order.comment}</div>
                    </div>
                ) : null}
            </section>

            {/* цукерки */}
            <section>
                <h3 className="section-title">Цукерки ({order.candies?.length || 0})</h3>
                {order.candies?.length ? (
                    <div className="table-wrap">
                        <table className="order-table">
                            <thead>
                            <tr>
                                <th>Назва</th>
                                <th>Режим</th>
                                <th>К-сть (шт)</th>
                                <th>₴/шт або ₴/кг (пр)</th>
                                <th>₴/шт або ₴/кг (вх)</th>
                                <th>Сума (пр)</th>
                                <th>Сума (вх)</th>
                            </tr>
                            </thead>
                            <tbody>
                            {order.candies.map((c) => {
                                const isWeight = c.pricingMode === "kg";
                                const pcs = isWeight ? calcPiecesFromWeight(c) : Number(c.qtyPieces ?? 0);
                                const qtyDisplay = pcs + " шт" + (isWeight && c.weightG ? ` (${c.weightG} г)` : "");

                                const sellUnit = isWeight ? (c.sellPerKgKop || 0) : (c.sellUnitKop || 0);
                                const buyUnit = isWeight ? (c.buyPerKgKop || 0) : (c.buyUnitKop || 0);

                                return (
                                    <tr key={String(c.id || c.candyId)}>
                                        <td>{c.name || "—"}</td>
                                        <td>{isWeight ? "кг" : "шт"}</td>
                                        <td>{qtyDisplay}</td>
                                        <td>{formatUAH(sellUnit)}</td>
                                        <td>{formatUAH(buyUnit)}</td>
                                        <td>
                                            <b>{formatUAH(c.subtotalSellKop || 0)}</b>
                                        </td>
                                        <td>{formatUAH(c.subtotalBuyKop || 0)}</td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="muted">Немає позицій</div>
                )}
            </section>

            {/* пакування */}
            <section>
                <h3 className="section-title">Пакування ({order.packs?.length || 0})</h3>
                {order.packs?.length ? (
                    <div className="table-wrap">
                        <table className="order-table">
                            <thead>
                            <tr>
                                <th>Назва</th>
                                <th>К-сть</th>
                                <th>Ціна (пр)</th>
                                <th>Собівартість</th>
                                <th>Сума (пр)</th>
                                <th>Сума (вх)</th>
                            </tr>
                            </thead>
                            <tbody>
                            {order.packs.map((p) => (
                                <tr key={String(p.id || p.packagingId)}>
                                    <td>{p.name || "—"}</td>
                                    <td>{p.qty || 0} шт</td>
                                    <td>{formatUAH(p.sellKop || 0)}</td>
                                    <td>{formatUAH(p.buyKop || 0)}</td>
                                    <td>
                                        <b>{formatUAH(p.subtotalSellKop || 0)}</b>
                                    </td>
                                    <td>{formatUAH(p.subtotalBuyKop || 0)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="muted">Немає пакування</div>
                )}
            </section>

            {/* підсумок */}
            <section>
                <h3 className="section-title">Підсумок</h3>
                <div className="grid-4">
                    <Field label="Загальна вартість" value={<b>{formatUAH(order.totalKop)}</b>} />
                    <Field label="Собівартість" value={formatUAH(order.costKop || 0)} />
                    <Field
                        label="Прибуток"
                        value={<span style={{ color: "#16a34a" }}>{formatUAH(order.profitKop || 0)}</span>}
                    />
                    <Field label="Вага" value={(order.totalWeightG ?? 0) + " г"} />
                </div>
            </section>
        </div>
    );
}

/* ---------- UI helpers ---------- */

function KpiCard({
                     icon,
                     label,
                     value,
                 }: {
    icon: string;
    label: string;
    value: React.ReactNode;
}) {
    return (
        <div className="admin__card kpi-card">
            <div className="kpi-card__icon" aria-hidden>
                {icon}
            </div>
            <div>
                <div className="kpi-card__label">{label}</div>
                <div className="kpi-card__value">{value}</div>
            </div>
        </div>
    );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="field">
            <div className="field__label">{label}</div>
            <div className="field__value">{value}</div>
        </div>
    );
}
