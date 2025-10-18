import { Outlet } from "react-router-dom";
import Menu from "../menu/Menu";

export default function MainLayout() {
    return (
        <>
            <Menu />
            <div style={{ maxWidth: 1440, margin: "0 auto", padding: 16 }}> {/* було 1100 */}
                <Outlet />
            </div>
        </>
    );
}
