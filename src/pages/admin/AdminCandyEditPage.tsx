// src/pages/admin/AdminCandyEditPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/services/api.services";
import Modal from "@/components/ui/Modal";
import "@/components/ui/modal.css";

type PricingMode = "kg" | "pcs";

type CandyForm = {
    _id?: string;
    name: string;
    category?: string;
    photoUrl?: string;

    pricingMode: PricingMode;

    weightPerPiece?: number | null;   // г/шт

    pricePerKgBuy?: number | null;
    pricePerKgSell?: number | null;

    pricePerPcsBuy?: number | null;
    pricePerPcsSell?: number | null;

    // нове поле — керування наявністю вручну
    isAvailable?: boolean;
};

type Props = {
    id: string;                    // "new" або _id
    create: boolean;
    initial?: Partial<CandyForm>;
    onClose: () => void;
    onSaved: (saved: unknown) => void;
    onDeleted: (id: string) => void;
};

// ---------- utils ----------
const toNum = (v: unknown): number | undefined => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
        const s = v.replace(",", ".").trim();
        if (s === "") return undefined;
        const n = Number(s);
        return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
};

const fmtUAH = (n?: number) =>
    typeof n === "number"
        ? new Intl.NumberFormat("uk-UA", { style: "currency", currency: "UAH", maximumFractionDigits: 2 }).format(n)
        : "—";

