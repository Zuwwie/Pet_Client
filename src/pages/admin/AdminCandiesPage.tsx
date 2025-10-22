// import { useEffect, useMemo, useRef, useState } from "react";
// import { createPortal } from "react-dom";
// import { api } from "@/services/api.services";
//
// type PricingMode = "kg" | "pcs";
// type AvailabilityMode = "auto" | "in" | "out";
//
// type CandyForm = {
//     _id?: string;
//     name: string;
//     category?: string;
//     photoUrl?: string;
//
//     pricingMode: PricingMode;
//
//     weightPerPiece?: number | null;
//     pricePerKgBuy?: number | null;
//     pricePerKgSell?: number | null;
//     pricePerPcsBuy?: number | null;
//     pricePerPcsSell?: number | null;
//
//     // нове:
//     availabilityMode?: AvailabilityMode; // ui-перемикач
//     isAvailable?: boolean | null;        // лише для підказки/ініціалізації
//     isAvailableManual?: boolean | null;  // що прийшло з беку (може бути null)
// };
//
// type Props = {
//     id: string;
//     create: boolean;
//     initial?: Partial<CandyForm>;
//     onClose: () => void;
//     onSaved: (saved: any) => void;
//     onDeleted: (id: string) => void;
// };
//
// // ---------- utils ----------
// const toNum = (v: unknown): number | undefined => {
//     if (typeof v === "number" && Number.isFinite(v)) return v;
//     if (typeof v === "string") {
//         const s = v.replace(",", ".").trim();
//         if (s === "") return undefined;
//         const n = Number(s);
//         return Number.isFinite(n) ? n : undefined;
//     }
//     return undefined;
// };
//
// const fmtUAH = (n?: number) =>
//     typeof n === "number"
//         ? new Intl.NumberFormat("uk-UA", { style: "currency", currency: "UAH", maximumFractionDigits: 2 }).format(n)
//         : "—";
//
// export default function AdminCandyEditPage({ create, initial, onClose, onSaved, onDeleted }: Props) {
//     const [saving, setSaving] = useState(false);
//     const [deleting, setDeleting] = useState(false);
//     const [errorMsg, setErrorMsg] = useState<string | null>(null);
//
//     // обчислюємо availabilityMode з initial.{isAvailableManual|isAvailable}
//     const initAvailabilityMode: AvailabilityMode =
//         typeof initial?.isAvailableManual === "boolean"
//             ? (initial.isAvailableManual ? "in" : "out")
//             : "auto";
//
//     const [form, setForm] = useState<CandyForm>(() => ({
//         _id: initial?._id,
//         name: String(initial?.name ?? ""),
//         category: initial?.category ?? "",
//         photoUrl: initial?.photoUrl ?? "",
//         pricingMode: (initial?.pricingMode === "pcs" ? "pcs" : "kg") as PricingMode,
//
//         weightPerPiece:
//             typeof initial?.weightPerPiece === "number" && Number.isFinite(initial.weightPerPiece)
//                 ? initial.weightPerPiece
//                 : undefined,
//
//         pricePerKgBuy:
//             typeof initial?.pricePerKgBuy === "number" && Number.isFinite(initial.pricePerKgBuy)
//                 ? initial.pricePerKgBuy
//                 : undefined,
//         pricePerKgSell:
//             typeof initial?.pricePerKgSell === "number" && Number.isFinite(initial.pricePerKgSell)
//                 ? initial.pricePerKgSell
//                 : undefined,
//
//         pricePerPcsBuy:
//             typeof initial?.pricePerPcsBuy === "number" && Number.isFinite(initial.pricePerPcsBuy)
//                 ? initial.pricePerPcsBuy
//                 : undefined,
//         pricePerPcsSell:
//             typeof initial?.pricePerPcsSell === "number" && Number.isFinite(initial.pricePerPcsSell)
//                 ? initial.pricePerPcsSell
//                 : undefined,
//
//         // нове:
//         isAvailable: typeof initial?.isAvailable === "boolean" ? initial.isAvailable : null,
//         isAvailableManual:
//             typeof initial?.isAvailableManual === "boolean" ? initial.isAvailableManual : null,
//         availabilityMode: initAvailabilityMode,
//     }));
//
//     // коли відкриваємо інший товар — оновити форму
//     useEffect(() => {
//         const availabilityMode: AvailabilityMode =
//             typeof initial?.isAvailableManual === "boolean"
//                 ? (initial.isAvailableManual ? "in" : "out")
//                 : "auto";
//
//         setForm({
//             _id: initial?._id,
//             name: String(initial?.name ?? ""),
//             category: initial?.category ?? "",
//             photoUrl: initial?.photoUrl ?? "",
//             pricingMode: (initial?.pricingMode === "pcs" ? "pcs" : "kg") as PricingMode,
//             weightPerPiece:
//                 typeof initial?.weightPerPiece === "number" && Number.isFinite(initial.weightPerPiece)
//                     ? initial.weightPerPiece
//                     : undefined,
//             pricePerKgBuy:
//                 typeof initial?.pricePerKgBuy === "number" && Number.isFinite(initial.pricePerKgBuy)
//                     ? initial.pricePerKgBuy
//                     : undefined,
//             pricePerKgSell:
//                 typeof initial?.pricePerKgSell === "number" && Number.isFinite(initial.pricePerKgSell)
//                     ? initial.pricePerKgSell
//                     : undefined,
//             pricePerPcsBuy:
//                 typeof initial?.pricePerPcsBuy === "number" && Number.isFinite(initial.pricePerPcsBuy)
//                     ? initial.pricePerPcsBuy
//                     : undefined,
//             pricePerPcsSell:
//                 typeof initial?.pricePerPcsSell === "number" && Number.isFinite(initial.pricePerPcsSell)
//                     ? initial.pricePerPcsSell
//                     : undefined,
//             isAvailable: typeof initial?.isAvailable === "boolean" ? initial.isAvailable : null,
//             isAvailableManual:
//                 typeof initial?.isAvailableManual === "boolean" ? initial.isAvailableManual : null,
//             availabilityMode,
//         });
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [initial?._id]);
//
//     const setField = <K extends keyof CandyForm>(key: K, raw: unknown) => {
//         setForm((f) => {
//             if (key === "name" || key === "category" || key === "photoUrl") {
//                 return { ...f, [key]: String(raw ?? "") };
//             }
//             if (key === "pricingMode") {
//                 const v: PricingMode = raw === "pcs" ? "pcs" : "kg";
//                 return { ...f, pricingMode: v };
//             }
//             if (key === "availabilityMode") {
//                 const v: AvailabilityMode = raw === "in" ? "in" : raw === "out" ? "out" : "auto";
//                 return { ...f, availabilityMode: v };
//             }
//             const n = toNum(raw);
//             return { ...f, [key]: typeof n === "number" ? n : undefined };
//         });
//     };
//
//     // підказки/еквіваленти
//     const derived = useMemo(() => {
//         const w = form.weightPerPiece;
//         const buyKg = form.pricePerKgBuy;
//         const sellKg = form.pricePerKgSell;
//         const buyPcs = form.pricePerPcsBuy;
//         const sellPcs = form.pricePerPcsSell;
//
//         const piecesPerKg =
//             typeof w === "number" && w > 0 ? Math.max(1, Math.round(1000 / w)) : undefined;
//
//         const pcsFromKg = (kg?: number) =>
//             typeof kg === "number" && kg > 0 && typeof w === "number" && w > 0 ? (kg * w) / 1000 : undefined;
//
//         const kgFromPcs = (pcs?: number) =>
//             typeof pcs === "number" && pcs > 0 && typeof w === "number" && w > 0 ? (pcs * 1000) / w : undefined;
//
//         return {
//             piecesPerKg,
//             buyPerPcsFromKg: pcsFromKg(buyKg),
//             sellPerPcsFromKg: pcsFromKg(sellKg),
//             buyPerKgFromPcs: kgFromPcs(buyPcs),
//             sellPerKgFromPcs: kgFromPcs(sellPcs),
//         };
//     }, [form]);
//
//     // підказка про доступність (з урахуванням ручного режиму)
//     const availabilityHint = useMemo(() => {
//         if (form.availabilityMode === "in") return "Примусово: є в наявності.";
//         if (form.availabilityMode === "out") return "Примусово вимкнено (немає в наявності).";
//
//         // auto:
//         if (form.pricingMode === "kg") {
//             const ok =
//                 typeof form.pricePerKgSell === "number" &&
//                 form.pricePerKgSell > 0 &&
//                 typeof form.weightPerPiece === "number" &&
//                 form.weightPerPiece > 0;
//             return ok
//                 ? "Авто: піде в продаж (є ₴/кг та вага)."
//                 : "Авто: поки не продається (потрібні ₴/кг (продаж) і вага).";
//         }
//         const ok = typeof form.pricePerPcsSell === "number" && form.pricePerPcsSell > 0;
//         return ok
//             ? "Авто: піде в продаж (є ₴/шт (продаж))."
//             : "Авто: поки не продається (потрібна ₴/шт (продаж)).";
//     }, [form]);
//
//     // ---------- сабміт ----------
//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         setSaving(true);
//         setErrorMsg(null);
//         try {
//             const payload: any = {
//                 name: form.name,
//                 category: form.category || null,
//                 photoUrl: form.photoUrl || null,
//                 pricingMode: form.pricingMode,
//                 weightPerPiece: typeof form.weightPerPiece === "number" ? form.weightPerPiece : null,
//             };
//
//             if (form.pricingMode === "kg") {
//                 payload.pricePerKgBuy = typeof form.pricePerKgBuy === "number" ? form.pricePerKgBuy : null;
//                 payload.pricePerKgSell = typeof form.pricePerKgSell === "number" ? form.pricePerKgSell : null;
//             } else {
//                 payload.pricePerPcsBuy = typeof form.pricePerPcsBuy === "number" ? form.pricePerPcsBuy : null;
//                 payload.pricePerPcsSell = typeof form.pricePerPcsSell === "number" ? form.pricePerPcsSell : null;
//             }
//
//             // нове: ручна наявність
//             payload.isAvailableManual =
//                 form.availabilityMode === "auto" ? null : form.availabilityMode === "in";
//
//             const url = create ? "candy" : `candy/${form._id}`;
//             const method = create ? api.post : api.put;
//             const { data: saved } = await method(url, payload);
//             onSaved(saved);
//             onClose();
//         } catch (err: any) {
//             setErrorMsg(err?.response?.data?.message || err?.message || "Помилка збереження");
//         } finally {
//             setSaving(false);
//         }
//     };
//
//     const handleDelete = async () => {
//         if (!form._id) return;
//         if (!confirm("Видалити цей товар? Це дію не можна відмінити.")) return;
//         setDeleting(true);
//         setErrorMsg(null);
//         try {
//             await api.delete(`candy/${form._id}`);
//             onDeleted(form._id);
//             onClose();
//         } catch (err: any) {
//             setErrorMsg(err?.response?.data?.message || err?.message || "Помилка видалення");
//         } finally {
//             setDeleting(false);
//         }
//     };
//
//     // ---------- UX: портал, закриття по кліку поза вікном / ESC, фокус ----------
//     const firstInputRef = useRef<HTMLInputElement | null>(null);
//
//     useEffect(() => {
//         document.body.classList.add("has-modal");
//         const onKey = (ev: KeyboardEvent) => {
//             if (ev.key === "Escape") onClose();
//         };
//         window.addEventListener("keydown", onKey);
//         setTimeout(() => firstInputRef.current?.focus(), 0);
//         return () => {
//             window.removeEventListener("keydown", onKey);
//             document.body.classList.remove("has-modal");
//         };
//     }, [onClose]);
//
//     const ModeSeg = () => (
//         <div className="seg" role="tablist" aria-label="Режим ціни">
//             <button
//                 type="button"
//                 className={"seg-btn" + (form.pricingMode === "kg" ? " is-active" : "")}
//                 role="tab"
//                 aria-selected={form.pricingMode === "kg"}
//                 onClick={() => setField("pricingMode", "kg")}
//                 title="Ціна за кілограм"
//             >
//                 ₴/кг
//             </button>
//             <button
//                 type="button"
//                 className={"seg-btn" + (form.pricingMode === "pcs" ? " is-active" : "")}
//                 role="tab"
//                 aria-selected={form.pricingMode === "pcs"}
//                 onClick={() => setField("pricingMode", "pcs")}
//                 title="Ціна за штуку"
//             >
//                 ₴/шт
//             </button>
//         </div>
//     );
//
//     const AvailabilitySeg = () => (
//         <div className="seg" role="tablist" aria-label="Наявність">
//             <button
//                 type="button"
//                 className={"seg-btn" + (form.availabilityMode === "auto" ? " is-active" : "")}
//                 role="tab"
//                 aria-selected={form.availabilityMode === "auto"}
//                 onClick={() => setField("availabilityMode", "auto")}
//                 title="Автоматично (за полями ціни/ваги)"
//             >
//                 авто
//             </button>
//             <button
//                 type="button"
//                 className={"seg-btn" + (form.availabilityMode === "in" ? " is-active" : "")}
//                 role="tab"
//                 aria-selected={form.availabilityMode === "in"}
//                 onClick={() => setField("availabilityMode", "in")}
//                 title="Примусово: є в наявності"
//             >
//                 є
//             </button>
//             <button
//                 type="button"
//                 className={"seg-btn" + (form.availabilityMode === "out" ? " is-active" : "")}
//                 role="tab"
//                 aria-selected={form.availabilityMode === "out"}
//                 onClick={() => setField("availabilityMode", "out")}
//                 title="Примусово: немає в наявності"
//             >
//                 немає
//             </button>
//         </div>
//     );
//
//     const content = (
//         <div
//             className="modal-overlay"
//             role="none"
//             onMouseDown={(e) => {
//                 if (e.target === e.currentTarget) onClose();
//             }}
//         >
//             <div className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-title" onMouseDown={(e) => e.stopPropagation()}>
//                 <div className="modal__top">
//                     <h2 id="edit-title">{create ? "Нова цукерка" : "Редагувати цукерку"}</h2>
//                     <div style={{ display: "flex", gap: 8 }}>
//                         {!create && (
//                             <button className="btn btn-danger" type="button" onClick={handleDelete} disabled={deleting}>
//                                 {deleting ? "Видаляю…" : "Видалити"}
//                             </button>
//                         )}
//                         <button className="btn btn-x" type="button" onClick={onClose} aria-label="Закрити">
//                             ✕
//                         </button>
//                     </div>
//                 </div>
//
//                 <form id="edit-form" className="modal__body" onSubmit={handleSubmit}>
//                     {errorMsg ? <div className="error">{errorMsg}</div> : null}
//
//                     <div className="form2">
//                         <label className="span2">
//                             <span>Назва*</span>
//                             <input
//                                 ref={firstInputRef}
//                                 type="text"
//                                 value={form.name}
//                                 onChange={(e) => setField("name", e.target.value)}
//                                 required
//                                 placeholder="Напр.: Ромашка"
//                             />
//                         </label>
//
//                         <label>
//                             <span>Категорія</span>
//                             <input
//                                 type="text"
//                                 value={form.category ?? ""}
//                                 onChange={(e) => setField("category", e.target.value)}
//                                 placeholder="Карамель / Шоколад тощо"
//                             />
//                         </label>
//
//                         <label>
//                             <span>Фото (URL)</span>
//                             <input
//                                 type="text"
//                                 value={form.photoUrl ?? ""}
//                                 onChange={(e) => setField("photoUrl", e.target.value)}
//                                 placeholder="https://…"
//                             />
//                         </label>
//
//                         <div className="span2 seg-wrap">
//                             <span className="field-label">Режим:</span>
//                             <ModeSeg />
//                         </div>
//
//                         <div className="span2 seg-wrap">
//                             <span className="field-label">Наявність:</span>
//                             <AvailabilitySeg />
//                         </div>
//
//                         <label>
//                             <span>Вага 1 шт, г</span>
//                             <input
//                                 type="number"
//                                 inputMode="decimal"
//                                 step="0.01"
//                                 min="0"
//                                 value={typeof form.weightPerPiece === "number" ? String(form.weightPerPiece) : ""}
//                                 onChange={(e) => setField("weightPerPiece", e.target.value)}
//                                 placeholder="напр.: 7.5"
//                             />
//                         </label>
//
//                         {/* Ціна за кг */}
//                         {form.pricingMode === "kg" && (
//                             <>
//                                 <label>
//                                     <span>₴/кг (вхідна)</span>
//                                     <input
//                                         type="number"
//                                         inputMode="decimal"
//                                         step="0.01"
//                                         min="0"
//                                         value={typeof form.pricePerKgBuy === "number" ? String(form.pricePerKgBuy) : ""}
//                                         onChange={(e) => setField("pricePerKgBuy", e.target.value)}
//                                         placeholder="напр.: 180"
//                                     />
//                                 </label>
//
//                                 <label>
//                                     <span>₴/кг (продаж)</span>
//                                     <input
//                                         required
//                                         type="number"
//                                         inputMode="decimal"
//                                         step="0.01"
//                                         min="0"
//                                         value={typeof form.pricePerKgSell === "number" ? String(form.pricePerKgSell) : ""}
//                                         onChange={(e) => setField("pricePerKgSell", e.target.value)}
//                                         placeholder="напр.: 240"
//                                     />
//                                 </label>
//
//                                 <div className="preview span2">
//                                     <div>
//                                         <b>Еквівалент ₴/шт:</b> {fmtUAH(derived.buyPerPcsFromKg)} (вх), {fmtUAH(derived.sellPerPcsFromKg)} (пр)
//                                     </div>
//                                     <div>
//                                         <b>шт/кг:</b> {typeof derived.piecesPerKg === "number" ? derived.piecesPerKg : "—"}
//                                     </div>
//                                 </div>
//                             </>
//                         )}
//
//                         {/* Ціна за штуку */}
//                         {form.pricingMode === "pcs" && (
//                             <>
//                                 <label>
//                                     <span>₴/шт (вхідна)</span>
//                                     <input
//                                         type="number"
//                                         inputMode="decimal"
//                                         step="0.01"
//                                         min="0"
//                                         value={typeof form.pricePerPcsBuy === "number" ? String(form.pricePerPcsBuy) : ""}
//                                         onChange={(e) => setField("pricePerPcsBuy", e.target.value)}
//                                         placeholder="напр.: 2.3"
//                                     />
//                                 </label>
//
//                                 <label>
//                                     <span>₴/шт (продаж)</span>
//                                     <input
//                                         required
//                                         type="number"
//                                         inputMode="decimal"
//                                         step="0.01"
//                                         min="0"
//                                         value={typeof form.pricePerPcsSell === "number" ? String(form.pricePerPcsSell) : ""}
//                                         onChange={(e) => setField("pricePerPcsSell", e.target.value)}
//                                         placeholder="напр.: 3.5"
//                                     />
//                                 </label>
//
//                                 <div className="preview span2">
//                                     <div>
//                                         <b>Еквівалент ₴/кг:</b> {fmtUAH(derived.buyPerKgFromPcs)} (вх), {fmtUAH(derived.sellPerKgFromPcs)} (пр)
//                                     </div>
//                                     <div>
//                                         <b>шт/кг:</b> {typeof derived.piecesPerKg === "number" ? derived.piecesPerKg : "—"}
//                                     </div>
//                                 </div>
//                             </>
//                         )}
//
//                         <div className="span2 muted">{availabilityHint}</div>
//                     </div>
//                 </form>
//
//                 <div className="modal__actions">
//                     <div className="spacer" />
//                     <button className="btn" type="button" onClick={onClose} disabled={saving}>Скасувати</button>
//                     <button className="btn btn-primary" type="submit" form="edit-form" disabled={saving}>
//                         {saving ? "Зберігаю…" : "Зберегти"}
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
//
//     return createPortal(content, document.body);
// }
