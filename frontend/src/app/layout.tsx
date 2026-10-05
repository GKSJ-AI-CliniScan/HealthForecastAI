import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';
const inter=Inter({subsets:['latin'],variable:'--font-sans'});
export const metadata:Metadata={title:'HealthForecast AI Console',description:'Hospital readmission-risk and patient risk-intelligence console'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" className={inter.variable}><body><AuthProvider>{children}</AuthProvider></body></html>}
