import {ServiceDetails} from '../../components/service-details';
import {ProductLocation} from './product-location';
import {TourHighlights} from './tour-highlights';
import{pageShareMetadata}from'../../../lib/share-metadata';
import{breadcrumbData}from'../../../lib/seo-breadcrumbs';
import{SocialShare}from'../../components/social-share';
import{DestinationWeather}from'../../components/destination-weather';
import { requestLocale } from '../../../lib/request-locale';
import { translator, localizedPath, dateLocale } from '../../../lib/i18n';
import{jsonLd,languageAlternates}from'../../../lib/content-api';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import Link from 'next/link';
import { BookingPanel } from './booking-panel';
import { Product, imageUrl, siteBase, indexing, contentApi } from '../../../lib/content-api';
import { ProductGallery } from '../../components/product-gallery';
import './ticket.css';
async function getProduct(slug: string) { const locale = await requestLocale(), t = translator(locale); try {
    return await contentApi<Product>(`products/${encodeURIComponent(slug)}`, locale);
}
catch (e) {
    if ((e as {
        status?: number;
    }).status === 404)
        return null;
    throw e;
} }
export async function generateMetadata({ params }: {
    params: Promise<{
        slug: string;
    }>;
}): Promise<Metadata> { const locale = await requestLocale(), t = translator(locale); const { slug } = await params; const product = await getProduct(slug); return { title: product?.seoTitle || product?.name || 'Không tìm thấy trải nghiệm', description: product?.seoDescription || product?.description, alternates: { languages:languageAlternates(`/ve/${product?.slug||''}`,product?.languages||[]),canonical: new URL(localizedPath(`/ve/${product?.slug || slug}`, locale), siteBase()).toString() }, robots: { index: !!product && indexing() && !product.demo, follow: true }, ...await pageShareMetadata({title:product?.seoTitle||product?.name||'JinMemo',description:product?.seoDescription||product?.description||'',path:localizedPath('/ve/'+(product?.slug||slug),locale),locale,image:product?.cover}) }; }
export default async function ProductPage({ params }: {
    params: Promise<{
        slug: string;
    }>;
}) {
    const locale = await requestLocale(), t = translator(locale);
    const requested = (await params).slug;
    const product = await getProduct(requested);
    if (!product)
        notFound();
    if (product.transport) permanentRedirect(localizedPath('/dat-xe',locale));
    if (product.slug !== requested)
        permanentRedirect(localizedPath(`/ve/${product.slug}`, locale));
    return <main id="main" className="section"><Link className="text-link" href={localizedPath('/', locale)}>{t("← Tất cả trải nghiệm")}</Link><div className="product-layout"><article><p className="eyebrow">{product.destinationSlug?<Link href={localizedPath('/diem-den/'+product.destinationSlug,locale)}>{product.destination}</Link>:product.destination} · {product.transport?<Link href={localizedPath('/dat-xe',locale)}>{locale==='en'?'Transfers':'Đặt xe'}</Link>:product.typeSlug ? <Link href={localizedPath(`/loai/${product.typeSlug}`, locale)}>{product.typeName}</Link> : product.typeName || t("TRẢI NGHIỆM")}</p><h1>{product.name}</h1><ProductLocation product={product} en={locale==='en'}/><p className="lead product-description">{product.description}</p><TourHighlights product={product} en={locale==='en'}/><SocialShare url={new URL(localizedPath(`/ve/${product.slug}`,locale),siteBase()).toString()} title={product.name} locale={locale}/><ProductGallery cover={product.cover} images={product.gallery} name={product.name} weather={<DestinationWeather destinationId={product.destinationId} locale={locale} variant="photo"/>}/>{product.detailHtml && <div className="prose" dangerouslySetInnerHTML={{ __html: product.detailHtml }}/>}{!product.variants.some(variant=>variant.serviceDetails?.custom)&&<ServiceDetails details={product.serviceDetails} en={locale==='en'}/>}<h2>{t("Trước khi bạn đặt")}</h2><p>{t("Chọn ngày sử dụng, hạng vé và nhóm khách để kiểm tra mức giá tương ứng.")}</p>{product.demo&&<div className="notice">{t("Vé mẫu · chưa mở bán")}</div>}</article><BookingPanel product={product}/></div><script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(breadcrumbData([{name:locale==='en'?'Home':'Trang chủ',url:new URL(localizedPath('/',locale),siteBase()).toString()},...(product.destinationSlug?[{name:product.destination,url:new URL(localizedPath('/diem-den/'+product.destinationSlug,locale),siteBase()).toString()}]:[]),{name:product.name,url:new URL(localizedPath('/ve/'+product.slug,locale),siteBase()).toString()}]))}}/></main>;
}
