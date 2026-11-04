export function adminLoginPath(){try{const value=sessionStorage.getItem('jinmemo-admin-entry')||'';if(/^\/jinmemo-[a-f0-9]{24}$/.test(value))return value;}catch{}return '/admin';}
export function rememberAdminEntry(path:string){if(/^\/jinmemo-[a-f0-9]{24}$/.test(path))try{sessionStorage.setItem('jinmemo-admin-entry',path);}catch{}}
