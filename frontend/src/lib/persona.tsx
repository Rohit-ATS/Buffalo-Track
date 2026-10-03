import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const personas = [
  { id: "maria", name: "Maria", role: "Parent", focus: "Journey and next step" },
  { id: "devon", name: "Devon", role: "Patient group lead", focus: "Assets and collaboration" },
  { id: "priya", name: "Priya", role: "Drug developer", focus: "Mechanism clusters" },
  { id: "osei", name: "Dr. Osei", role: "Researcher", focus: "Who shares my mechanism" },
] as const;
export type PersonaId = (typeof personas)[number]["id"];

const Ctx = createContext<{ persona: PersonaId; setPersona: (p: PersonaId) => void }>({ persona: "maria", setPersona: () => {} });

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [persona, setP] = useState<PersonaId>("maria");
  useEffect(() => {
    const saved = window.localStorage.getItem("atlas-persona");
    if (saved && personas.some((p) => p.id === saved)) setP(saved as PersonaId);
  }, []);
  const setPersona = (p: PersonaId) => { setP(p); window.localStorage.setItem("atlas-persona", p); };
  return <Ctx.Provider value={{ persona, setPersona }}>{children}</Ctx.Provider>;
}
export const usePersona = () => useContext(Ctx);
