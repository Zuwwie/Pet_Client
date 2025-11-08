// src/pages/admin/AdminPage.tsx
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import "./admin.css";

export default function AdminPage() {
    const location = useLocation();
    const navigate = useNavigate();

    // Визначаємо активну вкладку з шляху
    const getActiveTab = () => {
        if (location.pathname.includes("/admin/orders")) return "orders";
        if (location.pathname.includes("/admin/packaging")) return "packaging";
        return "candies";
    };

    const activeTab = getActiveTab();

    const goCandies = () => navigate("/admin");
    const goOrders = () => navigate("/admin/orders");
    const goPackaging = () => navigate("/admin/packaging");

    return (
        <div className="admin">
            <header className="admin__top">
                <h1 className="admin__title">Адмін панель</h1>
                <nav className="admin__tabs">
                    <button
                        className={"admin__tab" + (activeTab === "candies" ? " admin__tab--active" : "")}
                        onClick={goCandies}
                        type="button"
                    >
                        Керування цукерками
                    </button>
                    <button
                        className={"admin__tab" + (activeTab === "orders" ? " admin__tab--active" : "")}
                        onClick={goOrders}
                        type="button"
                    >
                        Керування замовленнями
                    </button>
                    <button
                        className={"admin__tab" + (activeTab === "packaging" ? " admin__tab--active" : "")}
                        onClick={goPackaging}
                        type="button"
                    >
                        Керування упаковками
                    </button>
                </nav>
            </header>

            <main className="admin__content">
                {/* Outlet відображає дочірні компоненти (AdminCandiesPage, AdminOrdersPage, AdminPackagingPage) */}
                <Outlet />
            </main>
        </div>
    );
}