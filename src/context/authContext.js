"use client"

import { useContext, createContext, useState } from "react";

const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
    const [certificates, setCertificates] = useState(null);

    return (
        <AuthContext.Provider value={{ certificates, setCertificates }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuthContext = () => useContext(AuthContext);