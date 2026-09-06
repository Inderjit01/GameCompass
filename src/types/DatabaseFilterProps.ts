import type {Dispatch, SetStateAction } from "react";

export type FilterOption = {
    value: string;
    label: string;
}
export type DatabaseFilterProps = {
    filterSearch: string;
    setFilterSearch: Dispatch<SetStateAction<string>>;

    filterCategories: string;
    setFilterCategories: Dispatch<SetStateAction<string>>;

    filterOrder: string;
    setFilterOrder: Dispatch<SetStateAction<string>>;

    filterOptions: FilterOption[];
};
