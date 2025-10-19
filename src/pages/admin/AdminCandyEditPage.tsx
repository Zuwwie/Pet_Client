// src/pages/admin/AdminCandyEditPage.tsx
import {useEffect, useMemo, useRef, useState} from "react";
import {api} from "../../services/api.services";
import "./admin.css";

type EditorCandy = {
    _id: string;
    name: string;
    category?: string;
    isAvailable?: boolean;
    photoUrl?: string;
    weightPerPiece?: number;   // g/pc
    pricePerKgBuy?: number;    // UAH/kg
    pricePerKgSell?: number;   // UAH/kg
};

type Props = {
    id: string;                          // "new" у create-mode
    create?: boolean;                    // ← нове
    initial?: Partial<EditorCandy>;
    onClose: () => void;
    onSaved: (c: EditorCandy) => void;
    onDeleted: (id: string) => void;
};

const num = (v: any): number | undefined => {
    if (v === "" || v === null || v === undefined) return undefined;
    const n = typeof v === "string" ? parseFloat(v.replace(",", ".")) : v;
    return Number.isFinite(n) ? Number(n) : undefined;
};

// простий toast (2s) — ізольований клас
const showToast = (
    text: string,
    variant: "success" | "error" | "danger" = "success"
) => {
    const el = document.createElement("div");
    el.className = `admin-toast admin-toast--${variant}`;
    el.textContent = text;
    document.body.appendChild(el);

    requestAnimationFrame(() => el.classList.add("is-open"));

    setTimeout(() => {
        el.classList.remove("is-open");
        setTimeout(() => el.remove(), 250);
    }, 2000);
};


