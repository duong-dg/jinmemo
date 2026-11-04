import {BadRequestException,ForbiddenException,Injectable,NotFoundException} from '@nestjs/common';
import type {Request} from 'express';
import {createHash,createHmac,randomBytes} from 'node:crypto';
import {DatabaseService} from '../database/database.module';
import {clientAddress} from '../http/client-address';
import {translated} from './translations';
@Injectable()
export class PostInsights {
 private key?:Promise<string>;private cleanupDay='';
 constructor(private readonly db:DatabaseService){}
 async counts<T extends {id:string}>(posts:T[]):Promise<(T&{views:number})[]>{if(!posts.length)return[];const rows=await this.db.pool.query('SELECT post_id,views FROM jinmemo_post_metrics');const counts=new Map(rows.rows.map(r=>[r.post_id,Number(r.views)]));return posts.map(post=>({...post,views:counts.get(post.id)||0}));}
 private secret(){if(!this.key)this.key=(async()=>{await this.db.pool.query("INSERT INTO jinmemo_settings(id,data)VALUES('post-view-key',$1) ON CONFLICT(id) DO NOTHING",[JSON.stringify({key:randomBytes(32).toString('hex')})]);return(await this.db.pool.query("SELECT data FROM jinmemo_settings WHERE id='post-view-key'")).rows[0].data.key as string;})().catch(error=>{this.key=undefined;throw error;});return this.key;}
 async record(id:string,req:Request,lang='vi',now=new Date()){
  if(!/^[a-f0-9-]{36}$/i.test(id)||!['vi','en'].includes(lang))throw new BadRequestException('Bài viết không hợp lệ.');
  if(req.headers['x-jinmemo-request']!=='1'||req.headers.origin!==new URL(process.env.PUBLIC_BASE_URL||'http://localhost:3000').origin)throw new ForbiddenException('Nguồn yêu cầu không hợp lệ.');
  const ua=String(req.headers['user-agent']||'').slice(0,512),bot=!ua||/bot\b|crawler|spider|facebookexternalhit|facebot|meta-external|preview|slurp|headless|curl|wget/i.test(ua);
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const secret=bot?'':await this.secret();
  const client=await this.db.pool.connect();try{await client.query('BEGIN');
   const row=(await client.query('SELECT data FROM jinmemo_posts WHERE id=$1 FOR UPDATE',[id])).rows[0],post=row?.data;
   if(!post||post.status!=='PUBLISHED'||post.publishedAt&&new Date(post.publishedAt)>now||lang==='en'&&!translated('POST',post))throw new NotFoundException('Bài viết chưa xuất bản.');
   const prior=(await client.query('SELECT views FROM jinmemo_post_metrics WHERE post_id=$1',[id])).rows[0];let views=Number(prior?.views||0),counted=false;
   const token=req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith('jinmemo_admin='))?.slice('jinmemo_admin='.length);
   const admin=token&&/^[a-f0-9]{64}$/.test(token)?(await client.query('SELECT admin_id FROM jinmemo_sessions WHERE token_hash=$1 AND expires_at>$2',[createHash('sha256').update(token).digest('hex'),now])).rowCount:0;
   if(!bot&&!admin){const fingerprint=createHmac('sha256',secret).update(JSON.stringify([id,day,clientAddress(req).ip,ua])).digest('hex');
    const seen=await client.query('SELECT fingerprint FROM jinmemo_post_view_keys WHERE post_id=$1 AND fingerprint=$2 AND view_day=$3',[id,fingerprint,day]);
    if(!seen.rowCount){await client.query('INSERT INTO jinmemo_post_view_keys(post_id,fingerprint,view_day)VALUES($1,$2,$3)',[id,fingerprint,day]);views++;counted=true;if(prior)await client.query('UPDATE jinmemo_post_metrics SET views=views+1 WHERE post_id=$1',[id]);else await client.query('INSERT INTO jinmemo_post_metrics(post_id,views)VALUES($1,1)',[id]);}
   }
   await client.query('COMMIT');
   if(this.cleanupDay!==day){await client.query('DELETE FROM jinmemo_post_view_keys WHERE view_day<$1',[day]).then(()=>{this.cleanupDay=day;}).catch(()=>{});}
   return {views,counted};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
}
