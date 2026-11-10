'use client';
import { useTicketCart, openTicketCart } from '../../lib/ticket-cart';
import {CartIcon} from './cart-icon';
import { useLocale } from './locale-context';
export function CartLink() { const items = useTicketCart('WEB'), locale = useLocale(), count = items.reduce((n, i) => n + Object.values(i.quantities).reduce((s, q) => s + q, 0), 0); return <button type="button" className="cart-header-link" onClick={openTicketCart} aria-label={(locale === 'en' ? 'Ticket basket: ' : 'Giỏ vé: ') + count}><CartIcon/><span className="cart-header-label">{locale === 'en' ? 'Basket' : 'Giỏ'}</span><strong className="cart-header-count">{count>99?'99+':count}</strong></button>; }
