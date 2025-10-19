// src/pages/admin/AdminCandiesPage.tsx
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getAllCandy } from "../../services/candy.service";
import type { ICandy } from "../../../models/ICandy";
import OneCandyAdminPage from "./OneCandyAdminPage"; // твоя адмін-картка
import "./admin.css";

function AdminCandiesPage() {
    const { data = [], isPending, isError, error } = useQuery<ICandy[]>({
        queryKey: ["candy:list"],
        queryFn: getAllCandy,
    });

    if (isPending) return <div className="card admin__card">Завантаження…</div>;
    if (isError)   return <div className="card admin__card error">Помилка: {(error as Error).message}</div>;
    if (data.length === 0) return <div className="card admin__card">Поки що немає цукерок.</div>;

    return (
        <div className="admin-products-grid">
            {data.map((c) => (
                <div key={c._id} className="admin-card">
                    <OneCandyAdminPage candy={c} />
                    <div className="admin-card__bar" style={{ pointerEvents: "none" }}>
                        <Link
                            to={`/admin/candies/${c._id}`}
                            className="btn-edit"
                            onClick={(e) => e.stopPropagation()}
                            style={{ pointerEvents: "auto" }}
                        >
                            Редагувати
                        </Link>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default AdminCandiesPage;
