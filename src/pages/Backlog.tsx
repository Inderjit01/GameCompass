import TopRow from "../components/TopRow";
import useGameSearchBar from "../hooks/useGameSearchBar";
import "../styles/backlog.css";

function Backlog () {
    
    const {query, setQuery, results, noResults} = useGameSearchBar();

    return (
        <div className="page">

            <TopRow
                title="Backlog"
                showSearch={true}
                query={query}
                setQuery={setQuery}
                results={results}
                noResults={noResults}
            />

            <div className="content-box">
                <p>This is the backlog page. adding stuff to make it longer</p>
            </div>

        </div>
    );
}

export default Backlog;