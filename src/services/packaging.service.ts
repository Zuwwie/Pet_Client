// src/services/packaging.service.ts
import { useQuery } from "@tanstack/react-query";
import type { IPackaging } from "@/models/IPackaging";
import { PACKAGING_IMG } from "@/services/packaging.images";

type ApiPackaging = {
    _id: string;
    key: string;
    name: string;
    priceSell: number;   // грн/шт
    capacityG: number;
    imageUrl?: string;
    imageKey?: string;
    isAvailable?: boolean;
};

const toKop = (uah?: number) => Math.round(((uah ?? 0) as number) * 100);
const join = (base: string, path: string) =>
    `${base.replace(/\/+$/,"")}/${path.replace(/^\/+/,"")}`;

export async function fetchPackaging(signal?: AbortSignal): Promise<IPackaging[]> {
    const BASE = (import.meta.env.VITE_API_URL_USERS || import.meta.env.VITE_API_URL || "").trim();
    const url = join(BASE, "packaging");

    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`Packaging HTTP ${res.status}`);
    const data = (await res.json()) as ApiPackaging[];

    return data
        // ВИДАЛИТИ цей фільтр, щоб отримувати всі пакування
        // .filter(x => x.isAvailable !== false)
        .map<IPackaging>(d => ({
            id: d.key,
            name: d.name,
            priceKop: toKop(d.priceSell),
            capacityG: d.capacityG,
            imageUrl: d.imageUrl || PACKAGING_IMG[(d.imageKey || d.key).toLowerCase()],
            isAvailable: d.isAvailable, // ДОДАТИ це поле до IPackaging
        }))
        .sort((a, b) => (b.priceKop - a.priceKop) || a.name.localeCompare(b.name, "uk"));
}

export function usePackaging() {
    return useQuery({
        queryKey: ["packaging:list"],
        queryFn: ({ signal }) => fetchPackaging(signal),
        staleTime: 5 * 60 * 1000,
        retry: 1,
    });
}