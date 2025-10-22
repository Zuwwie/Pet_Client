// src/pages/admin/AdminPage.tsx
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams, useLocation, useNavigate, Outlet } from "react-router-dom";
import { formatUAH } from "@/cart/store.ts";
import { api } from "../../services/api.services";
import "./admin.css";
import AdminCandyEditPage from "./AdminCandyEditPage";

// ===== Types =====
type PricingMode = "kg" | "pcs";

type Candy = {
    _id: string;
    name: string;
    category?: string;
    pricingMode: PricingMode;
    isAvailable?: boolean;
    isAvailableManual?: boolean | null;

    weightPerPiece?: number; // g/pc

    pricePerKgBuy?: number;
    pricePerKgSell?: number;

    pricePerPcsBuy?: number;
    pricePerPcsSell?: number;

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

type SortKey =
    | "name"
    | "category"
    | "weight"
    | "kgBuy"
    | "kgSell"
    | "pcsBuy"
    | "pcsSell"
    | "markup"
    | "availability";

type SortDir = "asc" | "desc";
type Sorter = { key: SortKey; dir: SortDir };

// ===== helpers =====
const uah = (n: number) =>
    new Intl.NumberFormat("uk-UA", {
        style: "currency",
        currency: "UAH",
        maximumFractionDigits: 2,
    }).format(n);

const showUAH = (n?: number) => (typeof n === "number" ? uah(n) : "—");
const showUAHKop = (kop?: number) =>
    typeof kop === "number" ? (typeof formatUAH === "function" ? formatUAH(kop) : uah(kop / 100)) : "—";

const calcMarkupPct = (buy?: number, sell?: number): number | undefined =>
    typeof buy === "number" && buy > 0 && typeof sell === "number" ? ((sell - buy) / buy) * 100 : undefined;

const fmtPct = (n?: number) => (typeof n === "number" ? `${n.toFixed(0)}%` : "—");

const toNum = (v: unknown): number | undefined => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
};

// Функція для перевірки наявності ціни за штуку
const hasPiecePrice = (c: Candy): boolean => {
    return (typeof c.pricePerPcsSell === 'number' && c.pricePerPcsSell > 0) ||
        (typeof c.piecePriceKop === 'number' && c.piecePriceKop > 0);
};

// map raw → Candy
const toCandy = (it: any): Candy => {
    const _id = (it && (it._id ?? it.id)) || "";
    const name = String(it?.name ?? "");
    const category = it?.category;

    const pricingMode: PricingMode = it?.pricingMode === "pcs" ? "pcs" : "kg";
    const weightPerPiece = toNum(it?.weightPerPiece ?? it?.weightPerPieceG);

    const pricePerKgBuy = toNum(it?.pricePerKgBuy);
    const pricePerKgSell = toNum(it?.pricePerKgSell);
    const pricePerPcsBuy = toNum(it?.pricePerPcsBuy);
    const pricePerPcsSell = toNum(it?.pricePerPcsSell);

    const piecePriceKop = typeof pricePerPcsSell === "number" ? Math.round(pricePerPcsSell * 100) : undefined;

    return {
        _id,
        name,
        category,
        pricingMode,
        // якщо бек не повертає поле — вважаємо "є" (як було спочатку)
        isAvailable: it?.isAvailable === false ? false : true,
        isAvailableManual: typeof it?.isAvailableManual === "boolean" ? (it.isAvailableManual as boolean) : null,
        weightPerPiece,
        pricePerKgBuy,
        pricePerKgSell,
        pricePerPcsBuy,
        pricePerPcsSell,
        piecePriceKop,
    };
};

/** Компактний тумблер (без тексту, лише колір). Класи: .asw* */
const AvailSwitch = ({
                         value,
                         onToggle,
                         disabled,
                         title,
                     }: {
    value: boolean;
    onToggle: () => void;
    disabled?: boolean;
    title?: string;
}) => {
    const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) onToggle();
    };

    return (
        <button
            type="button"
            className={`asw ${value ? "asw--on" : "asw--off"}`}
            role="switch"
            aria-checked={value}
            disabled={disabled}
            onClick={handleClick}
            title={title ?? (value ? "Вимкнути наявність" : "Увімкнути наявність")}
        >
      <span className="asw__track">
        <span className="asw__thumb" />
      </span>
        </button>
    );
};

