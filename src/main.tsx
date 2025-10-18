import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import MainLayout from "./components/layouts/MainLayout";
import BasketPage from "./pages/basket/BasketPage.tsx";
import OrdersPage from "./pages/OrdersPage";
import AdminPage from "./pages/AdminPage";
import CandysPage from "./pages/candys/CandysPage";

const NotFound = () => <div style={{ padding: 24 }}>404: Сторінку не знайдено</div>;

const router = createBrowserRouter([
    {
        path: "/",
        element: <MainLayout />,
        children: [
            { index: true, element: <Navigate to="candy" replace /> },
            { path: "candy", element: <CandysPage /> },
            { path: "basket", element: <BasketPage /> },
            { path: "orders", element: <OrdersPage /> },
            { path: "admin", element: <AdminPage /> },
        ],
    },
    { path: "*", element: <NotFound /> },
]);

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 60_000, // 1 хв
        },
    },
});

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
            {/* <ReactQueryDevtools initialIsOpen={false} /> */}
        </QueryClientProvider>
    </StrictMode>
);