export default function AdminCandyEditPage({
                                               create,
                                               initial,
                                               onClose,
                                               onSaved,
                                               onDeleted
                                           }: Props) {
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // ---------- форма ----------
    const [form, setForm] = useState<CandyForm>(() => ({
        _id: initial?._id,
        name: initial?.name ?? "",
        category: initial?.category ?? "",
        photoUrl: initial?.photoUrl ?? "",
        pricingMode: (initial?.pricingMode === "pcs" ? "pcs" : "kg") as PricingMode,

        weightPerPiece:
            typeof initial?.weightPerPiece === "number" && Number.isFinite(initial.weightPerPiece)
                ? initial.weightPerPiece
                : undefined,

        pricePerKgBuy:
            typeof initial?.pricePerKgBuy === "number" && Number.isFinite(initial.pricePerKgBuy)
                ? initial.pricePerKgBuy
                : undefined,
        pricePerKgSell:
            typeof initial?.pricePerKgSell === "number" && Number.isFinite(initial.pricePerKgSell)
                ? initial.pricePerKgSell
                : undefined,

        pricePerPcsBuy:
            typeof initial?.pricePerPcsBuy === "number" && Number.isFinite(initial.pricePerPcsBuy)
                ? initial.pricePerPcsBuy
                : undefined,
        pricePerPcsSell:
            typeof initial?.pricePerPcsSell === "number" && Number.isFinite(initial.pricePerPcsSell)
                ? initial.pricePerPcsSell
                : undefined,

        isAvailable: initial?.isAvailable ?? true,
    }));

    // коли відкриваємо інший товар — оновити форму
    useEffect(() => {
        setForm({
            _id: initial?._id,
            name: initial?.name ?? "",
            category: initial?.category ?? "",
            photoUrl: initial?.photoUrl ?? "",
            pricingMode: (initial?.pricingMode === "pcs" ? "pcs" : "kg") as PricingMode,
            weightPerPiece:
                typeof initial?.weightPerPiece === "number" && Number.isFinite(initial.weightPerPiece)
                    ? initial.weightPerPiece
                    : undefined,
            pricePerKgBuy:
                typeof initial?.pricePerKgBuy === "number" && Number.isFinite(initial.pricePerKgBuy)
                    ? initial.pricePerKgBuy
                    : undefined,
            pricePerKgSell:
                typeof initial?.pricePerKgSell === "number" && Number.isFinite(initial.pricePerKgSell)
                    ? initial.pricePerKgSell
                    : undefined,
            pricePerPcsBuy:
                typeof initial?.pricePerPcsBuy === "number" && Number.isFinite(initial.pricePerPcsBuy)
                    ? initial.pricePerPcsBuy
                    : undefined,
            pricePerPcsSell:
                typeof initial?.pricePerPcsSell === "number" && Number.isFinite(initial.pricePerPcsSell)
                    ? initial.pricePerPcsSell
                    : undefined,
            isAvailable: initial?.isAvailable ?? true,
        });
    }, [initial]);

    const setField = <K extends keyof CandyForm>(key: K, raw: unknown) => {
        setForm((f) => {
            if (key === "name" || key === "category" || key === "photoUrl") {
                return { ...f, [key]: String(raw ?? "") };
            }
            if (key === "pricingMode") {
                const v: PricingMode = raw === "pcs" ? "pcs" : "kg";
                return { ...f, pricingMode: v };
            }
            if (key === "isAvailable") {
                return { ...f, isAvailable: Boolean(raw) };
            }
            const n = toNum(raw);
            return { ...f, [key]: typeof n === "number" ? n : undefined };
        });
    };

    // підказки/еквіваленти
    const derived = useMemo(() => {
        const w = form.weightPerPiece;
        const buyKg = form.pricePerKgBuy ?? undefined;
        const sellKg = form.pricePerKgSell ?? undefined;
        const buyPcs = form.pricePerPcsBuy ?? undefined;
        const sellPcs = form.pricePerPcsSell ?? undefined;

        const piecesPerKg = typeof w === "number" && w > 0 ? Math.max(1, Math.round(1000 / w)) : undefined;

        const pcsFromKg = (kg?: number) =>
            typeof kg === "number" && kg > 0 && typeof w === "number" && w > 0 ? (kg * w) / 1000 : undefined;

        const kgFromPcs = (pcs?: number): number | undefined =>
            typeof pcs === "number" && pcs > 0 && typeof w === "number" && w > 0 ? (pcs * 1000) / w : undefined;

        return {
            piecesPerKg,
            buyPerPcsFromKg: pcsFromKg(buyKg),
            sellPerPcsFromKg: pcsFromKg(sellKg),
            buyPerKgFromPcs: kgFromPcs(buyPcs),
            sellPerKgFromPcs: kgFromPcs(sellPcs),
        };
    }, [form]);

    const availabilityHint = useMemo(() => {
        if (form.pricingMode === "kg") {
            const ok =
                typeof form.pricePerKgSell === "number" &&
                form.pricePerKgSell > 0 &&
                typeof form.weightPerPiece === "number" &&
                form.weightPerPiece > 0;
            return ok ? "Піде в продаж (є ₴/кг та вага)" : "Поки не продається (потрібні ₴/кг (продаж) і вага)";
        }
        const ok = typeof form.pricePerPcsSell === "number" && form.pricePerPcsSell > 0;
        return ok ? "Піде в продаж (є ₴/шт (продаж))" : "Поки не продається (потрібна ₴/шт (продаж))";
    }, [form]);

    // ---------- UX: Esc + автофокус ----------
    const firstInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const onKey = (ev: KeyboardEvent) => {
            if (ev.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);

        const timer = setTimeout(() => {
            firstInputRef.current?.focus();
        }, 0);

        return () => {
            window.removeEventListener("keydown", onKey);
            clearTimeout(timer);
        };
    }, [onClose]);

    // ---------- сабміт ----------
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setErrorMsg(null);
        try {
            const payload: Record<string, unknown> = {
                name: form.name,
                category: form.category || null,
                photoUrl: form.photoUrl || null,
                pricingMode: form.pricingMode,
                weightPerPiece: typeof form.weightPerPiece === "number" ? form.weightPerPiece : null,
            };

            // ручне керування наявністю
            if (typeof form.isAvailable === "boolean") {
                payload.isAvailable = form.isAvailable;
            }

            if (form.pricingMode === "kg") {
                payload.pricePerKgBuy = typeof form.pricePerKgBuy === "number" ? form.pricePerKgBuy : null;
                payload.pricePerKgSell = typeof form.pricePerKgSell === "number" ? form.pricePerKgSell : null;
            } else {
                payload.pricePerPcsBuy = typeof form.pricePerPcsBuy === "number" ? form.pricePerPcsBuy : null;
                payload.pricePerPcsSell = typeof form.pricePerPcsSell === "number" ? form.pricePerPcsSell : null;
            }

            const url = create ? "candy" : `candy/${form._id}`;
            const method = create ? api.post : api.patch;
            const { data: saved } = await method(url, payload);
            onSaved(saved);
            onClose();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } }; message?: string };
            setErrorMsg(error?.response?.data?.message || error?.message || "Помилка збереження");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!form._id) return;
        if (!window.confirm("Видалити цей товар? Це дію не можна відмінити.")) return;
        setDeleting(true);
        setErrorMsg(null);
        try {
            await api.delete(`candy/${form._id}`);
            onDeleted(form._id);
            onClose();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } }; message?: string };
            setErrorMsg(error?.response?.data?.message || error?.message || "Помилка видалення");
        } finally {
            setDeleting(false);
        }
    };

    // ---------- render ----------
    return (
        <Modal open={true} onClose={onClose}>
            {/* header */}
            <div className="modal__top">
                <h2 id="edit-title">{create ? "Нова цукерка" : "Редагувати цукерку"}</h2>
                <div style={{ display: "flex", gap: 8 }}>
                    {!create && (
                        <button className="btn btn-danger" type="button" onClick={handleDelete} disabled={deleting}>
                            {deleting ? "Видаляю…" : "Видалити"}
                        </button>
                    )}
                    <button className="btn btn-x" type="button" onClick={onClose} aria-label="Закрити">
                        ✕
                    </button>
                </div>
            </div>

            {/* body */}
            <form id="edit-form" className="modal__body" onSubmit={handleSubmit}>
                {errorMsg && <div className="error">{errorMsg}</div>}

                <div className="form2">
                    <label className="span2">
                        <span>Назва*</span>
                        <input
                            ref={firstInputRef}
                            type="text"
                            value={form.name}
                            onChange={(e) => setField("name", e.target.value)}
                            required
                            placeholder="Напр.: Ромашка"
                        />
                    </label>

                    <label>
                        <span>Категорія</span>
                        <input
                            type="text"
                            value={form.category ?? ""}
                            onChange={(e) => setField("category", e.target.value)}
                            placeholder="Карамель / Шоколад тощо"
                        />
                    </label>

                    <label>
                        <span>Фото (URL)</span>
                        <input
                            type="text"
                            value={form.photoUrl ?? ""}
                            onChange={(e) => setField("photoUrl", e.target.value)}
                            placeholder="https://…"
                        />
                    </label>

                    {/* Режим + Наявність в один рядок */}
                    <div className="span2 seg-wrap seg-wrap--split">
                        <div>
                            <span className="field-label" style={{ marginRight: 8 }}>Режим:</span>
                            <div className="seg" role="tablist" aria-label="Режим ціни">
                                <button
                                    type="button"
                                    className={"seg-btn" + (form.pricingMode === "kg" ? " is-active" : "")}
                                    role="tab"
                                    aria-selected={form.pricingMode === "kg"}
                                    onClick={() => setField("pricingMode", "kg")}
                                    title="Ціна за кілограм"
                                >
                                    ₴/кг
                                </button>
                                <button
                                    type="button"
                                    className={"seg-btn" + (form.pricingMode === "pcs" ? " is-active" : "")}
                                    role="tab"
                                    aria-selected={form.pricingMode === "pcs"}
                                    onClick={() => setField("pricingMode", "pcs")}
                                    title="Ціна за штуку"
                                >
                                    ₴/шт
                                </button>
                            </div>
                        </div>

                        <div className="avail">
                            <span className="field-label" style={{ marginRight: 8 }}>Наявність:</span>
                            <button
                                type="button"
                                className={"switch" + (form.isAvailable ? " is-on" : "")}
                                role="switch"
                                aria-checked={form.isAvailable}
                                onClick={() => setField("isAvailable", !form.isAvailable)}
                                title="Ввімкнути/вимкнути продаж"
                            >
                                <span className="switch__track">
                                    <span className="switch__thumb" />
                                </span>
                                <span className="switch__text">{form.isAvailable ? "є" : "нема"}</span>
                            </button>
                        </div>
                    </div>

                    <label>
                        <span>Вага 1 шт, г</span>
                        <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            value={typeof form.weightPerPiece === "number" ? String(form.weightPerPiece) : ""}
                            onChange={(e) => setField("weightPerPiece", e.target.value)}
                            placeholder="напр.: 7.5"
                        />
                    </label>

                    {/* Ціна за кг */}
                    {form.pricingMode === "kg" && (
                        <>
                            <label>
                                <span>₴/кг (вхідна)</span>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.01"
                                    min="0"
                                    value={typeof form.pricePerKgBuy === "number" ? String(form.pricePerKgBuy) : ""}
                                    onChange={(e) => setField("pricePerKgBuy", e.target.value)}
                                    placeholder="напр.: 180"
                                />
                            </label>

                            <label>
                                <span>₴/кг (продаж)</span>
                                <input
                                    required
                                    type="number"
                                    inputMode="decimal"
                                    step="0.01"
                                    min="0"
                                    value={typeof form.pricePerKgSell === "number" ? String(form.pricePerKgSell) : ""}
                                    onChange={(e) => setField("pricePerKgSell", e.target.value)}
                                    placeholder="напр.: 240"
                                />
                            </label>

                            <div className="preview span2">
                                <div>
                                    <b>Еквівалент ₴/шт:</b> {fmtUAH(derived.buyPerPcsFromKg)} (вх), {fmtUAH(derived.sellPerPcsFromKg)} (пр)
                                </div>
                                <div>
                                    <b>шт/кг:</b> {typeof derived.piecesPerKg === "number" ? derived.piecesPerKg : "—"}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Ціна за штуку */}
                    {form.pricingMode === "pcs" && (
                        <>
                            <label>
                                <span>₴/шт (вхідна)</span>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.01"
                                    min="0"
                                    value={typeof form.pricePerPcsBuy === "number" ? String(form.pricePerPcsBuy) : ""}
                                    onChange={(e) => setField("pricePerPcsBuy", e.target.value)}
                                    placeholder="напр.: 2.3"
                                />
                            </label>

                            <label>
                                <span>₴/шт (продаж)</span>
                                <input
                                    required
                                    type="number"
                                    inputMode="decimal"
                                    step="0.01"
                                    min="0"
                                    value={typeof form.pricePerPcsSell === "number" ? String(form.pricePerPcsSell) : ""}
                                    onChange={(e) => setField("pricePerPcsSell", e.target.value)}
                                    placeholder="напр.: 3.5"
                                />
                            </label>

                            <div className="preview span2">
                                <div>
                                    <b>Еквівалент ₴/кг:</b> {fmtUAH(derived.buyPerKgFromPcs)} (вх), {fmtUAH(derived.sellPerKgFromPcs)} (пр)
                                </div>
                                <div>
                                    <b>шт/кг:</b> {typeof derived.piecesPerKg === "number" ? derived.piecesPerKg : "—"}
                                </div>
                            </div>
                        </>
                    )}

                    <div className="span2 muted">{availabilityHint}</div>
                </div>
            </form>

            {/* footer */}
            <div className="modal__actions">
                <div className="spacer" />
                <button className="btn" type="button" onClick={onClose} disabled={saving}>
                    Скасувати
                </button>
                <button className="btn btn-primary" type="submit" form="edit-form" disabled={saving}>
                    {saving ? "Зберігаю…" : "Зберегти"}
                </button>
            </div>
        </Modal>
    );
}