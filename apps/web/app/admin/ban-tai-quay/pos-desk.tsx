'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SalesWorkbench } from '../../components/sales-workbench';
import { posApi, type PosProfile } from '../../../lib/pos-api';
import { adminApi } from '../shared/admin-api';
import type{SaleClosure}from'../../../lib/sale-calendar';
import type { SaleProduct } from '../../../lib/sales-cart';
type Counter = { id: string; name: string; address?: string; status: string; version: number };
export function PosDesk({ session }: { session?: PosProfile }) {
  const api = session ? posApi : adminApi, can = (permission: PosProfile['permissions'][number]) => !session || session.permissions.includes(permission);
  const [products, setProducts] = useState<SaleProduct[]>([]), [counters, setCounters] = useState<Counter[]>([]), [counterId, setCounterId] = useState(''), [ownerId, setOwnerId] = useState(''), [error, setError] = useState('');
  useEffect(() => { let active = true; Promise.all([api('products'), api('counters'), api('me')]).then(([p, c, me]) => { if (!active) return; setProducts(session ? p.data : p.data.filter((product: SaleProduct & { status: string; demo: boolean }) => product.status === 'PUBLISHED' && !product.demo).map((product:SaleProduct&{closures?:SaleClosure[]})=>({...product,saleClosures:product.closures||[]}))); setCounters(c.data); setCounterId(c.data.find((v: Counter) => v.status === 'ACTIVE')?.id || ''); setOwnerId(me.id); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, []);
  const scope = 'POS:jinmemo-pos-pending:' + (session?.role || 'LEGACY') + ':' + ownerId + ':' + counterId;
  const counterSlot = <label>Quầy bán<select value={counterId} onChange={e => { setCounterId(e.target.value); setError(''); }}><option value="">Chọn quầy</option>{counters.filter(c => c.status === 'ACTIVE').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>;
  return <>{error && <p className="sales-error" role="alert">{error}</p>}{!can('SELL') ? <section className="product-editor"><h2>Quyền tại quầy</h2><p>Bạn chưa được cấp quyền bán vé.</p><Link href="/quay/don-hang">Mở đơn thuộc quầy ↗</Link></section> : !ownerId ? <p>Đang tải quầy bán…</p> : <SalesWorkbench key={scope} products={products} scope={scope} channel="POS" quotePath={session ? 'pos/quotes' : 'admin/pos/quotes'} createPath={session ? 'pos/carts' : 'admin/carts/pos'} actionPrefix={session ? 'pos' : 'admin'} counterId={counterId} counterSlot={counterSlot} posSession={!!session} canDeliver={can('DELIVER')} canCollect={can('COLLECT')} canPrint={can('PRINT')}/>}</>;
}
