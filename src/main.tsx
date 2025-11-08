// src/main.tsx
import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import "./index.css";

import {createBrowserRouter, RouterProvider, Navigate} from "react-router-dom";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import MainLayout from "./components/layouts/MainLayout";
import BasketPage from "./pages/basket/BasketPage";
import AdminPage from "./pages/admin/AdminPage";
import CandysPage from "./pages/candys/CandysPage";

import AdminCandiesPage from "@/pages/admin/AdminCandiesPage";
import AdminOrdersPage from "@/pages/admin/ordersPage/AdminOrdersPage.tsx";
import PackagingPage from "@/pages/pack/PackagingPage";
import AdminPackagingPage from "@/pages/admin/AdminPackagingPage";
import OrdersPage from "@/pages/orders/OrdersPage.tsx";
import OrderDetailsPage from "@/pages/orders/ordersDetails/OrderDetailsPage.tsx";

// eslint-disable-next-line react-refresh/only-export-components
const NotFound = () => <div style={{padding: 24}}>404: Сторінку не знайдено</div>;

const router = createBrowserRouter([
    {
        path: "/",
        element: <MainLayout/>,
        children: [
            {index: true, element: <Navigate to="candy" replace/>},
            {path: "candy", element: <CandysPage/>},
            {path: "pack", element: <PackagingPage/>},
            {path: "basket", element: <BasketPage/>},
            // Виправлено: OrderDetailsPage тепер окремий маршрут на тому ж рівні
            {path: "orders", element: <OrdersPage/>},
            {path: "orders/:orderId", element: <OrderDetailsPage/>},
            {
                path: "admin",
                element: <AdminPage/>,
                children: [
                    {index: true, element: <AdminCandiesPage/>}, // /admin
                    {path: "orders", element: <AdminOrdersPage/>}, // /admin/orders
                    {path: "packaging", element: <AdminPackagingPage/>}, // /admin/packaging
                ],
            },
        ],
    },
    {path: "*", element: <NotFound/>},
]);

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 60_000,
        },
    },
});

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router}/>
            {/* <ReactQueryDevtools initialIsOpen={false} /> */}
        </QueryClientProvider>
    </StrictMode>
);