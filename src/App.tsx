import { BrowserRouter, Routes, Route} from "react-router-dom";
import "./styles/App.css";

import Layout from "./layouts/Layout";

import Home from "./pages/Home";

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
