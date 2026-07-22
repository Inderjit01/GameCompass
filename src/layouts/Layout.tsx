import { Outlet } from "react-router-dom";
import NavBar from "../components/NavBar";
import "../styles/layout.css";

function Layout () {
    return (
        <div className = "title-bar">
            <NavBar />

            <main className = "content">
                < Outlet />
            </main>
        </div>
    );
}

export default Layout;