// src/services/orders.service.ts
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {api} from "./api.services";

/* =========================
   Types
   ========================= */
export type OrderStatus =
    | "нове"
    | "підтверджено"
    | "збирається"
    | "відправлено"
    | "отримано";

export type CandyItem = {
    candyId: string;
    name?: string;
    pricingMode?: "pcs" | "kg";
    qtyPieces?: number;
    weightG?: number;
    // ціна продажу за шт/кг (коп)
    sellUnitKop?: number;
    sellPerKgKop?: number;
    // собівартість за шт/кг (коп)
    buyUnitKop?: number;
    buyPerKgKop?: number;
    // підсумки по позиції (коп)
    subtotalSellKop?: number;
    subtotalBuyKop?: number;

    // технічні ідентифікатори
    id?: string;
    _id?: string;

    // допоміжні поля, якщо бекенд їх віддає
    weightPerPieceG?: number;
    pieceWeightG?: number;
    piecesPerKg?: number;

    // Додано для зручності в OrderDetailsPage
    piecePriceKop?: number; // ціна за штуку
};

export type PackItem = {
    packagingId: string;
    name?: string;
    qty: number;
    // ціни за одиницю (коп)
    sellKop?: number;
    buyKop?: number;
    priceKop?: number; // альтернативне ім'я для sellKop
    // підсумки по позиції (коп)
    subtotalSellKop?: number;
    subtotalBuyKop?: number;

    // технічні
    id?: string;
    _id?: string;
};

export type Order = {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    createdAt?: string;
    updatedAt?: string;

    customer: { name: string; phone: string; email?: string };

    /** дублікати для зручного пошуку на фронті */
    customerName?: string;
    phone?: string;
    email?: string; // Додано для зручності

    comment?: string;

    candies: CandyItem[];
    packs: PackItem[];

    totalKop: number;      // сума до сплати
    costKop?: number;      // собівартість
    profitKop?: number;    // прибуток
    totalWeightG?: number; // загальна вага
};

export type CreateOrderRequest = {
    customer: {
        name: string;
        phone: string;
        email?: string;
    };
    comment?: string;
    candies: Array<{
        candyId: string;
        qtyPieces?: number; // для поштучних
        weightG?: number;   // для вагових
    }>;
    packs: Array<{
        packagingId: string;
        qty: number;
    }>;
};

export type UpdateOrderRequest = {
    status?: OrderStatus;
    customer?: {
        name?: string;
        phone?: string;
        email?: string;
    };
    comment?: string;
};

/* =========================
   Mappers & helpers
   ========================= */
const normId = (v: any) => String(v ?? "");

const mapCandy = (c: any): CandyItem => {
    const candy: CandyItem = {
        ...c,
        id: normId(c?.id ?? c?._id),
        candyId: normId(c?.candyId ?? c?.candy?._id ?? c?.candy?.id),
        name: c?.name ?? c?.candy?.name,
    };

    // Додаємо piecePriceKop для зручності
    if (candy.qtyPieces && candy.subtotalSellKop) {
        candy.piecePriceKop = Math.round(candy.subtotalSellKop / candy.qtyPieces);
    }

    return candy;
};

const mapPack = (p: any): PackItem => ({
    ...p,
    id: normId(p?.id ?? p?._id),
    packagingId: normId(p?.packagingId ?? p?.packaging?._id ?? p?.packaging?.id),
    name: p?.name ?? p?.packaging?.name,
    // Забезпечуємо сумісність полів ціни
    priceKop: p?.priceKop ?? p?.sellKop,
    sellKop: p?.sellKop ?? p?.priceKop,
});

