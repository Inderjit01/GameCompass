import type { DatabaseFilterProps } from "../types/DatabaseFilterProps";

import "../styles/DatabaseFilter.css";

function DatabaseFilter ({
    filterSearch, setFilterSearch, 
    filterCategories, setFilterCategories, 
    filterOrder, setFilterOrder,
    filterOptions
}: DatabaseFilterProps) {
    return (
        <div className="database_filter_and_search_layout">
            <div className="database_search_bar">
                <input 
                    placeholder="Search by name, tag, or category"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                />
            </div> {/* End of database_search_bar */}

            <div className="database_filter_options">
                <select 
                    value={filterCategories}
                    onChange={(e) => setFilterCategories(e.target.value)}
                >   
                    {filterOptions.map((option) => (
                        <option
                            key={option.value}
                            value={option.value}
                        >
                            {option.label}
                        </option>
                    ))}
                </select>

                <select
                    value={filterOrder}
                    onChange={(e) => setFilterOrder(e.target.value)}
                >
                    <option value="ascending">Ascending</option>
                    <option value="descending">Descending</option>
                </select>
            </div> {/* End of database_filter_options*/}

        </div>
    );
}
export default DatabaseFilter;