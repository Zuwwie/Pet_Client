// src/pages/candys/CandysPage.tsx
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllCandy } from "../../services/candy.service";
import type { ICandy } from "../../../models/ICandy";
import OneCandyPage from "./OneCandyPage";
import OneCandyRow from "./OneCandyRow";
import "./candy.css";

type ViewMode = "cards" | "rows";

export default function CandysPage() {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["candy:list"],
        queryFn: getAllCandy,
    });

    const [view, setView] = useState<ViewMode>(() => {
        const saved = localStorage.getItem("catalog:view");
        return saved === "rows" ? "rows" : "cards";
    });

    useEffect(() => {
        localStorage.setItem("catalog:view", view);
    }, [view]);

    // -------- Loading --------
    if (isLoading) {
        return (
            <>
                <div className="catalog-head">
                    <h1 className="catalog-title">Каталог</h1>
                    <div className="seg" aria-hidden>
                        <button className="seg-btn is-active" type="button">Картки</button>
                        <button className="seg-btn" type="button">Рядок</button>
                    </div>
                </div>
                <div className="products-grid">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="product-card sk" />
                    ))}
                </div>
            </>
        );
    }

    // -------- Errors / Empty --------
    if (isError) return <p className="error">Помилка: {(error as Error).message}</p>;

    if (!data?.length) {
        return (
            <>
                <div className="catalog-head">
                    <h1 className="catalog-title">Каталог</h1>
                    <div className="seg" role="tablist" aria-label="Стиль відображення">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={view === "cards"}
                            className={`seg-btn ${view === "cards" ? "is-active" : ""}`}
                            onClick={() => setView("cards")}
                        >
                            Картки
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={view === "rows"}
                            className={`seg-btn ${view === "rows" ? "is-active" : ""}`}
                            onClick={() => setView("rows")}
                        >
                            Рядок
                        </button>
                    </div>
                </div>
                <p className="muted">Наразі немає товарів.</p>
            </>
        );
    }

    // -------- Content --------
    return (
        <>
            <div className="catalog-head">
                <h1 className="catalog-title">Каталог</h1>
                <div className="seg" role="tablist" aria-label="Стиль відображення">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={view === "cards"}
                        className={`seg-btn ${view === "cards" ? "is-active" : ""}`}
                        onClick={() => setView("cards")}
                    >
                        Картки
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={view === "rows"}
                        className={`seg-btn ${view === "rows" ? "is-active" : ""}`}
                        onClick={() => setView("rows")}
                    >
                        Рядок
                    </button>
                </div>
            </div>

            {view === "cards" ? (
                <div className="products-grid">
                    {data.map((c: ICandy) => (
                        <OneCandyPage key={c._id} candy={c} />
                    ))}
                </div>
            ) : (
                <div className="catalog-rows">
                    {/* Шапка таблиці */}
                    <div className="row-card row-head">
                        <div className="row-media" />
                        <div className="row-col row-col--name">Назва</div>
                        <div className="row-col row-col--pricekg">₴/кг</div>
                        <div className="row-col row-col--pricepc">₴/шт</div>
                        <div className="row-col row-col--qty">К-сть</div>
                        <div className="row-col row-col--grams">грам</div>
                        <div className="row-col row-col--total">Сума</div>
                        <div className="row-col row-col--avail">Наявн.</div>
                        <div className="row-col row-col--act">Дія</div>
                    </div>

                    {/* Рядки товарів */}
                    {data.map((c: ICandy) => (
                        <OneCandyRow key={c._id} candy={c} />
                    ))}
                </div>
            )}
        </>
    );
}
