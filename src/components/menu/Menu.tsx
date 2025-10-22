import {NavLink, Link} from "react-router-dom";
import {useEffect, useRef, useState} from "react";
import "./menu.css";
import {getTotals, onCartChange} from "@/cart/store.ts";
import {IconCube, IconWeight, IconCurrencyHryvnia} from "@tabler/icons-react";

export default function Menu() {
    const [sum, setSum] = useState({itemsCount: 0, totalWeightG: 0, subtotalKop: 0});
    const [stuck, setStuck] = useState(false);
    const innerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const update = () => {
            const t = getTotals();
            setSum({itemsCount: t.itemsCount, totalWeightG: t.totalWeightG, subtotalKop: t.subtotalKop});
        };
        update();
        return onCartChange(update);
    }, []);

    useEffect(() => {
        const el = innerRef.current;
        if (!el) return;
        const setVar = () => {
            const h = Math.round(el.getBoundingClientRect().height) || 72;
            document.documentElement.style.setProperty("--topbar-h", `${h}px`);
        };
        setVar();
        const ro = new ResizeObserver(setVar);
        ro.observe(el);
        window.addEventListener("resize", setVar, {passive: true});
        return () => {
            ro.disconnect();
            window.removeEventListener("resize", setVar);
        };
    }, []);

    useEffect(() => {
        let ticking = false;
        const onScroll = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                setStuck(window.scrollY > 2);
                ticking = false;
            });
        };
        onScroll();
        window.addEventListener("scroll", onScroll, {passive: true});
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const hasCart = sum.itemsCount > 0;
    const priceUAH = new Intl.NumberFormat("uk-UA", {minimumFractionDigits: 0, maximumFractionDigits: 0})
        .format(Math.round(sum.subtotalKop / 100));

    return (
        <header className={`topbar${stuck ? " is-stuck" : ""}`}>
            <div ref={innerRef} className="topbar__inner">
                <div className="topbar__left">
                    <Link to="/" className="brand">
                        <span className="brand__emoji">🍬</span>
                        <span className="brand__text">CandyShop</span>
                    </Link>

                    <nav className="mainnav">
                        <NavLink to="/candy"
                                 className={({isActive}) => "navlink" + (isActive ? " navlink--active" : "")}>
                            Каталог
                        </NavLink>
                        <NavLink to="/pack" className={({isActive}) => "navlink" + (isActive ? " navlink--active" : "")}
                                 end>
                            Пакування
                        </NavLink>

                        <NavLink
                            to="/basket"
                            className={({isActive}) =>
                                "navlink navlink--icon navlink--cart" +
                                (isActive ? " navlink--active" : "") +
                                (hasCart ? " navlink--cart-full" : "")
                            }
                        >
                            {({isActive}) => (
                                <>
                  <span className="icon" aria-hidden>
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path d="M3 5h3l2 10h10l2-7H7.5" fill="none" stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="10" cy="19" r="1.5" fill="currentColor"/>
                      <circle cx="18" cy="19" r="1.5" fill="currentColor"/>
                    </svg>
                  </span>Кошик

                                    {hasCart && (
                                        <span
                                            className={"cart-pill" + (isActive ? " cart-pill--active" : "")}
                                            aria-live="polite"
                                            title={`Кількість: ${sum.itemsCount} • Вага: ${sum.totalWeightG} г • Сума: ${priceUAH} грн`}
                                        >
                      <span className="pill-group">
                        <IconCube size={20} stroke={2} className="pill-ico" aria-hidden/>
                        <b>{sum.itemsCount}</b><span className="unit">&nbsp;шт.</span>
                      </span>
                      <span className="pill-group">
                        <IconWeight size={20} stroke={2} className="pill-ico" aria-hidden/>
                        <b>{sum.totalWeightG}</b><span className="unit">&nbsp;г</span>
                      </span>
                      <span className="pill-group">
                        <IconCurrencyHryvnia size={20} stroke={2} className="pill-ico" aria-hidden/>
                        <b>{priceUAH}</b><span className="uah-word">&nbsp;грн</span>
                      </span>
                    </span>
                                    )}
                                </>
                            )}
                        </NavLink>

                        <NavLink to="/orders"
                                 className={({isActive}) => "navlink" + (isActive ? " navlink--active" : "")}>
                            Замовлення
                        </NavLink>
                    </nav>
                </div>

                <div className="topbar__right">
                    <Link to="/admin" className="user user--link" title="Відкрити адмін-панель">
                        <div className="user__name">Адміністратор</div>
                        <div className="user__role">Admin</div>
                    </Link>
                    <button className="btn btn--ghost">Вийти</button>
                </div>
            </div>
        </header>
    );
}
