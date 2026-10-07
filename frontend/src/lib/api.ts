const API_BASE_URL = "https://healthforecastai-sarj.onrender.com/api/v1";

export class ApiError extends Error {
  readonly status:number;
  readonly detail?:string;
  constructor(status:number,message:string,detail?:string){ super(message); this.name='ApiError'; this.status=status; this.detail=detail; }
}

async function parseError(response:Response):Promise<string|undefined>{
  try { const body=await response.json(); return typeof body?.detail==='string'?body.detail:undefined; } catch { return undefined; }
}

export async function apiFetch<T>(path:string, options:RequestInit={}, token?:string):Promise<T>{
  const headers=new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type','application/json');
  if (token) headers.set('Authorization',`Bearer ${token}`);
  const response=await fetch(`${API_BASE_URL}${path}`,{...options,headers,cache:'no-store'});
  if(!response.ok){ const detail=await parseError(response); throw new ApiError(response.status,detail??`Request failed (${response.status})`,detail); }
  if(response.status===204) return undefined as T;
  const contentType=response.headers.get('content-type')??'';
  if(contentType.includes('application/json')) return await response.json() as T;
  return await response.text() as T;
}

export async function apiDownload(path:string,token:string):Promise<Blob>{
  const response=await fetch(`${API_BASE_URL}${path}`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
  if(!response.ok) throw new ApiError(response.status,`Could not download report (${response.status})`);
  return response.blob();
}
