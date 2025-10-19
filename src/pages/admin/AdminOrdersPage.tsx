import { useEffect, useState } from "react";

type Order = {
    id: string;
    customerName: string;
    phone?: string;
    totalKop: number;
    createdAt?: string;
    status?: "new"|"processing"|"done";
};

export default function AdminOrdersPage(){
    const [items, setItems] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(()=>{
        (async ()=>{
            try{
                const res = await fetch("/api/orders");
                const data = await res.json();
                setItems(Array.isArray(data) ? data : data.items || []);
            }catch{
                setItems([]);
            }finally{
                setLoading(false);
            }
        })();
    },[]);

    if (loading) return <div className="card admin__card">Завантаження…</div>;

    return (
        <div className="admin-list">
            {items.map(o=>(
                <article key={o.id} className="card admin-order">
                    <div className="admin-order__line">
                        <b>#{o.id}</b>
                        <span className={"badge badge--"+(o.status||"new")}>{o.status||"new"}</span>
                    </div>
                    <div className="admin-order__line">
                        <span>{o.customerName}</span>
                        {o.phone ? <span className="muted">{o.phone}</span> : null}
                    </div>
                    <div className="admin-order__line">
                        <span className="muted">{o.createdAt ? new Date(o.createdAt).toLocaleString("uk-UA") : ""}</span>
                        <b>{(o.totalKop/100).toFixed(2)} грн</b>
                    </div>
                    <div className="admin-order__actions">
                        <button className="btn-edit">Відкрити</button>
                    </div>
                </article>
            ))}
            {items.length===0 && <div className="card admin__card">Замовлень поки немає.</div>}
        </div>
    );
}
