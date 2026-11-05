'use client';

import Script from 'next/script';
import {usePathname} from 'next/navigation';
import {useEffect, useRef} from 'react';

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
} & Partial<Record<`ga-disable-${string}`, boolean>>;

const publicPage = /^(?:\/en)?(?:\/?|\/(?:dat-xe|transfers|lien-he|contact)\/?|\/(?:ve|cam-nang|blog|diem-den|destinations|loai|trang|pages)(?:\/[a-z0-9-]+)?\/?)$/;

export function GoogleAnalytics({id}:{id:string}) {
  const pathname = usePathname();
  const allowed = !!pathname && publicPage.test(pathname);
  const lastPage = useRef('');
  const configured = useRef(false);

  useEffect(() => {
    const browser = window as unknown as AnalyticsWindow;
    browser[`ga-disable-${id}`] = !allowed;
    if (!allowed) {
      lastPage.current = '';
      return;
    }
    browser.dataLayer ??= [];
    browser.gtag ??= function () { browser.dataLayer!.push(arguments); };
    const location = window.location.origin + pathname;
    const referrer = !configured.current && document.referrer ? new URL(document.referrer).origin : '';
    if (!configured.current) {
      browser.gtag('js', new Date());
      browser.gtag('config', id, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        page_location: location,
        page_referrer: referrer
      });
      configured.current = true;
    }
    if (lastPage.current !== pathname) {
      browser.gtag('event', 'page_view', {page_location: location, page_referrer: referrer});
      lastPage.current = pathname;
    }
  }, [allowed, id, pathname]);

  return allowed ? <Script src={'https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id)} strategy="afterInteractive"/> : null;
}

