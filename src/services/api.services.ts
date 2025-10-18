import type {IUser} from "../../models/IUser.ts";

export const getAllUsers = async (): Promise<IUser[]> => {

    let users = await fetch(import.meta.env.VITE_API_URL_USERS)
        .then((value) => value.json());

    return users;
}

export const getUserById = async (id: string): Promise<IUser> => {
    let user = await fetch(import.meta.env.VITE_API_URL_USERS + `${id}`)
        .then((value) => value.json());

    return user;
}