'use client';
import { useTicketCart, openTicketCart } from '../../lib/ticket-cart';
import {useRideCart} from '../../lib/ride-cart';
import {useGiftCart} from '../../lib/gift-cart';
import {CartIcon} from './cart-icon';
import { useLocale } from './locale-context';
export function CartLink() { const items = useTicketCart('WEB'), locale = useLocale(), gifts = useGiftCart(), ride = useRideCart(), count = Number(!!ride) + Object.values(gifts).reduce((sum,line)=>sum+line.quantity,0) + items.reduce((n, i) => n + Object.values(i.quantities).reduce((s, q) => s + q, 0), 0); return <button type="button" className="cart-header-link" onClick={openTicketCart} aria-label={(locale === 'en' ? 'Shopping cart: ' : 'Giỏ hàng: ') + count}><CartIcon/><span className="cart-header-label">{locale === 'en' ? 'Basket' : 'Giỏ'}</span><strong className="cart-header-count">{count>99?'99+':count}</strong></button>; }
