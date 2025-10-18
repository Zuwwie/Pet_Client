import { NavLink, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import "./menu.css";
import { getTotals, onCartChange } from "@/cart/store.ts";
import { IconCube, IconWeight, IconCurrencyHryvnia } from "@tabler/icons-react";

/* ====== ТУГЛ режиму замовлень (збереження у localStorage) ====== */
const ORDERS_MODE_KEY = "orders:proMode"; // "1" = розширений, "0" = простий

function OrdersModeToggle() {
    const [pro, setPro] = useState<boolean>(() => localStorage.getItem(ORDERS_MODE_KEY) === "1");

    useEffect(() => {
        const onExternal = () => setPro(localStorage.getItem(ORDERS_MODE_KEY) === "1");
        window.addEventListener("ordersProModeChange", onExternal);
        window.addEventListener("storage", onExternal);
        return () => {
            window.removeEventListener("ordersProModeChange", onExternal);
            window.removeEventListener("storage", onExternal);
        };
    }, []);

    const toggle = () => {
        const next = !pro;
        localStorage.setItem(ORDERS_MODE_KEY, next ? "1" : "0");
        setPro(next);
        window.dispatchEvent(new Event("ordersProModeChange"));
    };

    return (
        <button
            type="button"
            onClick={toggle}
            aria-pressed={pro}
            className={"orders-switch" + (pro ? " orders-switch--on" : "")}
            title={pro ? "Режим замовлень: розширений" : "Режим замовлень: простий"}
        >
            <span className="orders-switch__track"><span className="orders-switch__thumb" /></span>
            <span className="orders-switch__label">{pro ? "Розширений" : "Простий"}</span>
        </button>
    );
}
/* ================================================================ */

export default function Menu() {
    const [sum, setSum] = useState({ itemsCount: 0, totalWeightG: 0, subtotalKop: 0 });

    useEffect(() => {
        const update = () => {
            const t = getTotals();
            setSum({ itemsCount: t.itemsCount, totalWeightG: t.totalWeightG, subtotalKop: t.subtotalKop });
        };
        update();
        return onCartChange(update);
    }, []);

    const hasCart = sum.itemsCount > 0;

    // округлення до гривень
    const priceUAH = new Intl.NumberFormat("uk-UA", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Math.round(sum.subtotalKop / 100));

    return (
        <header className="topbar">
            <div className="topbar__inner">
                <div className="topbar__left">
                    <Link to="/" className="brand">
                        <span className="brand__emoji">🍬</span>
                        <span className="brand__text">CandyShop</span>
                    </Link>

                    <nav className="mainnav">
                        <NavLink
                            to="/candy"
                            className={({ isActive }) => "navlink" + (isActive ? " navlink--active" : "")}
                        >
                            Каталог
                        </NavLink>

                        <NavLink
                            to="/basket"
                            className={({ isActive }) =>
                                "navlink navlink--icon navlink--cart" +
                                (isActive ? " navlink--active" : "") +
                                (hasCart ? " navlink--cart-full" : "")
                            }
                        >
                            {({ isActive }) => (
                                <>
                  <span className="icon" aria-hidden>
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path
                          d="M3 5h3l2 10h10l2-7H7.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                      />
                      <circle cx="10" cy="19" r="1.5" fill="currentColor" />
                      <circle cx="18" cy="19" r="1.5" fill="currentColor" />
                    </svg>
                  </span>
                                    Кошик

                                    {hasCart && (
                                        <span
                                            className={"cart-pill" + (isActive ? " cart-pill--active" : "")}
                                            aria-live="polite"
                                            title={`Кількість: ${sum.itemsCount} • Вага: ${sum.totalWeightG} г • Сума: ${priceUAH} грн`}
                                        >
                      <span className="pill-group">
                        <IconCube size={20} stroke={2} className="pill-ico" aria-hidden />
                        <b>{sum.itemsCount}</b><span className="unit">&nbsp;шт.</span>
                      </span>

                      <span className="pill-group">
                        <IconWeight size={20} stroke={2} className="pill-ico" aria-hidden />
                        <b>{sum.totalWeightG}</b><span className="unit">&nbsp;г</span>
                      </span>

                      <span className="pill-group">
                        <IconCurrencyHryvnia size={20} stroke={2} className="pill-ico" aria-hidden />
                        <b>{priceUAH}</b><span className="uah-word">&nbsp;грн</span>
                      </span>
                    </span>
                                    )}
                                </>
                            )}
                        </NavLink>

                        <NavLink
                            to="/orders"
                            className={({ isActive }) => "navlink" + (isActive ? " navlink--active" : "")}
                        >
                            Замовлення
                        </NavLink>

                        {/* Адмін панель — видалено */}
                    </nav>
                </div>

                <div className="topbar__right">
                    <OrdersModeToggle />
                    <div className="user">
                        <div className="user__name">Адміністратор</div>
                        <div className="user__role">Admin</div>
                    </div>
                    <button className="btn btn--ghost">Вийти</button>
                </div>
            </div>
        </header>
    );
}
