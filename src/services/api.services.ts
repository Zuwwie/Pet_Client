import axios, {type AxiosInstance } from "axios";

export const api: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL_USERS ?? "http://localhost:3001/api/",
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});
