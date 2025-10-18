import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';
import {
    createBrowserRouter,
    RouterProvider,
    Navigate,
} from 'react-router-dom';
import MainLayout from './components/layouts/MainLayout';
import CandyPage from './pages/CandyPage';
import BasketPage from './pages/BasketPage';
import OrdersPage from './pages/OrdersPage';
import AdminPage from './pages/AdminPage';

// eslint-disable-next-line react-refresh/only-export-components
const NotFound = () => <div style={{padding: 24}}>404: Сторінку не знайдено</div>;

const router = createBrowserRouter(
    [
        {
            path: '/',
            element: <MainLayout/>,
            errorElement: <NotFound/>,
            children: [
                {index: true, element: <Navigate to="candy" replace/>}, // дефолт
                {path: 'candy', element: <CandyPage/>},
                {path: 'basket', element: <BasketPage/>},
                {path: 'orders', element: <OrdersPage/>},
                {path: 'admin', element: <AdminPage/>},
                {path: '*', element: <NotFound/>},
            ],
        },
    ],
);

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <RouterProvider router={router}/>
    </StrictMode>
);
