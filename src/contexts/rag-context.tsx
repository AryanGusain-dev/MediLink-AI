import React, { createContext, useContext, useState } from "react";

interface RAGContextType {
  isOpen: boolean;
  openRAG: () => void;
  closeRAG: () => void;
  toggleRAG: () => void;
}

const RAGContext = createContext<RAGContextType | undefined>(undefined);

export function RAGProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openRAG = () => setIsOpen(true);
  const closeRAG = () => setIsOpen(false);
  const toggleRAG = () => setIsOpen((prev) => !prev);

  return (
    <RAGContext.Provider value={{ isOpen, openRAG, closeRAG, toggleRAG }}>
      {children}
    </RAGContext.Provider>
  );
}

export function useRAG() {
  const context = useContext(RAGContext);
  if (!context) {
    throw new Error("useRAG must be used within a RAGProvider");
  }
  return context;
}