const toOrder = (o: any): Order => {
    const id = normId(o?.id ?? o?._id);
    const customer =
        o?.customer ??
        ({
            name: o?.customerName ?? "Клієнт",
            phone: o?.phone ?? "",
            email: o?.email,
        } as Order["customer"]);

    const candies: CandyItem[] = Array.isArray(o?.candies)
        ? o.candies.map(mapCandy)
        : [];
    const packs: PackItem[] = Array.isArray(o?.packs)
        ? o.packs.map(mapPack)
        : [];

    return {
        id,
        orderNumber: String(o?.orderNumber ?? ""),
        status: (o?.status as OrderStatus) ?? "нове",
        createdAt: o?.createdAt,
        updatedAt: o?.updatedAt,
        customer,
        customerName: customer?.name,
        phone: customer?.phone,
        email: customer?.email, // Додано

        comment: o?.comment,
        candies,
        packs,

        totalKop:
            typeof o?.totalKop === "number"
                ? o.totalKop
                : Math.round(((o?.total ?? 0) as number) * 100),
        costKop: o?.costKop,
        profitKop: o?.profitKop,
        totalWeightG: o?.totalWeightG,
    };
};

const sortByCreatedDesc = (a?: string, b?: string) => {
    const ta = a ? new Date(a).getTime() : 0;
    const tb = b ? new Date(b).getTime() : 0;
    return tb - ta;
};

/* =========================
   API functions
   ========================= */
export const getAllOrders = async (): Promise<Order[]> => {
    const {data} = await api.get<any[] | { items: any[] }>("orders");
    const arr = Array.isArray(data) ? data : data?.items ?? [];
    return arr.map(toOrder).sort((A, B) => sortByCreatedDesc(A.createdAt, B.createdAt));
};

export const getOrderById = async (id: string): Promise<Order> => {
    const {data} = await api.get<any>(`orders/${id}`);
    const raw = data?.item ?? data;
    return toOrder(raw);
};

export const createOrder = async (
    orderData: CreateOrderRequest
): Promise<Order> => {
    const {data} = await api.post<any>("orders", orderData);
    const raw = data?.item ?? data;
    return toOrder(raw);
};

export const updateOrderStatus = async ({
                                            id,
                                            status,
                                        }: {
    id: string;
    status: OrderStatus;
}): Promise<void> => {
    await api.patch(`orders/${id}`, {status});
};

export const updateOrder = async (
    id: string,
    updateData: UpdateOrderRequest
): Promise<Order> => {
    const {data} = await api.patch<any>(`orders/${id}`, updateData);
    const raw = data?.item ?? data;
    return toOrder(raw);
};

export const deleteOrder = async (id: string): Promise<void> => {
    if (!id) throw new Error("order id is required");
    await api.delete(`orders/${id}`);
};

/* =========================
   React Query hooks
   ========================= */
export function useOrders() {
    return useQuery({
        queryKey: ["orders"],
        queryFn: getAllOrders,
    });
}

export function useOrder(id?: string) {
    return useQuery({
        queryKey: ["order", id], // Змінено з ["orders", id] на ["order", id] для консистентності
        queryFn: () => getOrderById(id!),
        enabled: !!id,
    });
}

export function useCreateOrder() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: createOrder,
        onSuccess: () => {
            qc.invalidateQueries({queryKey: ["orders"]});
        },
    });
}

export function useUpdateOrderStatus() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: updateOrderStatus,
        onSuccess: (_data, vars) => {
            qc.invalidateQueries({queryKey: ["orders"]});
            qc.invalidateQueries({queryKey: ["order", vars.id]});
        },
    });
}

export function useUpdateOrder() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({id, updateData}: { id: string; updateData: UpdateOrderRequest }) =>
            updateOrder(id, updateData),
        onSuccess: (data, vars) => {
            qc.invalidateQueries({queryKey: ["orders"]});
            qc.invalidateQueries({queryKey: ["order", vars.id]});
            qc.setQueryData(["order", vars.id], data);
        },
    });
}

export function useDeleteOrder() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: deleteOrder,
        onSuccess: (_data, id) => {
            qc.invalidateQueries({queryKey: ["orders"]});
            qc.invalidateQueries({queryKey: ["order", id]});
        },
    });
}