'use client';
import { createContext,useContext,useEffect,useMemo,useState,type ReactNode } from 'react';
import { apiFetch } from './api';
import type { Role } from '@/types';

interface LoginResponse { access_token:string; token_type?:string; role:Role; permissions:string[]; }
interface AuthState { token:string|null; role:Role|null; permissions:string[]; isLoading:boolean; login:(email:string,password:string)=>Promise<void>; logout:()=>void; hasPermission:(permission:string)=>boolean; }
const AuthContext=createContext<AuthState|undefined>(undefined);
const STORAGE_KEY='hf_session';

export function AuthProvider({children}:{children:ReactNode}){
 const [session,setSession]=useState<LoginResponse|null>(null); const [isLoading,setIsLoading]=useState(true);
 useEffect(()=>{ try { const raw=sessionStorage.getItem(STORAGE_KEY); if(raw) setSession(JSON.parse(raw) as LoginResponse); } catch { sessionStorage.removeItem(STORAGE_KEY); } finally { setIsLoading(false); } },[]);
 async function login(email:string,password:string){ const result=await apiFetch<LoginResponse>('/auth/login',{method:'POST',body:JSON.stringify({email,password})}); setSession(result); sessionStorage.setItem(STORAGE_KEY,JSON.stringify(result)); }
 function logout(){setSession(null);sessionStorage.removeItem(STORAGE_KEY);}
 const value=useMemo<AuthState>(()=>({token:session?.access_token??null,role:session?.role??null,permissions:session?.permissions??[],isLoading,login,logout,hasPermission:(p)=>Boolean(session?.permissions.includes(p))}),[session,isLoading]);
 return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(){const value=useContext(AuthContext);if(!value)throw new Error('useAuth must be used within AuthProvider');return value;}
