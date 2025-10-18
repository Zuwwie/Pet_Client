import {NavLink, Link} from "react-router-dom";
import "./menu.css";

export default function Menu() {
    // const cartCount = 0; // підставиш реальне значення з контексту кошика

    return (
        <header className="topbar">
            <div className="topbar__inner">
                {/* Ліва частина: логотип + навігація */}
                <div className="topbar__left">
                    <Link to="/" className="brand">
                        <span className="brand__emoji">🍬</span>
                        <span className="brand__text">CandyShop</span>
                    </Link>

                    <nav className="mainnav">
                        <NavLink
                            to="/candy"
                            className={({isActive}) =>
                                "navlink" + (isActive ? " navlink--active" : "")
                            }
                        >
                            Каталог
                        </NavLink>

                        <NavLink
                            to="/basket"
                            className={({isActive}) =>
                                "navlink navlink--icon" + (isActive ? " navlink--active" : "")
                            }
                        >
  <span className="icon" aria-hidden>
    {/* нова мінімалістична іконка кошика */}
      <svg viewBox="0 0 24 24" width="20" height="20">
      <path
          d="M3 5h3l2 10h10l2-7H7.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
      />
      <circle cx="10" cy="19" r="1.5" fill="currentColor"/>
      <circle cx="18" cy="19" r="1.5" fill="currentColor"/>
    </svg>
  </span>
                            Кошик
                            {/* {cartCount ? <span className="badge">{cartCount}</span> : null} */}
                        </NavLink>


                        <NavLink
                            to="/orders"
                            className={({isActive}) =>
                                "navlink" + (isActive ? " navlink--active" : "")
                            }
                        >
                            Замовлення
                        </NavLink>

                        <NavLink
                            to="/admin"
                            className={({isActive}) =>
                                "navlink" + (isActive ? " navlink--active" : "")
                            }
                        >
                            Адмін панель
                        </NavLink>
                    </nav>
                </div>

                {/* Права частина: користувач */}
                <div className="topbar__right">
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
