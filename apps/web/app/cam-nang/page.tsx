import{sortBlogPosts,type BlogSort}from'../../lib/blog-posts';
import'../components/blog-discovery.css';
import{LoadMoreGrid}from'../components/load-more-grid';
import{pageShareMetadata}from'../../lib/share-metadata';
import { requestLocale } from '../../lib/request-locale';
import { translator, localizedPath, dateLocale } from '../../lib/i18n';
import{languageAlternates}from'../../lib/content-api';
import type { Metadata } from 'next';
import Link from 'next/link';
import { contentApi, Post, imageUrl, siteBase, indexing } from '../../lib/content-api';
export async function generateMetadata({ searchParams }: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> { const locale = await requestLocale(), t = translator(locale); const params = await searchParams; return {...await pageShareMetadata({title:t('Cẩm nang du lịch & trải nghiệm'),description:t('Kinh nghiệm, lịch trình và những câu chuyện địa phương cùng JinMemo.'),path:localizedPath('/cam-nang',locale),locale}), title: t("Cẩm nang du lịch & trải nghiệm"), description: t("Kinh nghiệm, lịch trình và những câu chuyện địa phương cùng JinMemo."), alternates: { languages:languageAlternates('/cam-nang',['vi','en']),canonical: new URL(localizedPath('/cam-nang', locale), siteBase()).toString() }, robots: { index: indexing() && !(params.chuyen_muc||params.category||params.sort&&params.sort!=='newest'), follow: true } }; }
export default async function Journal({ searchParams }: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const locale = await requestLocale(), t = translator(locale);
    const posts = await contentApi<Post[]>('posts', locale);
    const params = await searchParams;
    const category = typeof params.category==='string'?params.category:typeof params.chuyen_muc === 'string' ? params.chuyen_muc : '';
    const categories = Array.from(new Set(posts.map(post => post.category).filter(Boolean)));
    const sort:BlogSort=params.sort==='popular'||params.sort==='featured'?params.sort:'newest';
    const shown = sortBlogPosts(posts.filter(post => !category || post.category === category),sort);
    const listingUrl=(nextSort:BlogSort,nextCategory=category)=>{const q=new URLSearchParams();if(nextCategory)q.set('chuyen_muc',nextCategory);if(nextSort!=='newest')q.set('sort',nextSort);return localizedPath('/cam-nang'+(q.size?'?'+q:''),locale);};
    return <main id="main" className="section"><div className="blog-intro"><p className="eyebrow">{t("CẨM NANG JINMEMO")}</p><h1>{t("Chuyện trên đường đi.")}</h1><p className="lead">{t("Kinh nghiệm hữu ích, góc nhìn địa phương và cảm hứng cho chuyến đi tiếp theo của bạn.")}</p></div>{categories.length > 0 && <nav className="type-chips" aria-label={t("Chuyên mục bài viết")}><Link href={listingUrl(sort,'')} aria-current={!category ? 'page' : undefined}>{t("Tất cả")}</Link>{categories.map(name => <Link key={name} href={listingUrl(sort,name)} aria-current={category === name ? 'page' : undefined}>{name}</Link>)}</nav>}<nav className="blog-sort-nav" aria-label={locale==='en'?'Browse stories':'Xem bài viết'}>{([['newest',locale==='en'?'Latest':'Mới nhất'],['popular',locale==='en'?'Most read':'Đọc nhiều'],['featured',locale==='en'?'Featured':'Nổi bật']] as const).map(([value,label])=><Link key={value} href={listingUrl(value)} aria-current={sort===value?'page':undefined} scroll={false}>{label}</Link>)}</nav>{!shown.length && <div className="notice">{sort==='featured'?(locale==='en'?'No featured stories in this category yet.':'Chưa có bài nổi bật trong chuyên mục này.'):t('Chưa có bài viết trong chuyên mục này. Những câu chuyện mới sẽ được cập nhật tại đây.')}</div>}<LoadMoreGrid key={locale+category+sort} className="blog-grid" en={locale==='en'}>{shown.map(post => <Link className="blog-card" key={post.id} href={localizedPath(`/cam-nang/${post.slug}`, locale)}>{post.cover ? <img className="blog-card-cover" src={imageUrl(post.cover)} alt={post.cover.alt || post.title} width={600} height={400} loading="lazy"/> : <div className="blog-card-placeholder" aria-hidden="true">↗</div>}<div className="blog-card-body"><div className="blog-card-meta"><small>{post.category}</small>{post.featured&&<span className="blog-featured">★ {locale==='en'?'Featured':'Nổi bật'}</span>}</div><h2>{post.title}</h2><p>{post.excerpt}</p><span className="blog-card-views">{(post.views||0).toLocaleString(locale==='en'?'en-GB':'vi-VN')} {locale==='en'?'views':'lượt xem'}</span><div className="blog-card-date"><span>{new Date(post.publishedAt || post.updatedAt).toLocaleDateString(dateLocale(locale), { timeZone: 'Asia/Ho_Chi_Minh' })}</span><span>{t("Đọc câu chuyện ↗")}</span></div></div></Link>)}</LoadMoreGrid></main>;
}
