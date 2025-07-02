import { createContext, useState } from "react";

export const SearchContext = createContext();

export const SearchProvider = ({ children }) => {
    const [searchText, setSearchText] = useState(""); 
    const [selectedCategory, setSelectedCate] = useState("");

    return (
        <SearchContext.Provider value={{ searchText, setSearchText, selectedCategory, setSelectedCate }}>
            {children}
        </SearchContext.Provider>
    );
};
