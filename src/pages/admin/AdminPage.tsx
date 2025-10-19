// src/pages/admin/AdminPage.tsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { formatUAH } from "@/cart/store.ts";
import { api } from "../../services/api.services";
import "./admin.css";
import AdminCandyEditPage from "./AdminCandyEditPage";

type Candy = {
    _id: string;
    name: string;

    category?: string;
    isAvailable?: boolean;

    // вага / кількість
    weightPerPiece?: number; // г/шт (може приходити як weightPerPieceG)
    piecesPerKg?: number;    // шт/кг

    // ціни (грн)
    pricePerKgBuy?: number;
    pricePerKgSell?: number;
    pricePerPcsBuy?: number;
    pricePerPcsSell?: number;

    // альтернативно — копійки/шт (для форматування)
    piecePriceKop?: number;
};

type Order = {
    id: string;
    customerName: string;
    phone?: string;
    totalKop: number;
    createdAt?: string;
    status?: "new" | "processing" | "done";
};

// форматування
const uah = (n: number) =>
    new Intl.NumberFormat("uk-UA", {
        style: "currency",
        currency: "UAH",
        maximumFractionDigits: 2,
    }).format(n);

const showUAH = (n?: number) => (typeof n === "number" ? uah(n) : "—");
const showUAHKop = (kop?: number) =>
    typeof kop === "number"
        ? (typeof formatUAH === "function" ? formatUAH(kop) : uah(kop / 100))
        : "—";

// % націнки за ціною/шт
const calcMarkupPct = (buy?: number, sell?: number): number | undefined => {
    if (typeof buy === "number" && buy > 0 && typeof sell === "number") {
        return ((sell - buy) / buy) * 100;
    }
    return undefined;
};
const fmtPct = (n?: number) => (typeof n === "number" ? `${n.toFixed(0)}%` : "—");

// Нормалізація елемента цукерки з бекенда/форми до відображення в таблиці
const toCandy = (it: any): Candy => {
    const _id = it._id ?? it.id ?? "";
    const name = it.name ?? "";
    const category = it.category;
    const isAvailable = it.isAvailable;

    const weightPerPiece: number | undefined =
        typeof it.weightPerPiece === "number"
            ? it.weightPerPiece
            : typeof it.weightPerPieceG === "number"
                ? it.weightPerPieceG
                : undefined;

    const piecesPerKg: number | undefined =
        typeof it.piecesPerKg === "number"
            ? it.piecesPerKg
            : typeof weightPerPiece === "number" && weightPerPiece > 0
                ? Math.round(1000 / weightPerPiece)
                : undefined;

    const pricePerKgBuy: number | undefined =
        typeof it.pricePerKgBuy === "number" ? it.pricePerKgBuy : undefined;

    const pricePerKgSell: number | undefined =
        typeof it.pricePerKgSell === "number" ? it.pricePerKgSell : undefined;

    const pricePerPcsBuy: number | undefined =
        typeof it.pricePerPcsBuy === "number"
            ? it.pricePerPcsBuy
            : typeof pricePerKgBuy === "number" && typeof weightPerPiece === "number"
                ? (pricePerKgBuy * weightPerPiece) / 1000
                : undefined;

    const pricePerPcsSell: number | undefined =
        typeof it.pricePerPcsSell === "number"
            ? it.pricePerPcsSell
            : typeof pricePerKgSell === "number" && typeof weightPerPiece === "number"
                ? (pricePerKgSell * weightPerPiece) / 1000
                : undefined;

    const piecePriceKop =
        typeof pricePerPcsSell === "number" ? Math.round(pricePerPcsSell * 100) : undefined;

    return {
        _id,
        name,
        category,
        isAvailable,
        weightPerPiece,
        piecesPerKg,
        pricePerKgBuy,
        pricePerKgSell,
        pricePerPcsBuy,
        pricePerPcsSell,
        piecePriceKop,
    };
};