export default function AdminPage() {
    // --- tabs
    const [sp, setSp] = useSearchParams();
    const tab = sp.get("tab") === "orders" ? "orders" : "candies";
    const setTab = (t: "candies" | "orders") => {
        const next = new URLSearchParams(sp);
        next.set("tab", t);
        setSp(next, { replace: true });
    };

    // --- packaging route
    const location = useLocation();
    const navigate = useNavigate();
    const isPackaging = location.pathname.includes("/admin/packaging");
    const goCandies = () => (isPackaging ? navigate("/admin?tab=candies") : setTab("candies"));
    const goOrders = () => (isPackaging ? navigate("/admin?tab=orders") : setTab("orders"));
    const goPackaging = () => navigate("/admin/packaging");

    const [candies, setCandies] = useState<Candy[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (isPackaging) return;
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
                        totalKop: typeof o.totalKop === "number" ? o.totalKop : Math.round(((o.total ?? 0) as number) * 100),
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
    }, [tab, isPackaging]);

    // ===== пошук + сортування =====
    const [q, setQ] = useState("");
    const [sorter, setSorter] = useState<Sorter>({ key: "name", dir: "asc" });

    const toggleSort = (key: SortKey) => {
        setSorter((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
    };

    const viewCandies = useMemo(() => {
        const term = q.trim().toLowerCase();
        let arr = [...candies];

        if (term.length > 0) {
            arr = arr.filter((c) => [c.name, c.category].map((v) => (v ? String(v).toLowerCase() : "")).join(" ").includes(term));
        }

        const pcsSellKop = (c: Candy) =>
            typeof c.piecePriceKop === "number"
                ? c.piecePriceKop
                : typeof c.pricePerPcsSell === "number"
                    ? Math.round(c.pricePerPcsSell * 100)
                    : 0;

        const pcsBuyKop = (c: Candy) => (typeof c.pricePerPcsBuy === "number" ? Math.round(c.pricePerPcsBuy * 100) : 0);

        const mult = sorter.dir === "asc" ? 1 : -1;
        arr.sort((a, b) => {
            const sort = sorter.key;
            if (sort === "name") return mult * (a.name || "").localeCompare(b.name || "", "uk");
            if (sort === "category") return mult * String(a.category || "").localeCompare(String(b.category || ""), "uk");
            if (sort === "weight") return mult * ((a.weightPerPiece ?? 0) - (b.weightPerPiece ?? 0));
            if (sort === "kgBuy") return mult * ((a.pricePerKgBuy ?? 0) - (b.pricePerKgBuy ?? 0));
            if (sort === "kgSell") return mult * ((a.pricePerKgSell ?? 0) - (b.pricePerKgSell ?? 0));
            if (sort === "pcsBuy") return mult * (pcsBuyKop(a) - pcsBuyKop(b));
            if (sort === "pcsSell") return mult * (pcsSellKop(a) - pcsSellKop(b));
            if (sort === "availability") return mult * ((a.isAvailable === false ? 0 : 1) - (b.isAvailable === false ? 0 : 1));
            const mA = calcMarkupPct(a.pricePerPcsBuy, a.pricePerPcsSell) ?? -Infinity;
            const mB = calcMarkupPct(b.pricePerPcsBuy, b.pricePerPcsSell) ?? -Infinity;
            return mult * (mA - mB);
        });

        return arr;
    }, [candies, q, sorter]);

    // ===== модалка редагування =====
    const [editId, setEditId] = useState<string | null>(null);

    const handleSaved = (u: any) => {
        const next = toCandy(u);
        setCandies((prev) => {
            const idx = prev.findIndex((c) => c._id === next._id);
            if (idx >= 0) {
                const copy = prev.slice();
                copy[idx] = { ...prev[idx], ...next };
                return copy;
            }
            return [next, ...prev];
        });
    };

    const handleDeleted = (id: string) => setCandies((prev) => prev.filter((c) => c._id !== id));

    // заголовок: стрілка лише коли активна колонка
    const TH = ({ k, children, className }: { k: SortKey; children: ReactNode; className?: string }) => {
        const active = sorter.key === k;
        return (
            <span className={`cell ${className || ""}`}>
        <button
            type="button"
            className="th"
            data-dir={active ? sorter.dir : undefined}
            onClick={() => toggleSort(k)}
            aria-sort={active ? (sorter.dir === "asc" ? "ascending" : "descending") : "none"}
            title="Натисніть для сортування"
        >
          <span className="th__label">{children}</span>
        </button>
      </span>
        );
    };

    // ——— швидке перемикання наявності ———
    const [toggling, setToggling] = useState<Record<string, boolean>>({});

    const toggleAvailability = async (c: Candy) => {
        const hasWeight = typeof c.weightPerPiece === "number" && c.weightPerPiece > 0;
        const hasPrice = hasPiecePrice(c);

        // дозволяємо вимкнути завжди; вмикати — лише якщо є вага І ціна
        const desired = !(c.isAvailable === true);
        if (desired === true && (!hasWeight || !hasPrice)) return;

        setToggling((m) => ({ ...m, [c._id]: true }));
        try {
            const { data: saved } = await api.patch(`candy/${c._id}`, { isAvailableManual: desired });
            handleSaved(saved);
        } catch {
            alert("Не вдалось змінити наявність");
        } finally {
            setToggling((m) => ({ ...m, [c._id]: false }));
        }
    };

    return (
        <div className="admin">
            <header className="admin__top">
                <h1 className="admin__title">Адмін панель</h1>
                <nav className="admin__tabs">
                    <button
                        className={"admin__tab" + (tab === "candies" && !isPackaging ? " admin__tab--active" : "")}
                        onClick={goCandies}
                        type="button"
                    >
                        Керування цукерками
                    </button>
                    <button
                        className={"admin__tab" + (tab === "orders" && !isPackaging ? " admin__tab--active" : "")}
                        onClick={goOrders}
                        type="button"
                    >
                        Керування замовленнями
                    </button>
                    <button className={"admin__tab" + (isPackaging ? " admin__tab--active" : "")} onClick={goPackaging} type="button">
                        Керування упаковками
                    </button>
                </nav>
            </header>

            <main className="admin__content">
                {isPackaging ? (
                    <Outlet />
                ) : (
                    <>
                        {tab === "candies" && (
                            <>
                                <div className="admin-toolbar">
                                    <div className="admin-search">
                                        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
                                            <path d="M21 21l-4.3-4.3m1.3-5.2a7 7 0 11-14 0 7 7 0 0114 0z" fill="none" stroke="currentColor" strokeWidth="2" />
                                        </svg>
                                        <input
                                            className="admin-search__input"
                                            placeholder="Пошук: назва, категорія…"
                                            value={q}
                                            onChange={(e) => setQ(e.target.value)}
                                        />
                                        {q && (
                                            <button className="admin-search__clear" type="button" onClick={() => setQ("")} aria-label="Очистити">
                                                ×
                                            </button>
                                        )}
                                    </div>

                                    <button className="btn btn-primary" onClick={() => setEditId("new")} disabled={loading}>
                                        Додати цукерку
                                    </button>
                                </div>

                                {loading ? (
                                    <div className="admin__card">Завантаження…</div>
                                ) : errorMsg ? (
                                    <div className="admin__card error">Помилка: {errorMsg}</div>
                                ) : viewCandies.length === 0 ? (
                                    <div className="admin__card">Поки що немає цукерок.</div>
                                ) : (
                                    <div className="admin-table">
                                        <div className="admin-row admin-row--head">
                                            <TH k="name" className="cell--name">Назва</TH>
                                            <TH k="category" className="cell--cat col-cat">Категорія</TH>
                                            <TH k="weight" className="cell--w col-w">г/шт</TH>
                                            <TH k="kgBuy" className="cell--kgb col-kgb">₴/кг (вх)</TH>
                                            <TH k="kgSell" className="cell--kgs">₴/кг (пр)</TH>
                                            <TH k="pcsBuy" className="cell--pcb col-pcb">₴/шт (вх)</TH>
                                            <TH k="pcsSell" className="cell--pcs">₴/шт (пр)</TH>
                                            <TH k="markup" className="cell--markup col-markup">націнка</TH>
                                            <TH k="availability" className="cell--avail">наявн.</TH>
                                            <span className="cell cell--act">Дія</span>
                                        </div>

                                        {viewCandies.map((c) => {
                                            const kgBuyCell = c.pricingMode === "pcs" ? "—" : showUAH(c.pricePerKgBuy);
                                            const kgSellCell = c.pricingMode === "pcs" ? "—" : showUAH(c.pricePerKgSell);

                                            const pcsSellUAH =
                                                typeof c.pricePerPcsSell === "number" ? uah(c.pricePerPcsSell) : showUAHKop(c.piecePriceKop);
                                            const markupPct = calcMarkupPct(c.pricePerPcsBuy, c.pricePerPcsSell);

                                            const hasWeight = typeof c.weightPerPiece === "number" && c.weightPerPiece > 0;
                                            const hasPrice = hasPiecePrice(c);
                                            const currentlyOn = c.isAvailable !== false;

                                            return (
                                                <div key={c._id} className="admin-row">
                                                    <span className="cell cell--name" title={c.name}>{c.name}</span>
                                                    <span className="cell cell--cat col-cat" title={c.category || "—"}>{c.category || "—"}</span>
                                                    <span className="cell cell--w col-w">{typeof c.weightPerPiece === "number" ? c.weightPerPiece : "—"}</span>
                                                    <span className="cell cell--kgb col-kgb">{kgBuyCell}</span>
                                                    <span className="cell cell--kgs">{kgSellCell}</span>
                                                    <span className="cell cell--pcb col-pcb">{showUAH(c.pricePerPcsBuy)}</span>
                                                    <span className="cell cell--pcs">{pcsSellUAH}</span>
                                                    <span className="cell cell--markup col-markup">{fmtPct(markupPct)}</span>

                                                    {/* Колонка Наявність — лиш тумблер */}
                                                    <span className="cell cell--avail">
                            <AvailSwitch
                                value={currentlyOn}
                                onToggle={() => toggleAvailability(c)}
                                disabled={toggling[c._id] === true || (!hasWeight && !currentlyOn) || (!hasPrice && !currentlyOn)}
                                title={
                                    !hasWeight && !hasPrice && !currentlyOn
                                        ? "Спочатку вкажіть вагу (г/шт) та ціну за штуку"
                                        : !hasWeight && !currentlyOn
                                            ? "Спочатку вкажіть вагу (г/шт)"
                                            : !hasPrice && !currentlyOn
                                                ? "Спочатку вкажіть ціну за штуку"
                                                : currentlyOn
                                                    ? "Вимкнути наявність"
                                                    : "Увімкнути наявність"
                                }
                            />
                          </span>

                                                    {/* Колонка Дія — лише кнопка редагування */}
                                                    <span className="cell cell--act">
                            <button className="btn-edit" onClick={() => setEditId(c._id)} title="Редагувати">
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
                                    <div className="admin__card">Завантаження…</div>
                                ) : errorMsg ? (
                                    <div className="admin__card error">Помилка: {errorMsg}</div>
                                ) : orders.length === 0 ? (
                                    <div className="admin__card">Замовлень поки немає.</div>
                                ) : (
                                    <div className="admin-list">
                                        {orders.map((o) => (
                                            <article key={o.id} className="admin-order">
                                                <div className="admin-order__line">
                                                    <b>#{o.id}</b>
                                                    <span className={"badge badge--" + (o.status || "new")}>{o.status || "new"}</span>
                                                </div>
                                                <div className="admin-order__line">
                                                    <span>{o.customerName}</span>
                                                    {o.phone ? <span className="muted">{o.phone}</span> : null}
                                                </div>
                                                <div className="admin-order__line">
                                                    <span className="muted">{o.createdAt ? new Date(o.createdAt).toLocaleString("uk-UA") : ""}</span>
                                                    <b>{typeof formatUAH === "function" ? formatUAH(o.totalKop) : ((o.totalKop || 0) / 100).toFixed(2) + " грн"}</b>
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
                    </>
                )}
            </main>

            {!isPackaging && editId && (
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