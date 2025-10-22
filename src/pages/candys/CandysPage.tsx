import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllCandy } from "../../services/candy.service";
import type { ICandy } from "../../../models/ICandy";
import OneCandyPage from "./OneCandyPage";
import OneCandyRow from "./OneCandyRow";
import "./candy.css";

type ViewMode = "cards" | "rows";

/* ---- сортування ---- */
type SortKey = "name" | "category" | "priceKg" | "pricePcs" | "availability";
type SortDir = "asc" | "desc";
type Sorter = { key: SortKey; dir: SortDir };

export default function CandysPage() {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["candy:list"],
        queryFn: getAllCandy,
    });

    /* ---- режим відображення ---- */
    const [view, setView] = useState<ViewMode>(() => {
        const saved = localStorage.getItem("catalog:view");
        return saved === "rows" ? "rows" : "cards";
    });
    useEffect(() => {
        localStorage.setItem("catalog:view", view);
    }, [view]);

    /* ---- пошук ---- */
    const [q, setQ] = useState<string>(() => localStorage.getItem("catalog:q") || "");
    useEffect(() => {
        localStorage.setItem("catalog:q", q);
    }, [q]);

    /* ---- helpers для ваги/ціни/наявності ---- */
    const weightOf = (c: any) => c.weightPerPiece ?? c.weightPerPieceG;
    const pcsPriceOf = (c: any) =>
        c.pricePerPcsSell ??
        (typeof c.pricePerKgSell === "number" && typeof weightOf(c) === "number"
            ? (c.pricePerKgSell * weightOf(c)) / 1000
            : undefined);
    const isAvailable = (c: any) =>
        c.isAvailable !== false &&
        (pcsPriceOf(c) !== undefined || typeof c.pricePerKgSell === "number");

    /* ---- сортування (зберігаємо у LS) ---- */
    const [sorter, setSorter] = useState<Sorter>(() => {
        const raw = localStorage.getItem("catalog:sort");
        try {
            const parsed = raw ? (JSON.parse(raw) as Sorter) : null;
            if (parsed && parsed.key && (parsed.dir === "asc" || parsed.dir === "desc")) return parsed;
        } catch {}
        return { key: "name", dir: "asc" };
    });
    useEffect(() => {
        localStorage.setItem("catalog:sort", JSON.stringify(sorter));
    }, [sorter]);

    const toggleSort = (key: SortKey) => {
        setSorter((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
    };

    /* ---- відфільтрований + відсортований список ---- */
    const sorted = useMemo<ICandy[]>(() => {
        if (!data) return [];
        const term = q.trim().toLowerCase();

        const list = data.filter((c: any) => {
            if (!term) return true;
            const bucket = `${c.name ?? ""} ${c.category ?? ""}`.toLowerCase();
            return bucket.includes(term);
        });

        const coll = new Intl.Collator("uk");
        const w = (c: any) => c.weightPerPiece ?? c.weightPerPieceG;
        const pcs = (c: any) =>
            c.pricePerPcsSell ??
            (typeof c.pricePerKgSell === "number" && typeof w(c) === "number"
                ? (c.pricePerKgSell * w(c)) / 1000
                : undefined);
        const avail = (c: any) =>
            c.isAvailable !== false &&
            (pcs(c) !== undefined || typeof c.pricePerKgSell === "number");

        const numVal = (v: number | undefined, dir: "asc" | "desc") => {
            if (typeof v === "number") return v;
            return dir === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
        };
        const mult = sorter.dir === "asc" ? 1 : -1;

        const cmpInsideGroup = (a: any, b: any) => {
            switch (sorter.key) {
                case "name":
                    return mult * coll.compare(String(a.name), String(b.name));
                case "category":
                    return mult * coll.compare(String(a.category ?? ""), String(b.category ?? ""));
                case "priceKg":
                    return mult * (numVal(a.pricePerKgSell, sorter.dir) - numVal(b.pricePerKgSell, sorter.dir));
                case "pricePcs":
                    return mult * (numVal(pcs(a), sorter.dir) - numVal(pcs(b), sorter.dir));
                case "availability":
                    return mult * coll.compare(String(a.name), String(b.name));
                default:
                    return 0;
            }
        };

        return [...list].sort((a: any, b: any) => {
            const gA = avail(a) ? 1 : 0;
            const gB = avail(b) ? 1 : 0;
            if (gA !== gB) return gB - gA;            // 1) спочатку в наявності
            const r = cmpInsideGroup(a, b);           // 2) потім — вибране сортування
            if (r !== 0) return r;
            return coll.compare(String(a.name), String(b.name)); // 3) стабілізатор
        });
    }, [data, q, sorter]);

    /* ---- Loading ---- */
    if (isLoading) {
        return (
            <div className="catalog-page">
                <div className="catalog-head catalog-head--with-controls">
                    <h1 className="catalog-title">Каталог</h1>
                    <div className="catalog-controls">
                        <SearchBox q={q} setQ={setQ} disabled />
                        <ViewSwitch view={view} setView={setView} />
                    </div>
                </div>
                <div className="products-grid">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="product-card sk" />
                    ))}
                </div>
            </div>
        );
    }

    /* ---- Errors / Empty ---- */
    if (isError) return <p className="error">Помилка: {(error as Error).message}</p>;

    if (!sorted.length) {
        return (
            <div className="catalog-page">
                <div className="catalog-head catalog-head--with-controls">
                    <h1 className="catalog-title">Каталог</h1>
                    <div className="catalog-controls">
                        <SearchBox q={q} setQ={setQ} />
                        <ViewSwitch view={view} setView={setView} />
                    </div>
                </div>
                <p className="muted">Нічого не знайдено.</p>
            </div>
        );
    }

    /* ---- Content ---- */
    return (
        <div className="catalog-page">
            <div className="catalog-head catalog-head--with-controls">
                <h1 className="catalog-title">Каталог</h1>
                <div className="catalog-controls">
                    <SearchBox q={q} setQ={setQ} />
                    {view === "cards" && (
                        <SortBar
                            sorter={sorter}
                            onToggleKey={(k) => toggleSort(k)}
                            onToggleDir={() => setSorter((s) => ({ ...s, dir: s.dir === "asc" ? "desc" : "asc" }))}
                        />
                    )}
                    <ViewSwitch view={view} setView={setView} />
                </div>
            </div>

            {view === "cards" ? (
                <div className="products-grid">
                    {sorted.map((c: ICandy) => (
                        <OneCandyPage key={(c as any)._id ?? c.name} candy={c} />
                    ))}
                </div>
            ) : (
                <div className="catalog-rows">
                    <div className="row-card row-head">
                        <div className="row-media" />
                        <TH sorter={sorter} onToggle={toggleSort} k="name" className="row-col row-col--name">Назва</TH>
                        <TH sorter={sorter} onToggle={toggleSort} k="category" className="row-col row-col--category">Категорія</TH>
                        <TH sorter={sorter} onToggle={toggleSort} k="priceKg" className="row-col row-col--pricekg">₴/кг</TH>
                        <TH sorter={sorter} onToggle={toggleSort} k="pricePcs" className="row-col row-col--pricepc">₴/шт</TH>
                        <div className="row-col row-col--qty">К-сть</div>
                        <div className="row-col row-col--grams">грам</div>
                        <div className="row-col row-col--total">Сума</div>
                        <div className="row-col row-col--act">Дія</div>
                    </div>

                    {sorted.map((c: ICandy) => (
                        <OneCandyRow key={(c as any)._id ?? c.name} candy={c} />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ===== Components ===== */

function ViewSwitch({ view, setView }: { view: ViewMode; setView: (v: ViewMode) => void }) {
    return (
        <div className="seg" role="tablist" aria-label="Стиль відображення">
            <button
                type="button"
                role="tab"
                aria-selected={view === "cards"}
                className={`seg-btn ${view === "cards" ? "is-active" : ""}`}
                onClick={() => setView("cards")}
            >Картки</button>
            <button
                type="button"
                role="tab"
                aria-selected={view === "rows"}
                className={`seg-btn ${view === "rows" ? "is-active" : ""}`}
                onClick={() => setView("rows")}
            >Рядок</button>
        </div>
    );
}

function SortBar({
                     sorter, onToggleKey, onToggleDir,
                 }: { sorter: Sorter; onToggleKey: (k: SortKey) => void; onToggleDir: () => void }) {
    const Btn = ({ k, label }: { k: SortKey; label: string }) => (
        <button
            type="button"
            className={`seg-btn ${sorter.key === k ? "is-active" : ""}`}
            aria-pressed={sorter.key === k}
            onClick={() => onToggleKey(k)}
        >
            {label}
            {sorter.key === k ? <span className="sortbar__arrow" aria-hidden="true">{sorter.dir === "asc" ? "▲" : "▼"}</span> : null}
        </button>
    );
    return (
        <div className="sortbar">
            <div className="seg" role="group" aria-label="Сортувати за">
                <Btn k="name" label="Назва" />
                <Btn k="category" label="Категорія" />
                <Btn k="pricePcs" label="₴/шт" />
                <Btn k="priceKg" label="₴/кг" />
                <Btn k="availability" label="Наявність" />
            </div>
            <button className="sortbar__dir" type="button" onClick={onToggleDir}
                    title={sorter.dir === "asc" ? "За зростанням" : "За спаданням"}
                    aria-label={sorter.dir === "asc" ? "За зростанням" : "За спаданням"}>
                {sorter.dir === "asc" ? "▲" : "▼"}
            </button>
        </div>
    );
}

function TH({
                k, children, className, sorter, onToggle,
            }: { k: SortKey; children: ReactNode; className?: string; sorter: Sorter; onToggle: (k: SortKey) => void }) {
    const active = sorter.key === k;
    const arrow = sorter.dir === "asc" ? "▲" : "▼";
    return (
        <div className={className ?? "row-col"}>
            <button
                type="button"
                onClick={() => onToggle(k)}
                className="th"
                aria-sort={active ? (sorter.dir === "asc" ? "ascending" : "descending") : "none"}
                title="Натисніть для сортування"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}
            >
                <span>{children}</span>
                {active && <span aria-hidden="true" style={{ opacity: .75 }}>{arrow}</span>}
            </button>
        </div>
    );
}

/* Пошук */
function SearchBox({ q, setQ, disabled = false }: { q: string; setQ: (v: string) => void; disabled?: boolean }) {
    return (
        <div className="catalog-search">
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 21l-4.3-4.3m1.3-5.2a7 7 0 11-14 0 7 7 0 0114 0z" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
            <input
                className="catalog-search__input"
                placeholder="Пошук: назва, категорія…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") setQ(""); }}
                disabled={disabled}
            />
            {q && !disabled && (
                <button className="catalog-search__clear" type="button" onClick={() => setQ("")} aria-label="Очистити">×</button>
            )}
        </div>
    );
}