export default function AdminPage() {
    const [sp, setSp] = useSearchParams();
    const tab = sp.get("tab") === "orders" ? "orders" : "candies";
    const setTab = (t: "candies" | "orders") => {
        const next = new URLSearchParams(sp);
        next.set("tab", t);
        setSp(next, { replace: true });
    };

    const [candies, setCandies] = useState<Candy[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // ===== load data
    useEffect(() => {
        let aborted = false;

        (async () => {
            setLoading(true);
            setErrorMsg(null);

            try {
                if (tab === "candies") {
                    const { data: raw } = await api.get<any[] | { items: any[] }>("candy");
                    const arr = Array.isArray(raw) ? raw : raw?.items ?? [];
                    const list: Candy[] = arr.map(toCandy);
                    if (!aborted) setCandies(list);
                } else {
                    const { data } = await api.get<any[] | { items: any[] }>("orders");
                    const arr = Array.isArray(data) ? data : data?.items ?? [];
                    const list: Order[] = arr.map((o: any) => ({
                        id: o.id ?? o._id ?? "",
                        customerName: o.customerName ?? o.customer?.name ?? "Клієнт",
                        phone: o.phone ?? o.customer?.phone,
                        totalKop:
                            typeof o.totalKop === "number"
                                ? o.totalKop
                                : Math.round(((o.total ?? 0) as number) * 100),
                        createdAt: o.createdAt,
                        status: (o.status as Order["status"]) ?? "new",
                    }));
                    if (!aborted) setOrders(list);
                }
            } catch (err: any) {
                if (!aborted) {
                    setErrorMsg(err?.message || "Помилка завантаження");
                    tab === "candies" ? setCandies([]) : setOrders([]);
                }
            } finally {
                if (!aborted) setLoading(false);
            }
        })();

        return () => {
            aborted = true;
        };
    }, [tab]);

    // ===== edit modal
    const [editId, setEditId] = useState<string | null>(null);

    const handleSaved = (u: any) => {
        const next = toCandy(u);
        setCandies((prev) => {
            const idx = prev.findIndex((c) => c._id === next._id);
            if (idx >= 0) {
                // оновити існуючий
                const copy = prev.slice();
                copy[idx] = { ...prev[idx], ...next };
                return copy;
            }
            // додати новий на початок
            return [next, ...prev];
        });
    };

    const handleDeleted = (id: string) => {
        setCandies((prev) => prev.filter((c) => c._id !== id));
    };

    return (
        <div className="admin">
            <header className="admin__top">
                <h1 className="admin__title">Адмін панель</h1>
                <nav className="admin__tabs">
                    <button
                        className={"admin__tab" + (tab === "candies" ? " admin__tab--active" : "")}
                        onClick={() => setTab("candies")}
                        type="button"
                    >
                        Керування цукерками
                    </button>
                    <button
                        className={"admin__tab" + (tab === "orders" ? " admin__tab--active" : "")}
                        onClick={() => setTab("orders")}
                        type="button"
                    >
                        Керування замовленнями
                    </button>
                </nav>
            </header>

            <main className="admin__content">
                {tab === "candies" && (
                    <>
                        {/* Тулбар з кнопкою додавання */}
                        <div style={{ display: "flex", justifyContent: "flex-end", margin: "8px 0 12px" }}>
                            <button className="btn btn-primary" onClick={() => setEditId("new")} disabled={loading}>
                                Додати цукерку
                            </button>
                        </div>

                        {loading ? (
                            <div className="card admin__card">Завантаження…</div>
                        ) : errorMsg ? (
                            <div className="card admin__card error">Помилка: {errorMsg}</div>
                        ) : candies.length === 0 ? (
                            <div className="card admin__card">Поки що немає цукерок.</div>
                        ) : (
                            <div className="admin-table">
                                {/* Шапка */}
                                <div className="admin-row admin-row--head">
                                    <span className="cell cell--name">Назва</span>
                                    <span className="cell cell--cat">Категорія</span>
                                    <span className="cell cell--w">г/шт</span>
                                    <span className="cell cell--ppk">шт/кг</span>
                                    <span className="cell cell--kgb">₴/кг (вх)</span>
                                    <span className="cell cell--kgs">₴/кг (пр)</span>
                                    <span className="cell cell--pcb">₴/шт (вх)</span>
                                    <span className="cell cell--pcs">₴/шт (пр)</span>
                                    <span className="cell cell--markup">націнка</span>
                                    <span className="cell cell--avail">наявн.</span>
                                    <span className="cell cell--act">Дія</span>
                                </div>

                                {/* Рядки */}
                                {candies.map((c) => {
                                    const pcsSellUAH =
                                        typeof c.pricePerPcsSell === "number"
                                            ? uah(c.pricePerPcsSell)
                                            : showUAHKop(c.piecePriceKop);

                                    const markupPct = calcMarkupPct(c.pricePerPcsBuy, c.pricePerPcsSell);

                                    return (
                                        <div key={c._id} className="admin-row">
                                            <span className="cell cell--name" title={c.name}>{c.name}</span>
                                            <span className="cell cell--cat" title={c.category || "—"}>{c.category || "—"}</span>
                                            <span className="cell cell--w">
                        {typeof c.weightPerPiece === "number" ? c.weightPerPiece : "—"}
                      </span>
                                            <span className="cell cell--ppk">
                        {typeof c.piecesPerKg === "number" ? c.piecesPerKg : "—"}
                      </span>
                                            <span className="cell cell--kgb">{showUAH(c.pricePerKgBuy)}</span>
                                            <span className="cell cell--kgs">{showUAH(c.pricePerKgSell)}</span>
                                            <span className="cell cell--pcb">{showUAH(c.pricePerPcsBuy)}</span>
                                            <span className="cell cell--pcs">{pcsSellUAH}</span>
                                            <span className="cell cell--markup">{fmtPct(markupPct)}</span>
                                            <span className={"cell cell--avail " + (c.isAvailable === false ? "bad" : "ok")}>
                        {c.isAvailable === false ? "нема" : "є"}
                      </span>
                                            <span className="cell cell--act">
                        <button className="btn-edit" onClick={() => setEditId(c._id)}>
                          Редагувати
                        </button>
                      </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {tab === "orders" && (
                    <>
                        {loading ? (
                            <div className="card admin__card">Завантаження…</div>
                        ) : errorMsg ? (
                            <div className="card admin__card error">Помилка: {errorMsg}</div>
                        ) : orders.length === 0 ? (
                            <div className="card admin__card">Замовлень поки немає.</div>
                        ) : (
                            <div className="admin-list">
                                {orders.map((o) => (
                                    <article key={o.id} className="card admin-order">
                                        <div className="admin-order__line">
                                            <b>#{o.id}</b>
                                            <span className={"badge badge--" + (o.status || "new")}>{o.status || "new"}</span>
                                        </div>
                                        <div className="admin-order__line">
                                            <span>{o.customerName}</span>
                                            {o.phone ? <span className="muted">{o.phone}</span> : null}
                                        </div>
                                        <div className="admin-order__line">
                      <span className="muted">
                        {o.createdAt ? new Date(o.createdAt).toLocaleString("uk-UA") : ""}
                      </span>
                                            <b>
                                                {typeof formatUAH === "function"
                                                    ? formatUAH(o.totalKop)
                                                    : ((o.totalKop || 0) / 100).toFixed(2) + " грн"}
                                            </b>
                                        </div>
                                        <div className="admin-order__actions">
                                            <button className="btn-edit">Відкрити</button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Модалка редагування / створення */}
            {editId && (
                <AdminCandyEditPage
                    id={editId}
                    create={editId === "new"}
                    initial={editId === "new" ? {} : candies.find((c) => c._id === editId)}
                    onClose={() => setEditId(null)}
                    onSaved={handleSaved}
                    onDeleted={handleDeleted}
                />
            )}
        </div>
    );
}
