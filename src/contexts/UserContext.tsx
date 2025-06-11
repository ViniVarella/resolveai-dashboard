import React, { createContext, useState, useContext } from 'react';
import type { ReactNode, Dispatch, SetStateAction } from 'react';

interface UserContextType {
  usuarioGlobal: string;
  setUsuarioGlobal: Dispatch<SetStateAction<string>>;
  senha: string;
  setSenha: Dispatch<SetStateAction<string>>;
  email: string;
  setEmail: Dispatch<SetStateAction<string>>;
  nome: string;
  setNome: Dispatch<SetStateAction<string>>;
  cidade: string;
  setCidade: Dispatch<SetStateAction<string>>;
  endereco: string;
  setEndereco: Dispatch<SetStateAction<string>>;
  numero: string;
  setNumero: Dispatch<SetStateAction<string>>;
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
}

const UserContext = createContext<UserContextType>({
  usuarioGlobal: '',
  setUsuarioGlobal: () => {},
  senha: '',
  setSenha: () => {},
  email: '',
  setEmail: () => {},
  nome: '',
  setNome: () => {},
  cidade: '',
  setCidade: () => {},
  endereco: '',
  setEndereco: () => {},
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
  setCategoriaSelecionada: () => {}
});

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [usuarioGlobal, setUsuarioGlobal] = useState<string>('Empresa');
  const [senha, setSenha] = useState<string>('');
  const [nome, setNome] = useState<string>('');
  const [cidade, setCidade] = useState<string>('');
  const [endereco, setEndereco] = useState<string>('');
  const [numero, setNumero] = useState<string>('');
  const [complemento, setComplemento] = useState<string>('');
  const [numeroTelefone, setNumeroTelefone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [id, setId] = useState<string>('');
  const [fotoPerfil, setFotoPerfil] = useState<string>('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('');

  // Load data from localStorage on mount
  React.useEffect(() => {
    const loadStoredData = () => {
      const storedData = localStorage.getItem('userData');
      if (storedData) {
        const data = JSON.parse(storedData);
        setUsuarioGlobal(data.usuarioGlobal || '');
        setSenha(data.senha || '');
        setNome(data.nome || '');
        setCidade(data.cidade || '');
        setEndereco(data.endereco || '');
        setNumero(data.numero || '');
        setComplemento(data.complemento || '');
        setNumeroTelefone(data.numeroTelefone || '');
        setEmail(data.email || '');
        setId(data.id || '');
        setFotoPerfil(data.fotoPerfil || '');
        setCategoriaSelecionada(data.categoriaSelecionada || '');
      }
    };

    loadStoredData();
  }, []);

  // Save data to localStorage whenever it changes
  React.useEffect(() => {
    const userData = {
      usuarioGlobal,
      senha,
      nome,
      cidade,
      endereco,
      numero,
      complemento,
      numeroTelefone,
      email,
      id,
      fotoPerfil,
      categoriaSelecionada
    };
    localStorage.setItem('userData', JSON.stringify(userData));
  }, [
    usuarioGlobal,
    senha,
    nome,
    cidade,
    endereco,
    numero,
    complemento,
    numeroTelefone,
    email,
    id,
    fotoPerfil,
    categoriaSelecionada
  ]);

  return (
    <UserContext.Provider
      value={{
        usuarioGlobal,
        setUsuarioGlobal,
        senha,
        setSenha,
        nome,
        setNome,
        cidade,
        setCidade,
        endereco,
        setEndereco,
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
        setCategoriaSelecionada
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => useContext(UserContext); 