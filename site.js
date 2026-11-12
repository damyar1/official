async function fetchPosts(){if(!window.supabase||!supabaseClient)return {data:[],error:{message:'Supabase library not available'}};return await supabaseClient.from('posts').select('*').eq('published',true).order('created_at',{ascending:false});}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function postTypeLabel(kind){return ({news:'خبر',article:'مقاله',analysis:'تحلیل'})[String(kind||'article').toLowerCase()]||'مقاله';}
function card(p,showImage=false){return `<article class="article-preview">${showImage&&p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.title)}" style="max-width:100%;height:auto;border-radius:8px;margin-bottom:12px">`:''}<span class="tag">${postTypeLabel(p.kind)}</span><h2>${esc(p.title)}</h2><p>${esc((p.content||'').slice(0,240))}${(p.content||'').length>240?'…':''}</p><small>${p.created_at?new Date(p.created_at).toLocaleDateString('fa-IR'):''}</small><br><a class="btn" href="post.html?id=${encodeURIComponent(p.id)}">ادامه مطلب</a></article>`;}
const POSTS_PER_PAGE = 3;
function getListingPage(){const value=Number.parseInt(new URLSearchParams(location.search).get('page')||'1',10);return Number.isFinite(value)&&value>0?value:1;}
function renderPagination(total,page){const pages=Math.ceil(total/POSTS_PER_PAGE);if(pages<=1)return '';const makeLink=(n,label,disabled=false,current=false)=>disabled?`<span class="page-link disabled">${label}</span>`:`<a class="page-link${current?' current':''}" href="?page=${n}" ${current?'aria-current="page"':''}>${label}</a>`;let html='<nav class="posts-pagination" aria-label="صفحه‌بندی مطالب">';html+=makeLink(Math.max(1,page-1),'قبلی',page===1);const start=Math.max(1,page-2),end=Math.min(pages,page+2);for(let n=start;n<=end;n++)html+=makeLink(n,String(n),false,n===page);html+=makeLink(Math.min(pages,page+1),'بعدی',page===pages);html+='</nav>';return html;}
async function renderPosts(target,filter){const el=document.getElementById(target);if(!el)return;const {data,error}=await fetchPosts();if(error){el.innerHTML='<p class="empty">مطالب در حال حاضر قابل دریافت نیستند.</p>';return;}let arr=(data||[]).filter(p=>!(String(p.kind||'').toLowerCase()==='news'&&p.archived===true));if(filter)arr=arr.filter(filter);const isLatest=target==='latestPosts';const page=getListingPage(),pages=Math.max(1,Math.ceil(arr.length/POSTS_PER_PAGE)),safePage=Math.min(page,pages),start=(safePage-1)*POSTS_PER_PAGE;const visible=isLatest?arr.slice(0,1):arr.slice(start,start+POSTS_PER_PAGE);el.innerHTML=(visible.length?visible.map(p=>card(p,isLatest)).join(''):'<div class="empty">هنوز مطلبی منتشر نشده است.</div>')+(isLatest?'':renderPagination(arr.length,safePage));const count=document.getElementById('postCount');if(count)count.textContent=arr.length;const last=document.getElementById('lastUpdate');if(last&&data?.[0]?.created_at)last.textContent=new Date(data[0].created_at).toLocaleDateString('fa-IR');}
async function searchAnalyses(){const term=(document.getElementById('searchInput')?.value||'').trim();const {data,error}=await fetchPosts();const el=document.getElementById('analysisPosts');if(!el)return;if(error){el.textContent='خطا در دریافت تحلیل‌ها';return;}const arr=(data||[]).filter(p=>String(p.kind||'').trim().toLowerCase()==='analysis'&&(!term||(p.title+' '+p.content).includes(term)));const page=getListingPage(),pages=Math.max(1,Math.ceil(arr.length/POSTS_PER_PAGE)),safePage=Math.min(page,pages),start=(safePage-1)*POSTS_PER_PAGE;const visible=arr.slice(start,start+POSTS_PER_PAGE);el.innerHTML=(visible.length?visible.map(p=>card(p,false)).join(''):'<div class="empty">هنوز تحلیلی منتشر نشده است.</div>')+renderPagination(arr.length,safePage);}
async function searchArticles(){const term=(document.getElementById('searchInput')?.value||'').trim();const {data,error}=await fetchPosts();const el=document.getElementById('articlePosts');if(!el)return;if(error){el.textContent='خطا در دریافت مطالب';return;}const arr=(data||[]).filter(p=>(['article','analysis'].includes(String(p.kind||'article').trim().toLowerCase()))&&(!term||(p.title+' '+p.content).includes(term)));el.innerHTML=arr.length?arr.map(card).join(''):'<div class="empty">مقاله‌ای یافت نشد.</div>';}
async function loadVisitStats(){
  if(!supabaseClient)return;
  const {data,error}=await supabaseClient.rpc('get_site_stats');
  if(error||!data)return;
  const stats=Array.isArray(data)?data[0]:data;
  const total=document.getElementById('siteViews');
  const today=document.getElementById('todayViews');
  if(total)total.textContent=Number(stats.total_views||0).toLocaleString('fa-IR');
  if(today)today.textContent=Number(stats.today_views||0).toLocaleString('fa-IR');
}
async function renderDetail(){const box=document.getElementById('postDetail');if(!box)return;const id=new URLSearchParams(location.search).get('id');if(!id){box.innerHTML='<p>شناسه مطلب مشخص نیست.</p>';return;}const {data,error}=await supabaseClient.from('posts').select('*').eq('id',id).eq('published',true).maybeSingle();if(error||!data){box.innerHTML='<p class="empty">مطلب پیدا نشد یا منتشر نشده است.</p>';return;}// ثبت بازدید فقط یک‌بار برای هر مطلب در هر نشست مرورگر
const visitKey='damyar_view_'+String(data.id);
if(!sessionStorage.getItem(visitKey)){
  const {error:viewError}=await supabaseClient.rpc('record_post_view',{p_post_id:Number(data.id)});
  if(!viewError)sessionStorage.setItem(visitKey,'1');
}
const {data:viewCount}=await supabaseClient.rpc('get_post_views',{p_post_id:Number(data.id)});
document.title=data.title+' | دامیار';const featuredImage=data.image_url?`<a class="post-featured-image-link" href="${esc(data.image_url)}" target="_blank" rel="noopener noreferrer" aria-label="نمایش تصویر مطلب در اندازه اصلی"><img class="post-featured-image" src="${esc(data.image_url)}" alt="${esc(data.title)}" loading="eager" decoding="async" onerror="this.closest('.post-featured-image-link').style.display='none'"></a>`:'';box.innerHTML=`<span class="tag">${postTypeLabel(data.kind)}</span><h1 style="color:#2e7d32;margin-bottom:12px">${esc(data.title)}</h1><small>${data.created_at?new Date(data.created_at).toLocaleDateString('fa-IR'):''} | بازدید: ${Number(viewCount||0).toLocaleString('fa-IR')}</small>${featuredImage}<div class="post-content" style="white-space:pre-wrap;line-height:2.2;margin-top:20px">${esc(data.content)}</div><section class="interaction-panel" id="postInteractions"><h2>واکنش شما</h2><div class="reaction-buttons"><button type="button" id="likeBtn" aria-label="لایک">👍 <b id="likeCount">۰</b></button><button type="button" id="dislikeBtn" aria-label="دیس‌لایک">👎 <b id="dislikeCount">۰</b></button></div><h2>دیدگاه‌ها</h2><form id="commentForm" class="comment-form"><label for="commentName">نام شما</label><input id="commentName" maxlength="60" minlength="2" required placeholder="نام"><label for="commentText">متن دیدگاه</label><textarea id="commentText" maxlength="2000" minlength="2" rows="4" required placeholder="دیدگاه خود را بنویسید..."></textarea><button type="submit">ارسال دیدگاه</button><small id="commentMessage">دیدگاه شما پس از تأیید مدیر منتشر می‌شود.</small></form><div id="commentsList"><p class="empty">در حال دریافت دیدگاه‌ها...</p></div></section>`;await loadPostInteractions(data.id);}

async function renderSiteAds(){
  if(!window.supabase||!supabaseClient)return;
  const page=(location.pathname.split('/').pop()||'index.html').replace('.html','');
  const pageMap={index:'home',news:'news',articles:'articles',livestock:'livestock',poultry:'poultry',feed:'feed',post:'post'};
  const current=pageMap[page]||'other';
  const {data,error}=await supabaseClient.from('site_media').select('id,type,title,image_url,link_url,placement,created_at').eq('type','ad').order('created_at',{ascending:false});
  if(error){console.error('Damyar ads could not be loaded:',error.message);return;}
  if(!data?.length)return;
  const getSlot=(slot)=>{
    const selectors={
      right_sidebar:'.rightside > .ad-slot',
      left_sidebar:'.leftside > .ad-slot',
      content_inline:'.content > .ad-slot',
      bottom_banner:'.layout > .ad-slot.banner'
    };
    let placeholder=document.querySelector(selectors[slot]||'');
    if(placeholder)return placeholder;
    const layout=document.querySelector('.layout');
    const target=slot==='right_sidebar'?document.querySelector('.rightside'):
      slot==='left_sidebar'?document.querySelector('.leftside'):
      slot==='content_inline'?(document.querySelector('.content')||layout):layout;
    if(!target)return null;
    placeholder=document.createElement('div');
    placeholder.className='ad-slot'+(slot==='bottom_banner'?' banner':'');
    placeholder.dataset.generatedAdSlot=slot;
    placeholder.innerHTML='<strong>جایگاه تبلیغات</strong>';
    target.appendChild(placeholder);
    return placeholder;
  };
  const pageAliases={livestock:'livestock',poultry:'poultry',feed:'feed'};
  data.forEach(ad=>{
    const raw=String(ad.placement||'all').toLowerCase().trim();
    let pageScope='all',slot='right_sidebar';
    if(raw.includes('|')){const parts=raw.split('|');pageScope=parts[0]||'all';slot=parts[1]||'right_sidebar';}
    else if(raw==='sidebar'){slot='right_sidebar';}
    else if(['all','home','news','articles','livestock','poultry','feed','post'].includes(raw)){pageScope=raw==='all'?'all':raw;slot='right_sidebar';}
    if(pageScope!=='all'&&pageScope!==current)return;
    if(!['right_sidebar','left_sidebar','content_inline','bottom_banner'].includes(slot))slot='right_sidebar';
    const placeholder=getSlot(slot);if(!placeholder)return;
    if(!placeholder.dataset.adRendered){placeholder.innerHTML='';placeholder.dataset.adRendered='true';}
    const box=document.createElement('div');box.className='damyar-ad-area';
    const img=document.createElement('img');img.src=ad.image_url||'';img.alt=ad.title||'تبلیغات دامیار';img.loading='lazy';
    if(ad.link_url){const a=document.createElement('a');a.href=ad.link_url;a.target='_blank';a.rel='noopener noreferrer';a.appendChild(img);box.appendChild(a);}else box.appendChild(img);
    if(ad.title){const caption=document.createElement('small');caption.textContent=ad.title;box.appendChild(caption);}
    placeholder.appendChild(box);
  });
}
async function renderSiteGallery(){
  const gallery=document.getElementById('homeGallery');
  if(!gallery)return;
  if(!supabaseClient)return;
  const slots=Array.from(gallery.querySelectorAll('.ad-slot'));
  try{
    const {data,error}=await supabaseClient
      .from('site_media')
      .select('id,type,title,image_url,link_url,created_at')
      .eq('type','gallery')
      .order('created_at',{ascending:false});
    if(error){console.error('Damyar gallery Supabase error:',error.message);return;}
    const images=(data||[]).filter(item=>item.image_url);
    slots.forEach((slot,index)=>{
      const item=images[index];
      if(!item)return;
      const src=item.image_url;
      slot.innerHTML='';
      slot.style.cssText='padding:10px;min-height:90px;display:flex;align-items:center;justify-content:center;flex-direction:column;box-sizing:border-box;';
      const img=document.createElement('img');
      img.src=src;
      img.alt=item.title||'تصویر گالری دامیار';
      img.loading='lazy';
      img.style.cssText='display:block;width:100%;max-width:100%;max-height:160px;height:auto;object-fit:contain;border-radius:6px;';
      if(item.link_url){
        const link=document.createElement('a');
        link.href=item.link_url;link.target='_blank';link.rel='noopener noreferrer';
        link.appendChild(img);slot.appendChild(link);
      }else slot.appendChild(img);
      if(item.title){
        const caption=document.createElement('small');
        caption.textContent=item.title;
        caption.style.cssText='display:block;margin-top:5px;';
        slot.appendChild(caption);
      }
    });
  }catch(err){console.error('Damyar gallery failed:',err);}
}


// شناسه پایدار مرورگر برای جلوگیری از ثبت چند واکنش برای یک بازدیدکننده
function getDamyarVisitorId(){
  const key='damyar_visitor_id';
  let id=localStorage.getItem(key);
  if(!id){id=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():'v-'+Date.now()+'-'+Math.random().toString(36).slice(2);localStorage.setItem(key,id);}
  return id;
}
async function loadPostInteractions(postId){
  const visitorId=getDamyarVisitorId();
  const {data:rows,error}=await supabaseClient.from('post_reactions').select('reaction,visitor_id').eq('post_id',postId);
  const reactionRows=rows||[];
  const likeCount=document.getElementById('likeCount'),dislikeCount=document.getElementById('dislikeCount');
  if(error){if(likeCount)likeCount.textContent='—';if(dislikeCount)dislikeCount.textContent='—';console.error('Reaction load failed:',error.message);}
  else{
    if(likeCount)likeCount.textContent=reactionRows.filter(x=>x.reaction==='like').length.toLocaleString('fa-IR');
    if(dislikeCount)dislikeCount.textContent=reactionRows.filter(x=>x.reaction==='dislike').length.toLocaleString('fa-IR');
    const mine=reactionRows.find(x=>x.visitor_id===visitorId)?.reaction;
    const likeBtn=document.getElementById('likeBtn'),dislikeBtn=document.getElementById('dislikeBtn');
    if(likeBtn){likeBtn.classList.toggle('selected',mine==='like');likeBtn.onclick=()=>savePostReaction(postId,'like');}
    if(dislikeBtn){dislikeBtn.classList.toggle('selected',mine==='dislike');dislikeBtn.onclick=()=>savePostReaction(postId,'dislike');}
  }
  const form=document.getElementById('commentForm');
  if(form)form.onsubmit=async event=>{
    event.preventDefault();
    const name=document.getElementById('commentName').value.trim();
    const content=document.getElementById('commentText').value.trim();
    const message=document.getElementById('commentMessage');
    if(name.length<2||content.length<2){message.textContent='نام و متن دیدگاه باید حداقل ۲ نویسه باشند.';return;}
    const submit=form.querySelector('button[type="submit"]');if(submit)submit.disabled=true;
    message.textContent='در حال ارسال دیدگاه...';
    const {error:insertError}=await supabaseClient.from('post_comments').insert({post_id:postId,name,content,approved:false});
    if(insertError){message.textContent='ارسال دیدگاه انجام نشد: '+insertError.message;}
    else{form.reset();message.textContent='دیدگاه شما ثبت شد و پس از تأیید مدیر نمایش داده می‌شود.';}
    if(submit)submit.disabled=false;
  };
  await loadPublicComments(postId);
}
async function savePostReaction(postId,reaction){
  const visitorId=getDamyarVisitorId();
  const buttons=[document.getElementById('likeBtn'),document.getElementById('dislikeBtn')].filter(Boolean);
  buttons.forEach(b=>b.disabled=true);
  const {error}=await supabaseClient.from('post_reactions').upsert({post_id:postId,visitor_id:visitorId,reaction,updated_at:new Date().toISOString()},{onConflict:'post_id,visitor_id'});
  buttons.forEach(b=>b.disabled=false);
  if(error){alert('ثبت واکنش انجام نشد: '+error.message);return;}
  await loadPostInteractions(postId);
}
async function loadPublicComments(postId){
  const el=document.getElementById('commentsList');if(!el)return;
  const {data,error}=await supabaseClient.from('post_comments').select('name,content,created_at').eq('post_id',postId).eq('approved',true).order('created_at',{ascending:false});
  if(error){el.innerHTML='<p class="empty">دریافت دیدگاه‌ها ممکن نشد: '+esc(error.message)+'</p>';return;}
  el.innerHTML=(data||[]).map(c=>`<article class="public-comment"><b>${esc(c.name)}</b><small>${c.created_at?new Date(c.created_at).toLocaleDateString('fa-IR'):''}</small><p>${esc(c.content)}</p></article>`).join('')||'<p class="empty">هنوز دیدگاه تأییدشده‌ای منتشر نشده است.</p>';
}

async function renderAboutSettings(){
  const titleEl=document.getElementById('aboutTitle');
  if(!titleEl||!supabaseClient)return;
  const {data,error}=await supabaseClient.from('about_settings').select('about_title,about_content,support_title,support_description,support_label,support_url').eq('id',1).maybeSingle();
  if(error||!data)return;
  const content=document.getElementById('aboutContent');
  const supportTitle=document.getElementById('supportTitle');
  const supportDescription=document.getElementById('supportDescription');
  const supportLink=document.getElementById('supportLink');
  titleEl.textContent=data.about_title||'دربارهٔ دامیار';
  if(content)content.textContent=data.about_content||'';
  if(supportTitle)supportTitle.textContent=data.support_title||'ارتباط با پشتیبانی';
  if(supportDescription)supportDescription.textContent=data.support_description||'';
  if(supportLink){supportLink.textContent=data.support_label||'ارتباط با پشتیبانی';if(data.support_url)supportLink.href=data.support_url;}
}

document.addEventListener('DOMContentLoaded',()=>{renderAboutSettings();renderSiteAds();renderSiteGallery();renderPosts('latestPosts');renderPosts('newsPosts',p=>String(p.kind||'').trim().toLowerCase()==='news'&&p.archived!==true);renderPosts('livestockPosts',p=>['article','analysis'].includes(String(p.kind||'article').trim().toLowerCase())&&p.category==='livestock');renderPosts('poultryPosts',p=>['article','analysis'].includes(String(p.kind||'article').trim().toLowerCase())&&p.category==='poultry');renderPosts('feedPosts',p=>['article','analysis'].includes(String(p.kind||'article').trim().toLowerCase())&&p.category==='feed');renderPosts('articlePosts',p=>String(p.kind||'article').trim().toLowerCase()==='article'&&(p.category==='articles'||!p.category));renderPosts('analysisPosts',p=>String(p.kind||'').trim().toLowerCase()==='analysis');renderDetail();loadVisitStats();});

async function renderLibraryPage(){
  const box=document.getElementById('libraryFiles');if(!box||!supabaseClient)return;
  const {data,error}=await supabaseClient.from('library_files').select('id,title,description,file_name,public_url,created_at').order('created_at',{ascending:false});
  if(error){box.innerHTML='<p class="empty">دریافت فایل‌های کتابخانه ممکن نشد. تنظیمات دیتابیس را بررسی کنید.</p>';console.error(error.message);return;}
  box.innerHTML=(data||[]).map(f=>`<article class="library-card"><h2>${esc(f.title)}</h2><p>${esc(f.description||'')}</p><div class="library-meta">${esc(f.file_name)}${f.created_at?' — '+new Date(f.created_at).toLocaleDateString('fa-IR'):''}</div><p><a class="library-download" href="${esc(f.public_url)}" target="_blank" rel="noopener" download>دانلود فایل</a></p></article>`).join('')||'<p class="empty">هنوز فایلی در کتابخانه منتشر نشده است.</p>';
}
document.addEventListener('DOMContentLoaded',renderLibraryPage);
