import { NavLink } from "react-router-dom";
import "../styles/navbar.css";

function NavBar () {
    return (
        <nav className = "navbar">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/discover">Discover</NavLink>
            <NavLink to="/backlog">Backlog</NavLink>
            <NavLink to="/completed">Completed</NavLink>
            <NavLink to="/wishlist">Wishlist</NavLink>
        </nav>
    );
}

export default NavBar;