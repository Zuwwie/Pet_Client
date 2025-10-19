import { NavLink, Outlet } from "react-router-dom";
import "./admin.css";

export default function AdminLayout(){
    return (
        <div className="admin">
            <header className="admin__top">
                <h1 className="admin__title">Адмін панель</h1>
                <nav className="admin__tabs">
                    <NavLink to="/admin/candies" end className={({isActive})=>"admin__tab"+(isActive?" admin__tab--active":"")}>
                        Керування цукерками
                    </NavLink>
                    <NavLink to="/admin/orders" className={({isActive})=>"admin__tab"+(isActive?" admin__tab--active":"")}>
                        Керування замовленнями
                    </NavLink>
                </nav>
            </header>
            <main className="admin__content">
                <Outlet/>
            </main>
        </div>
    );
}
