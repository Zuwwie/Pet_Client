// import { useParams } from "react-router-dom";
// import { useOrder, useUpdateOrderStatus, type OrderStatus } from "@/services/orders.service";
// import { formatUAH } from "@/cart/store";
// import "./adminOrder.css";
//
//
// export default function AdminOrderPage() {
//     const { id = "" } = useParams<{ id: string }>();
//     const { data: order, isLoading, error } = useOrder(id);
//     const { mutate: updateStatus, isPending } = useUpdateOrderStatus();
//
//     if (isLoading) return <div className="admin__card">Завантаження…</div>;
//     if (error || !order) return <div className="admin__card error">Помилка: {(error as Error)?.message || "не знайдено"}</div>;
//
//     const onChangeStatus = (s: OrderStatus) => updateStatus({ id: order.id, status: s });
//
//     const marginPct =
//         order.totalKop > 0 ? (((order.profitKop || 0) / order.totalKop) * 100).toFixed(1) + "%" : "—";
//
//     return (
//         <div className="admin">
//             <header className="admin__top">
//                 <h1 className="admin__title" style={{marginBottom:0}}>
//                     Замовлення #{order.orderNumber || (order.id || "").slice(-6).toUpperCase()}
//                 </h1>
//                 <div style={{display:"flex", gap:8, alignItems:"center"}}>
//                     <span className={"badge badge--" + (order.status || "нове")}>{order.status}</span>
//                     <select
//                         defaultValue={order.status}
//                         disabled={isPending}
//                         onChange={(e) => onChangeStatus(e.target.value as OrderStatus)}
//                         className="btn-edit"
//                         title="Змінити статус"
//                     >
//                         {["нове","підтверджено","збирається","відправлено","отримано"].map(s => (
//                             <option key={s} value={s}>{s}</option>
//                         ))}
//                     </select>
//                 </div>
//             </header>
//
//             {/* KPI зверху для конкретного замовлення */}
//             <div style={{display:"grid", gridTemplateColumns:"repeat(4,minmax(220px,1fr))", gap:12, marginBottom:14}}>
//                 <Kpi label="Загальний дохід" value={formatUAH(order.totalKop)} icon="💲" />
//                 <Kpi label="Собівартість" value={formatUAH(order.costKop || 0)} icon="🧱" />
//                 <Kpi label="Чистий прибуток" value={<span style={{color:"#16a34a"}}>{formatUAH(order.profitKop || 0)}</span>} icon="📈" />
//                 <Kpi label="Маржа" value={<span style={{color:"#7c3aed"}}>{marginPct}</span>} icon="📈" />
//             </div>
//
//             {/* Інфо про клієнта */}
//             <section className="admin__card" style={{marginBottom:12}}>
//                 <h3 style={{margin:"0 0 8px", fontWeight:800}}>Клієнт</h3>
//                 <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8}}>
//                     <Field label="Ім'я" value={order.customer?.name || "—"} />
//                     <Field label="Телефон" value={order.customer?.phone || "—"} />
//                     <Field label="Email" value={order.customer?.email || "—"} />
//                 </div>
//                 {order.comment ? (
//                     <div style={{marginTop:8}}>
//                         <div className="muted" style={{fontWeight:700}}>Коментар</div>
//                         <div>{order.comment}</div>
//                     </div>
//                 ) : null}
//             </section>
//
//             {/* Цукерки */}
//             <section className="admin__card" style={{marginBottom:12}}>
//                 <h3 style={{margin:"0 0 8px", fontWeight:800}}>Цукерки ({order.candies?.length || 0})</h3>
//                 {order.candies?.length ? (
//                     <div style={{overflowX:"auto"}}>
//                         <table style={{width:"100%", borderCollapse:"collapse"}}>
//                             <thead>
//                             <tr style={trHead}>
//                                 <th style={th}>Назва</th>
//                                 <th style={th}>Режим</th>
//                                 <th style={th}>К-сть</th>
//                                 <th style={th}>₴ од./кг (пр)</th>
//                                 <th style={th}>₴ од./кг (вх)</th>
//                                 <th style={th}>Сума (пр)</th>
//                                 <th style={th}>Сума (вх)</th>
//                             </tr>
//                             </thead>
//                             <tbody>
//                             {order.candies.map((c) => {
//                                 const qty =
//                                     c.pricingMode === "kg"
//                                         ? `${c.weightG ?? 0} г`
//                                         : `${c.qtyPieces ?? 0} шт`;
//                                 const sellUnit =
//                                     c.pricingMode === "kg" ? (c.sellPerKgKop || 0) : (c.sellUnitKop || 0);
//                                 const buyUnit =
//                                     c.pricingMode === "kg" ? (c.buyPerKgKop || 0) : (c.buyUnitKop || 0);
//                                 return (
//                                     <tr key={c.id || c.candyId} style={trBody}>
//                                         <td style={td}>{c.name || "—"}</td>
//                                         <td style={td}>{c.pricingMode === "kg" ? "кг" : "шт"}</td>
//                                         <td style={td}>{qty}</td>
//                                         <td style={td}>{formatUAH(sellUnit)}</td>
//                                         <td style={td}>{formatUAH(buyUnit)}</td>
//                                         <td style={td}><b>{formatUAH(c.subtotalSellKop || 0)}</b></td>
//                                         <td style={td}>{formatUAH(c.subtotalBuyKop || 0)}</td>
//                                     </tr>
//                                 );
//                             })}
//                             </tbody>
//                         </table>
//                     </div>
//                 ) : (
//                     <div className="muted">Немає позицій</div>
//                 )}
//             </section>
//
//             {/* Пакування */}
//             <section className="admin__card" style={{marginBottom:12}}>
//                 <h3 style={{margin:"0 0 8px", fontWeight:800}}>Пакування ({order.packs?.length || 0})</h3>
//                 {order.packs?.length ? (
//                     <div style={{overflowX:"auto"}}>
//                         <table style={{width:"100%", borderCollapse:"collapse"}}>
//                             <thead>
//                             <tr style={trHead}>
//                                 <th style={th}>Назва</th>
//                                 <th style={th}>К-сть</th>
//                                 <th style={th}>Ціна (пр)</th>
//                                 <th style={th}>Собівартість</th>
//                                 <th style={th}>Сума (пр)</th>
//                                 <th style={th}>Сума (вх)</th>
//                             </tr>
//                             </thead>
//                             <tbody>
//                             {order.packs.map((p) => (
//                                 <tr key={p.id || p.packagingId} style={trBody}>
//                                     <td style={td}>{p.name || "—"}</td>
//                                     <td style={td}>{p.qty || 0} шт</td>
//                                     <td style={td}>{formatUAH(p.sellKop || 0)}</td>
//                                     <td style={td}>{formatUAH(p.buyKop || 0)}</td>
//                                     <td style={td}><b>{formatUAH(p.subtotalSellKop || 0)}</b></td>
//                                     <td style={td}>{formatUAH(p.subtotalBuyKop || 0)}</td>
//                                 </tr>
//                             ))}
//                             </tbody>
//                         </table>
//                     </div>
//                 ) : (
//                     <div className="muted">Немає пакування</div>
//                 )}
//             </section>
//
//             {/* Підсумок */}
//             <section className="admin__card">
//                 <h3 style={{margin:"0 0 8px", fontWeight:800}}>Підсумок</h3>
//                 <div style={{display:"grid", gridTemplateColumns:"repeat(4,minmax(160px,1fr))", gap:12}}>
//                     <Field label="Загальна вартість" value={<b>{formatUAH(order.totalKop)}</b>} />
//                     <Field label="Собівартість" value={formatUAH(order.costKop || 0)} />
//                     <Field label="Прибуток" value={<span style={{color:"#16a34a"}}>{formatUAH(order.profitKop || 0)}</span>} />
//                     <Field label="Вага" value={(order.totalWeightG ?? 0) + " г"} />
//                 </div>
//             </section>
//         </div>
//     );
// }
//
// function Field({ label, value }: { label: string; value: React.ReactNode }) {
//     return (
//         <div>
//             <div className="muted" style={{fontWeight:700}}>{label}</div>
//             <div>{value}</div>
//         </div>
//     );
// }
//
// function Kpi({ label, value, icon }: { label: string; value: React.ReactNode; icon?: string }) {
//     return (
//         <div className="admin__card" style={{display:"grid", gridTemplateColumns:"36px 1fr", gap:12, alignItems:"center"}}>
//             <div style={{width:36, height:36, display:"grid", placeItems:"center", borderRadius:10, background:"#f1f5f9"}} aria-hidden>
//                 {icon || "📊"}
//             </div>
//             <div>
//                 <div className="muted" style={{fontWeight:700}}>{label}</div>
//                 <div style={{fontSize:22, fontWeight:800}}>{value}</div>
//             </div>
//         </div>
//     );
// }
//
// // table styles (inline to avoid extra css)
// const trHead: React.CSSProperties = { background:"#f8fafc" };
// const trBody: React.CSSProperties = { borderTop:"1px solid #eef2f4" };
// const th: React.CSSProperties = { textAlign:"left", padding:"8px 10px", fontWeight:800, fontSize:13, color:"#334155" };
// const td: React.CSSProperties = { padding:"8px 10px", verticalAlign:"top", whiteSpace:"nowrap" };
