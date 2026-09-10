import { BrowserRouter, Routes, Route} from "react-router-dom";

import "./styles/App.css";
import Layout from "./layouts/Layout";

import Home from "./pages/Home";
import Discover from "./pages/Discover";
import Backlog from "./pages/Backlog";
import Completed from "./pages/Completed";
import Wishlist from "./pages/Wishlist";

import DisplaySimilarGames from "./components/DisplaySimilarGames";
import GameDetailsPage from "./components/GameDetails";

function App() {

  return (
    <BrowserRouter>
      <Routes>

        <Route element={<Layout />}>
          {/* Main pages */}
          <Route path="/" element={<Home />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/backlog" element={<Backlog />} />
          <Route path="/completed" element={<Completed />} />
          <Route path="/wishlist" element={<Wishlist />} />

          {/* Specific pages */}
          <Route path="/displaysimilargames" element={<DisplaySimilarGames />} />
          <Route path="/games/:igdb_id" element={<GameDetailsPage />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
