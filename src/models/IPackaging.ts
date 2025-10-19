export type IPackaging = {
    id: string;             // = ім'я файла без розширення
    name: string;
    priceKop: number;       // ціна за 1 пакунок (у коп.)
    capacityG?: number;
    imageUrl?: string;
    isActive?: boolean;
};
