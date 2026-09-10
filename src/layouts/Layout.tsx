import { Outlet } from "react-router-dom";

import NavBar from "../components/NavBar";

import "../styles/layout.css";

function Layout () {
    return (
        <div className="page_layout">
            
            {/* Loads the Navigation Bar at the top of the screen */}
            <NavBar />

            {/* Does the padding for individual pages to fit nicely with the navbar */}
            <main className="content">
                <Outlet />
            </main>

        </div>
    );
}

export default Layout;