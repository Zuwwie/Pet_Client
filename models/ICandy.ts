export interface ICandy {
    _id: string;
    name: string;
    category: string;
    isAvailable?: boolean;
    photoUrl?: string;
    imageUrl?: string;
    pricePerKgBuy: number;
    pricePerKgSell: number;
    pricePerPcsBuy: number;
    pricePerPcsSell: number;
    weightPerPiece: number;
    piecesPerKg: number;
    createdAt?: string;
    updatedAt?: string;
}
