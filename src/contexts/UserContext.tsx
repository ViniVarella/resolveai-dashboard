import React, { createContext, useState, useEffect, useContext } from "react";
import type { Dispatch, SetStateAction, ReactNode } from "react";

interface UserContextType {
    endereco: boolean;
    setEndereco: Dispatch<SetStateAction<boolean>>;
    usuarioGlobal: string;
    setUsuarioGlobal: Dispatch<SetStateAction<string>>;
    senha: string;
    setSenha: Dispatch<SetStateAction<string>>;
    email: string;
    setEmail: Dispatch<SetStateAction<string>>;
    nome: string;
    setNome: Dispatch<SetStateAction<string>>;
    cidade: boolean;
    setCidade: Dispatch<SetStateAction<boolean>>;
    setNumero: Dispatch<SetStateAction<string>>;
    numero: string;
    complemento: string;
    setComplemento: Dispatch<SetStateAction<string>>;
    numeroTelefone: string;
    setNumeroTelefone: Dispatch<SetStateAction<string>>;
    id: string;
    setId: Dispatch<SetStateAction<string>>;
    fotoPerfil: string;
    setFotoPerfil: Dispatch<SetStateAction<string>>;
    categoriaSelecionada: string;
    setCategoriaSelecionada: Dispatch<SetStateAction<string>>;
    isAuthenticated: boolean;
    setIsAuthenticated: Dispatch<SetStateAction<boolean>>;
}

const UserContext = createContext<UserContextType>({
    endereco: false,
    setEndereco: () => {},
    usuarioGlobal: '',
    setUsuarioGlobal: () => {},
    email: '',
    setEmail: () => {},
    senha: '',
    setSenha: () => {},
    nome: '',
    setNome: () => {},
    cidade: false,
    setCidade: () => {},
    numero: '',
    setNumero: () => {},
    complemento: '',
    setComplemento: () => {},
    numeroTelefone: '',
    setNumeroTelefone: () => {},
    id: '',
    setId: () => {},
    fotoPerfil: '',
    setFotoPerfil: () => {},
    categoriaSelecionada: '',
    setCategoriaSelecionada: () => {},
    isAuthenticated: false,
    setIsAuthenticated: () => {}
});

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [endereco, setEndereco] = useState<boolean>(false);
    const [usuarioGlobal, setUsuarioGlobal] = useState<string>('Empresa');
    const [senha, setSenha] = useState<string>('');
    const [nome, setNome] = useState<string>('');
    const [cidade, setCidade] = useState<boolean>(false);
    const [numero, setNumero] = useState<string>('');
    const [complemento, setComplemento] = useState<string>('');
    const [numeroTelefone, setNumeroTelefone] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [id, setId] = useState<string>('');
    const [fotoPerfil, setFotoPerfil] = useState<string>('');
    const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('');
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

    // Load initial data from localStorage
    useEffect(() => {
        const loadFromStorage = () => {
            try {
                const savedAuth = localStorage.getItem('auth');
                const savedFotoPerfil = localStorage.getItem('fotoPerfil');
                const savedUserData = localStorage.getItem('userData');

                if (savedAuth === 'true') {
                    setIsAuthenticated(true);
                }
                if (savedFotoPerfil) {
                    setFotoPerfil(savedFotoPerfil);
                }
                if (savedUserData) {
                    const userData = JSON.parse(savedUserData);
                    setEmail(userData.email || '');
                    setNome(userData.nome || '');
                    setId(userData.id || '');
                    setUsuarioGlobal(userData.usuarioGlobal || 'Empresa');
                    setNumeroTelefone(userData.numeroTelefone || '');
                    setEndereco(userData.endereco || false);
                    setCidade(userData.cidade || false);
                    setNumero(userData.numero || '');
                    setComplemento(userData.complemento || '');
                }
            } catch (error) {
                console.error('Error loading data from localStorage:', error);
            }
        };

        loadFromStorage();
    }, []);

    // Save data to localStorage when it changes
    useEffect(() => {
        const userData = {
            email,
            nome,
            id,
            usuarioGlobal,
            numeroTelefone,
            endereco,
            cidade,
            numero,
            complemento,
            fotoPerfil
        };

        localStorage.setItem('userData', JSON.stringify(userData));
    }, [email, nome, id, usuarioGlobal, numeroTelefone, endereco, cidade, numero, complemento, fotoPerfil]);

    return (
        <UserContext.Provider value={{
            endereco,
            setEndereco,
            usuarioGlobal,
            setUsuarioGlobal,
            senha,
            setSenha,
            nome,
            setNome,
            cidade,
            setCidade,
            numero,
            setNumero,
            complemento,
            setComplemento,
            numeroTelefone,
            setNumeroTelefone,
            email,
            setEmail,
            id,
            setId,
            fotoPerfil,
            setFotoPerfil,
            categoriaSelecionada,
            setCategoriaSelecionada,
            isAuthenticated,
            setIsAuthenticated
        }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext); 