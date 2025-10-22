// src/pages/admin/AdminPackagingPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidatePackaging, packagingApi } from "@/services/packaging.admin.service";
import type { AdminPackaging } from "@/services/packaging.admin.service";
import { PACKAGING_IMG } from "@/services/packaging.images"; // ← fallback локальних картинок

import "./packaging.admin.css";

function slugifyKey(s: string) {
    return String(s || "")
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-+|-+$/g, "");
}

/* ---------- types / state ---------- */
type FormState = {
    _id?: string;
    key: string;
    name: string;
    priceSell: number | "";
    priceBuy: number | "";
    capacityG: number | "";
    imageUrl?: string;
    isAvailable: boolean;
};

const emptyForm: FormState = {
    key: "",
    name: "",
    priceSell: "",
    priceBuy: "",
    capacityG: "",
    imageUrl: "",
    isAvailable: true,
};

type UpsertBody = {
    key: string;
    name: string;
    priceSell: number;
    priceBuy: number;
    capacityG: number;
    imageUrl?: string;
    isAvailable: boolean;
};

/* ---------- image resolver ---------- */
const API_BASE = (import.meta.env.VITE_API_URL_USERS || import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
function resolveImg(row: Pick<AdminPackaging, "imageUrl" | "imageKey" | "key">) {
    const direct = row.imageUrl?.trim();
    if (direct) {
        if (/^https?:\/\//i.test(direct)) return direct;                  // абсолютний
        return `${API_BASE}/${direct.replace(/^\/+/, "")}`;               // відносний -> доповнюємо
    }
    const k = (row.imageKey || row.key || "").toLowerCase();            // fallback по ключу
    return PACKAGING_IMG[k];                                            // може бути undefined
}

/* ---------- component ---------- */
export default function AdminPackagingPage() {
    const qc = useQueryClient();

    const { data = [], isLoading, isError, error } = useQuery({
        queryKey: ["admin:packaging:list"],
        queryFn: ({ signal }) => packagingApi.list(signal),
        staleTime: 60_000,
    });

    const [q, setQ] = useState("");
    const [sort, setSort] = useState<"name" | "price" | "capacity" | "updated">("name");

    const view = useMemo(() => {
        let arr = [...data];
        if (q.trim()) {
            const s = q.trim().toLowerCase();
            arr = arr.filter((x) => x.name.toLowerCase().includes(s) || x.key.toLowerCase().includes(s));
        }
        arr.sort((a, b) => {
            if (sort === "name") return a.name.localeCompare(b.name, "uk");
            if (sort === "price") return b.priceSell - a.priceSell || a.name.localeCompare(b.name, "uk");
            if (sort === "capacity") return b.capacityG - a.capacityG || a.name.localeCompare(b.name, "uk");
            return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
        });
        return arr;
    }, [data, q, sort]);

    // modal
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm);
    const editing = Boolean(form._id);
    const firstInputRef = useRef<HTMLInputElement | null>(null);

    const openCreate = () => {
        setForm(emptyForm);
        setOpen(true);
    };
    const openEdit = (row: AdminPackaging) => {
        setForm({
            _id: row._id,
            key: row.key,
            name: row.name,
            priceSell: row.priceSell,
            priceBuy: row.priceBuy ?? 0,
            capacityG: row.capacityG,
            imageUrl: row.imageUrl || "",
            isAvailable: row.isAvailable,
        });
        setOpen(true);
    };
    const close = () => setOpen(false);

    useEffect(() => {
        if (!editing && form.name && !form.key) setForm((f) => ({ ...f, key: slugifyKey(f.name) }));
    }, [form.name, editing]);

    // block scroll + Esc + autofocus
    useEffect(() => {
        if (open) {
            document.body.classList.add("modal-open");
            setTimeout(() => firstInputRef.current?.focus(), 0);
        } else {
            document.body.classList.remove("modal-open");
        }
        return () => document.body.classList.remove("modal-open");
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    // mutations
    const createMut = useMutation({
        mutationFn: (payload: UpsertBody) => packagingApi.create(payload),
        onSuccess: () => {
            invalidatePackaging(qc);
            close();
        },
    });

    const updateMut = useMutation({
        mutationFn: ({ _id, body }: { _id: string; body: UpsertBody }) => packagingApi.update(_id, body),
        onSuccess: () => {
            invalidatePackaging(qc);
            close();
        },
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => packagingApi.remove(id),
        onSuccess: () => invalidatePackaging(qc),
    });

    const toggleAvailMut = useMutation({
        mutationFn: ({ id, next }: { id: string; next: boolean }) => packagingApi.update(id, { isAvailable: next }),
        onMutate: async ({ id, next }) => {
            await qc.cancelQueries({ queryKey: ["admin:packaging:list"] });
            const prev = qc.getQueryData<AdminPackaging[]>(["admin:packaging:list"]);
            if (prev) qc.setQueryData(["admin:packaging:list"], prev.map((x) => (x._id === id ? { ...x, isAvailable: next } : x)));
            return { prev };
        },
        onError: (_e, _v, ctx) => {
            if (ctx?.prev) qc.setQueryData(["admin:packaging:list"], ctx.prev);
        },
        onSettled: () => invalidatePackaging(qc),
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: UpsertBody = {
            key: form.key.trim(),
            name: form.name.trim(),
            priceSell: Number(form.priceSell) || 0,
            priceBuy: Number(form.priceBuy) || 0,
            capacityG: Number(form.capacityG) || 0,
            imageUrl: form.imageUrl?.trim() || undefined,
            isAvailable: Boolean(form.isAvailable),
        };
        if (!payload.key || !payload.name) return alert("Заповніть Key та Назву");
        if (payload.priceSell < 0 || payload.priceBuy < 0 || payload.capacityG < 0)
            return alert("Ціни/Місткість не можуть бути від’ємними");
        editing && form._id ? updateMut.mutate({ _id: form._id, body: payload }) : createMut.mutate(payload);
    };

    return (
        <div className="admin-pack">
            <div className="admin-pack__head">
                <h1 className="title">Упаковки</h1>
                <div className="tools">
                    <input
                        className="inp"
                        placeholder="Пошук: назва або ключ…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                    <select className="inp" value={sort} onChange={(e) => setSort(e.target.value as any)}>
                        <option value="name">За назвою</option>
                        <option value="price">Спочатку дорожчі</option>
                        <option value="capacity">За місткістю</option>
                        <option value="updated">Нещодавно змінені</option>
                    </select>
                    <button className="btn solid" onClick={openCreate}>+ Додати</button>
                </div>
            </div>

            {isLoading && <div className="muted">Завантаження…</div>}
            {isError && <div className="error">Помилка: {(error as Error).message}</div>}

            {!isLoading && !isError && (
                <div className="tbl">
                    <div className="tbl-head">
                        <div>Фото</div>
                        <div>Назва</div>
                        <div>₴ куп.</div>
                        <div>₴ прод.</div>
                        <div>Вміст, г</div>
                        <div>Ключ</div>
                        <div>Наявність</div>
                        <div></div>
                    </div>

                    {view.map((row) => (
                        <div key={row._id} className="tbl-row">
                            <div className="cell media">
                                {(() => {
                                    const src = resolveImg(row);
                                    return src ? <img src={src} alt={row.name} /> : <div className="ph">🎁</div>;
                                })()}
                            </div>
                            <div className="cell name">
                                <div className="n">{row.name}</div>
                                <div className="sub">{row.updatedAt ? new Date(row.updatedAt).toLocaleString("uk-UA") : ""}</div>
                            </div>
                            <div className="cell num">{typeof row.priceBuy === "number" ? row.priceBuy.toFixed(2) : "—"}</div>
                            <div className="cell num">{typeof row.priceSell === "number" ? row.priceSell.toFixed(2) : "—"}</div>
                            <div className="cell num">{row.capacityG}</div>
                            <div className="cell mono">{row.key}</div>
                            <div className="cell">
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={row.isAvailable}
                                        onChange={(e) => toggleAvailMut.mutate({ id: row._id, next: e.target.checked })}
                                    />
                                    <span />
                                </label>
                            </div>
                            <div className="cell act">
                                <button className="btn" onClick={() => openEdit(row)}>Редаг.</button>
                                <button
                                    className="btn danger"
                                    onClick={() => {
                                        if (confirm(`Видалити "${row.name}"?`)) deleteMut.mutate(row._id);
                                    }}
                                >
                                    Видалити
                                </button>
                            </div>
                        </div>
                    ))}

                    {!view.length && <div className="muted pad">Нічого не знайдено.</div>}
                </div>
            )}

            {open && (
                <div className="pack-modal" onMouseDown={close} role="dialog" aria-modal="true">
                    <div className="pack-modal__card" onMouseDown={(e) => e.stopPropagation()}>
                        <div className="pack-modal__top">
                            <h2 className="pack-modal__title">{editing ? "Редагувати упаковку" : "Нова упаковка"}</h2>
                            <button className="btn-x" type="button" onClick={close} aria-label="Закрити">×</button>
                        </div>

                        <form onSubmit={submit} className="pack-form">
                            <div className="pack-modal__body">
                                <div className="grid">
                                    <label className="lbl">
                                        <span>Назва *</span>
                                        <input
                                            ref={firstInputRef}
                                            className="inp"
                                            value={form.name}
                                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                            required
                                        />
                                    </label>

                                    <label className="lbl">
                                        <span>Ключ *</span>
                                        <input
                                            className="inp mono"
                                            value={form.key}
                                            onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                                            required
                                        />
                                    </label>

                                    <label className="lbl">
                                        <span>Ціна покупки (грн) *</span>
                                        <input
                                            className="inp"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={form.priceBuy}
                                            onChange={(e) => setForm((f) => ({ ...f, priceBuy: e.target.value === "" ? "" : Number(e.target.value) }))}
                                            required
                                        />
                                    </label>

                                    <label className="lbl">
                                        <span>Ціна продажу (грн) *</span>
                                        <input
                                            className="inp"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={form.priceSell}
                                            onChange={(e) => setForm((f) => ({ ...f, priceSell: e.target.value === "" ? "" : Number(e.target.value) }))}
                                            required
                                        />
                                    </label>

                                    <label className="lbl">
                                        <span>Вміст, грам *</span>
                                        <input
                                            className="inp"
                                            type="number"
                                            step="1"
                                            min="0"
                                            value={form.capacityG}
                                            onChange={(e) => setForm((f) => ({ ...f, capacityG: e.target.value === "" ? "" : Number(e.target.value) }))}
                                            required
                                        />
                                    </label>

                                    <label className="lbl">
                                        <span>Зображення (URL)</span>
                                        <input
                                            className="inp"
                                            value={form.imageUrl || ""}
                                            onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                                            placeholder="https://... або /uploads/box-1.webp"
                                        />
                                    </label>

                                    <label className="lbl chk">
                                        <input
                                            type="checkbox"
                                            checked={form.isAvailable}
                                            onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.checked }))}
                                        />
                                        <span>В наявності</span>
                                    </label>
                                </div>
                            </div>

                            <div className="pack-modal__actions">
                                <button type="button" className="btn ghost" onClick={close}>Скасувати</button>
                                <button type="submit" className="btn solid" disabled={createMut.isPending || updateMut.isPending}>
                                    {editing ? "Зберегти" : "Створити"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
