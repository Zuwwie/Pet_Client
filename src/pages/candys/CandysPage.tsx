import { useQuery } from "@tanstack/react-query";
import { getAllCandy } from "../../services/candy.service";
import type { ICandy } from "../../../models/ICandy";
import OneCandyPage from "./OneCandyPage";
import "./candy.css";

export default function CandysPage() {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["candy:list"],
        queryFn: getAllCandy,
    });

    if (isLoading) return <div className="products-grid">{Array.from({length:6}).map((_,i)=><div key={i} className="product-card sk" />)}</div>;
    if (isError)   return <p className="error">Помилка: {(error as Error).message}</p>;
    if (!data?.length) return <p className="muted">Наразі немає товарів.</p>;

    return (
        <div className="products-grid">
            {data.map((c: ICandy) => <OneCandyPage key={c._id} candy={c} />)}
        </div>
    );
}
