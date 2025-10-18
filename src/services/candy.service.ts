// src/services/candy.service.ts
import { api } from "./api.services";
import {type ICandy} from "../../models/ICandy";

export const getAllCandy = async (): Promise<ICandy[]> => {
    const { data } = await api.get<ICandy[]>("candy"); // БЕЗ початкового слеша
    return data;                                       // очікуємо масив
};
