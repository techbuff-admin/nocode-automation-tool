import React, {
    createContext,
    ReactNode,
    useEffect,
    useState,
  } from 'react';
  import axios from 'axios';
  
  interface AuthContextProps {
    token: string | null;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
  }
  
  export const AuthContext = createContext<AuthContextProps>({
    token: null,
    login: async () => {},
    logout: () => {},
  });
  
  export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(
      localStorage.getItem('token')
    );
  
    // On token change, persist & set axios header
    useEffect(() => {
      if (token) {
        localStorage.setItem('token', token);
        sessionStorage.setItem('token', token);
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      } else {
        sessionStorage.removeItem('token');
        localStorage.removeItem('token');
        delete axios.defaults.headers.common.Authorization;
      }
      axios.defaults.headers.common.Authorization = token
    ? `Bearer ${token}`
    : '';
    }, [token]);
  
    const login = async (username: string, password: string) => {
      // Adjust URL to your auth endpoint
      const res = await axios.post(
        'http://localhost:8080/v1/auth/login',
        { username, password }
      );
      // Assume response contains { token: "…" }
      setToken(res.data.token);
    };
  
    const logout = () => {
      setToken(null);
    };
  
    return (
      <AuthContext.Provider value={{ token, login, logout }}>
        {children}
      </AuthContext.Provider>
    );
  }
  