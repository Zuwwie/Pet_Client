// src/services/admin/packaging.admin.service.ts
import { QueryClient } from "@tanstack/react-query";

export type AdminPackaging = {
    _id: string;
    key: string;          // "box-1"
    name: string;
    priceSell: number;    // грн/шт (продаж)
    priceBuy?: number;    // грн/шт (закупка)  <-- NEW (optional для сумісності)
    capacityG: number;
    imageUrl?: string;
    imageKey?: string;
    isAvailable: boolean;
    category?: string;
    createdAt?: string;
    updatedAt?: string;
};

// payload-и для API
export type CreatePackagingBody = {
    key: string;
    name: string;
    priceSell: number;
    priceBuy: number;       // <-- NEW (required у create)
    capacityG: number;
    imageUrl?: string;
    imageKey?: string;
    isAvailable: boolean;
    category?: string;
};
export type UpdatePackagingBody = Partial<CreatePackagingBody>;

const BASE = (import.meta.env.VITE_API_URL_USERS || import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const url = (p: string) => `${BASE}/${p.replace(/^\/+/, "")}`; // BASE вже має /api

async function json<T>(res: Response): Promise<T> {
    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText}\n${txt}`);
    }
    return res.json() as Promise<T>;
}

export const packagingApi = {
    list: (signal?: AbortSignal) =>
        fetch(url("packaging"), { signal }).then(json<AdminPackaging[]>),

    create: (body: CreatePackagingBody) =>
        fetch(url("packaging"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }).then(json<AdminPackaging>),

    update: (id: string, body: UpdatePackagingBody) =>
        fetch(url(`packaging/${id}`), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }).then(json<AdminPackaging>),

    remove: (id: string) =>
        fetch(url(`packaging/${id}`), { method: "DELETE" }).then(json<{ ok: true }>),
};

// зручно: інвалідатор списку
export const invalidatePackaging = (qc: QueryClient) =>
    qc.invalidateQueries({ queryKey: ["admin:packaging:list"] });