export default function AdminCandyEditPage({
                                               id,
                                               create = false,
                                               initial,
                                               onClose,
                                               onSaved,
                                               onDeleted,
                                           }: Props) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const [name, setName] = useState("");
    const [category, setCategory] = useState<string>("");
    const [photoUrl, setPhotoUrl] = useState<string>("");
    const [isAvailable, setIsAvailable] = useState<boolean>(true);

    const [pricePerKgBuy, setPricePerKgBuy] = useState<string>("");
    const [pricePerKgSell, setPricePerKgSell] = useState<string>("");
    const [weightPerPiece, setWeightPerPiece] = useState<string>("");

    const dialogRef = useRef<HTMLDivElement>(null);

    // ---- Derived ----
    const perPieceBuy = useMemo(() => {
        const kg = num(pricePerKgBuy);
        const w = num(weightPerPiece);
        return kg && w ? (kg * w) / 1000 : undefined;
    }, [pricePerKgBuy, weightPerPiece]);

    const perPieceSell = useMemo(() => {
        const kg = num(pricePerKgSell);
        const w = num(weightPerPiece);
        return kg && w ? (kg * w) / 1000 : undefined;
    }, [pricePerKgSell, weightPerPiece]);

    const markupPct = useMemo(() => {
        if (typeof perPieceBuy === "number" && perPieceBuy > 0 && typeof perPieceSell === "number") {
            return ((perPieceSell - perPieceBuy) / perPieceBuy) * 100;
        }
        return undefined;
    }, [perPieceBuy, perPieceSell]);

    const canSave =
        name.trim().length > 0 &&
        !!num(pricePerKgBuy) &&
        !!num(pricePerKgSell) &&
        !!num(weightPerPiece);

    // ---- Load (skip on create) ----
    useEffect(() => {
        let aborted = false;
        (async () => {
            setErr(null);
            if (create) {
                // початкові значення (порожні)
                setName(initial?.name ?? "");
                setCategory(initial?.category ?? "");
                setPhotoUrl(initial?.photoUrl ?? "");
                setIsAvailable(initial?.isAvailable ?? true);
                setPricePerKgBuy(String(initial?.pricePerKgBuy ?? ""));
                setPricePerKgSell(String(initial?.pricePerKgSell ?? ""));
                setWeightPerPiece(String((initial as any)?.weightPerPiece ?? ""));
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const {data} = await api.get<any>(`candy/${id}`);
                const it = data ?? initial ?? {};
                if (aborted) return;

                setName(it.name ?? initial?.name ?? "");
                setCategory(it.category ?? initial?.category ?? "");
                setPhotoUrl(it.photoUrl ?? it.imageUrl ?? it.photo ?? initial?.photoUrl ?? "");
                setIsAvailable(it.isAvailable !== false);

                setPricePerKgBuy(String(num(it.pricePerKgBuy) ?? num((initial as any)?.pricePerKgBuy) ?? ""));
                setPricePerKgSell(String(num(it.pricePerKgSell) ?? num((initial as any)?.pricePerKgSell) ?? ""));
                setWeightPerPiece(String(num(it.weightPerPiece ?? it.weightPerPieceG) ?? num((initial as any)?.weightPerPiece) ?? ""));
            } catch (e: any) {
                if (initial) {
                    setName(initial.name ?? "");
                    setCategory(initial.category ?? "");
                    setPhotoUrl(initial.photoUrl ?? "");
                    setIsAvailable(initial.isAvailable ?? true);
                    setPricePerKgBuy(String(initial.pricePerKgBuy ?? ""));
                    setPricePerKgSell(String(initial.pricePerKgSell ?? ""));
                    setWeightPerPiece(String((initial as any).weightPerPiece ?? ""));
                } else {
                    setErr(e?.message || "Помилка завантаження");
                }
            } finally {
                if (!aborted) setLoading(false);
            }
        })();
        return () => {
            aborted = true;
        };
    }, [id, initial, create]);

    // ---- Close on Esc / backdrop ----
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        const el = dialogRef.current;
        const onClick = (e: MouseEvent) => {
            if (e.target === el) onClose();
        };

        document.addEventListener("keydown", onKey);
        el?.addEventListener("click", onClick);
        return () => {
            document.removeEventListener("keydown", onKey);
            el?.removeEventListener("click", onClick);
        };
    }, [onClose]);

    // ---- Actions ----
    const handleSave = async () => {
        if (!canSave) return;
        setSaving(true);
        setErr(null);
        try {
            const body: EditorCandy = {
                _id: create ? "" : id,
                name: name.trim(),
                category: category.trim() || undefined,
                photoUrl: photoUrl.trim() || undefined,
                isAvailable,
                weightPerPiece: num(weightPerPiece),
                pricePerKgBuy: num(pricePerKgBuy),
                pricePerKgSell: num(pricePerKgSell),
            };

            let savedApi: any;
            if (create) {
                const {data} = await api.post<any>("candy", {...body, _id: undefined});
                savedApi = data;
            } else {
                const {data} = await api.patch<any>(`candy/${id}`, body);
                savedApi = data;
            }

            const saved: EditorCandy = {
                _id: savedApi?._id || id,
                name: savedApi?.name ?? body.name,
                category: savedApi?.category ?? body.category,
                photoUrl: savedApi?.photoUrl ?? body.photoUrl,
                isAvailable: savedApi?.isAvailable ?? body.isAvailable,
                weightPerPiece: num(savedApi?.weightPerPiece ?? savedApi?.weightPerPieceG) ?? body.weightPerPiece,
                pricePerKgBuy: num(savedApi?.pricePerKgBuy) ?? body.pricePerKgBuy,
                pricePerKgSell: num(savedApi?.pricePerKgSell) ?? body.pricePerKgSell,
            };

            onSaved(saved);
            showToast(create ? "Додано" : "Збережено", "success");
            onClose(); // автозакриття
        } catch (e: any) {
            setErr(e?.message || (create ? "Не вдалося додати" : "Не вдалося зберегти"));
            showToast("Помилка", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (create) return; // у create-mode видаляти нічого
        if (!confirm("Видалити цукерку? Дію не можна скасувати.")) return;
        setSaving(true);
        setErr(null);
        try {
            await api.delete(`candy/${id}`);
            onDeleted(id);
            showToast("Видалено", "danger");
            onClose(); // автозакриття
        } catch (e: any) {
            setErr(e?.message || "Не вдалося видалити");
            showToast("Помилка видалення", "error");
        } finally {
            setSaving(false);
        }
    };

    // інлайн-стилі для гарантованої зміни кольору перемикача
    const segStyle = isAvailable
        ? {borderColor: "#16a34a", boxShadow: "0 0 0 6px rgba(22,163,74,.12) inset"}
        : {borderColor: "#dc2626", boxShadow: "0 0 0 6px rgba(220,38,38,.12) inset"};
    const yesStyle = isAvailable ? {background: "#16a34a", color: "#fff"} : undefined;
    const noStyle = !isAvailable ? {background: "#dc2626", color: "#fff"} : undefined;

    return (
        <div className="modal-overlay" ref={dialogRef} role="dialog" aria-modal="true">
            <div className="modal">
                <header className="modal__top">
                    <h2>{create ? "Нова цукерка" : "Редагування цукерки"}</h2>
                    <button className="btn-x" onClick={onClose} aria-label="Закрити">×</button>
                </header>

                {loading ? (
                    <div className="modal__body">Завантаження…</div>
                ) : (
                    <div className="modal__body">
                        {err ? <div className="error">{err}</div> : null}

                        <div className="form2">
                            <label>
                                <span>Назва *</span>
                                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Назва"
                                       autoFocus/>
                            </label>

                            <label>
                                <span>Категорія *</span>
                                <input value={category} onChange={(e) => setCategory(e.target.value)}
                                       placeholder="Категорія"/>
                            </label>

                            <label>
                                <span>Собівартість за 1000г (₴) *</span>
                                <input inputMode="decimal" value={pricePerKgBuy}
                                       onChange={(e) => setPricePerKgBuy(e.target.value)} placeholder="0.00"/>
                            </label>

                            <label>
                                <span>Ціна продажу за 1000г (₴) *</span>
                                <input inputMode="decimal" value={pricePerKgSell}
                                       onChange={(e) => setPricePerKgSell(e.target.value)} placeholder="0.00"/>
                            </label>

                            <label className="span2">
                                <span>Вага однієї цукерки (г) *</span>
                                <input inputMode="decimal" value={weightPerPiece}
                                       onChange={(e) => setWeightPerPiece(e.target.value)} placeholder="0"/>
                            </label>

                            <label className="span2">
                                <span>Фото (URL)</span>
                                <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)}
                                       placeholder="https://..."/>
                            </label>

                            <div className="seg-wrap span2">
                                <span className="field-label">В наявності</span>
                                <div className={`seg ${isAvailable ? "seg--yes" : "seg--no"}`} style={segStyle}
                                     role="radiogroup" aria-label="В наявності">
                                    <button type="button" className={`seg-btn ${isAvailable ? "is-active yes" : ""}`}
                                            style={yesStyle}
                                            aria-pressed={isAvailable} onClick={() => setIsAvailable(true)}>Так
                                    </button>
                                    <button type="button" className={`seg-btn ${!isAvailable ? "is-active no" : ""}`}
                                            style={noStyle}
                                            aria-pressed={!isAvailable} onClick={() => setIsAvailable(false)}>Ні
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="preview">
                            <div><b>₴/шт (вх.):</b> {perPieceBuy ? perPieceBuy.toFixed(2) : "—"}</div>
                            <div><b>₴/шт (прод.):</b> {perPieceSell ? perPieceSell.toFixed(2) : "—"}</div>
                            <div><b>Націнка:</b> {markupPct !== undefined ? `${markupPct.toFixed(0)}%` : "—"}</div>
                        </div>
                    </div>
                )}

                <footer className="modal__actions">
                    {!create && (
                        <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>Видалити</button>
                    )}
                    <div className="spacer"/>
                    <button className="btn" onClick={onClose} disabled={saving}>Скасувати</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving || loading || !canSave}>
                        {create ? "Додати" : "Зберегти"}
                    </button>
                </footer>
            </div>
        </div>
    );
}
