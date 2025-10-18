import { Outlet } from "react-router-dom";
import Menu from "../menu/Menu";

export default function MainLayout() {
    return (
        <>
            <Menu />
            <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px" }}>
                <Outlet />
            </div>
        </>
    );
}
