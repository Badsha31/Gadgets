import DEFAULT_SITE from "./data/site.json";

const enc=new TextEncoder();
const buckets=new Map();
let runtimeSite=structuredClone(DEFAULT_SITE);

function json(data,status=200,extra={}){
  return new Response(JSON.stringify(data),{status,headers:Object.assign({
    "content-type":"application/json; charset=utf-8",
    "cache-control":"no-store",
    "x-content-type-options":"nosniff"
  },extra)});
}
function clone(v){return structuredClone(v)}
function uid(prefix){return prefix+"-"+crypto.randomUUID().slice(0,8)}
function num(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f}
function email(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||""))}
function image(v){
  const s=String(v||"").trim();
  if(!s)return "";
  if(s.length>1800000)throw new Error("Image is too large. Use an optimized image.");
  if(/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(s))return s;
  if(/^https?:\/\/[^\s]+$/i.test(s))return s.slice(0,1800);
  throw new Error("Image must be an https URL or image upload.");
}
async function body(req,max=2200000){
  const raw=await req.text();
  if(raw.length>max)throw new Error("Payload too large.");
  try{return raw?JSON.parse(raw):{}}catch{throw new Error("Invalid JSON.")}
}
function origin(req){
  const o=req.headers.get("origin");
  if(!o)return true;
  try{return new URL(o).host===new URL(req.url).host}catch{return false}
}
function limited(req,scope){
  const key=(req.headers.get("cf-connecting-ip")||"unknown")+":"+scope,now=Date.now();
  const row=buckets.get(key)||{start:now,count:0};
  if(now-row.start>60000){row.start=now;row.count=0}
  row.count++;
  buckets.set(key,row);
  return row.count>80;
}
async function load(env){
  if(env.STORE_KV){
    const saved=await env.STORE_KV.get("site","json");
    if(saved)return saved;
  }
  return runtimeSite;
}
async function save(env,site){
  runtimeSite=clone(site);
  if(env.STORE_KV)await env.STORE_KV.put("site",JSON.stringify(site));
  return site;
}
async function sign(value,secret){
  const key=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const buf=await crypto.subtle.sign("HMAC",key,enc.encode(value));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
async function session(user,secret){
  const p=btoa(JSON.stringify({u:user,exp:Date.now()+8*60*60*1000})).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  return p+"."+await sign(p,secret);
}
async function adminUser(req,env){
  if(!origin(req)||!env.SESSION_SECRET)return null;
  const token=(req.headers.get("cookie")||"").split(";").map(s=>s.trim()).find(s=>s.startsWith("nx_admin="));
  if(!token)return null;
  const parts=token.slice(9).split(".");
  if(parts.length!==2||parts[1]!==await sign(parts[0],env.SESSION_SECRET))return null;
  try{
    const data=JSON.parse(atob(parts[0].replace(/-/g,"+").replace(/_/g,"/")));
    return data.exp>Date.now()?data.u:null;
  }catch{return null}
}
function normalize(type,input,existing){
  const item=Object.assign({},existing||{});
  ["name","category","brand","badge","description","title","icon","period","url","date","text"].forEach(k=>{
    if(input[k]!==undefined)item[k]=String(input[k]).trim().slice(0,12000);
  });
  ["price","oldPrice","stock","rating"].forEach(k=>{if(input[k]!==undefined)item[k]=num(input[k])});
  ["features","technology"].forEach(k=>{
    if(input[k]!==undefined)item[k]=Array.isArray(input[k])?input[k].map(String).filter(Boolean).slice(0,30):String(input[k]).split(",").map(x=>x.trim()).filter(Boolean).slice(0,30);
  });
  if(input.specs!==undefined)item.specs=typeof input.specs==="object"?input.specs:{};
  if(input.featured!==undefined)item.featured=input.featured===true||String(input.featured)==="true";
  if(input.visibility!==undefined)item.visibility=!(input.visibility===false||String(input.visibility)==="false");
  if(input.image!==undefined)item.image=image(input.image);
  if(!item.id)item.id=uid(type.slice(0,-1));
  if(type==="products"&&!item.name)throw new Error("Product name is required.");
  if(type==="services"&&!item.title)throw new Error("Service title is required.");
  if(type==="packages"&&!item.name)throw new Error("Package name is required.");
  if(type==="portfolio"&&!item.title)throw new Error("Portfolio title is required.");
  if(type==="reviews"&&!item.name)throw new Error("Reviewer name is required.");
  return item;
}
async function api(req,env,url){
  if(limited(req,"api"))return json({error:"Too many requests."},429);
  const p=url.pathname;
  if(p==="/api/site"&&req.method==="GET")return json(await load(env));
  if(p==="/api/login"&&req.method==="POST"){
    if(!origin(req))return json({error:"Invalid request origin."},403);
    if(!env.ADMIN_USER||!env.ADMIN_PASSWORD||!env.SESSION_SECRET)return json({error:"Admin credentials are not configured in Cloudflare Variables/Secrets."},503);
    const x=await body(req,10000);
    if(x.username!==env.ADMIN_USER||x.password!==env.ADMIN_PASSWORD)return json({error:"Invalid credentials."},401);
    const token=await session(env.ADMIN_USER,env.SESSION_SECRET);
    return json({ok:true},200,{"set-cookie":"nx_admin="+token+"; Max-Age=28800; Path=/; HttpOnly; SameSite=Strict; Secure"});
  }
  if(p==="/api/logout"&&req.method==="POST")return json({ok:true},200,{"set-cookie":"nx_admin=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict; Secure"});
  if(p==="/api/orders"&&req.method==="POST"){
    const x=await body(req,40000),c=x.customer||{};
    if(!String(c.name||"").trim()||!String(c.phone||"").trim())return json({error:"Name and phone are required."},400);
    if(c.email&&!email(c.email))return json({error:"Enter a valid email."},400);
    const site=await load(env),items=Array.isArray(x.items)?x.items.slice(0,30):[];
    const total=items.reduce((s,i)=>s+num(i.price)*Math.max(1,Math.min(20,num(i.qty,1))),0);
    const order={id:uid("ORD"),customer:c,payment:String(x.payment||"Cash on delivery"),items,total,status:"Pending",createdAt:new Date().toISOString()};
    site.orders=Array.isArray(site.orders)?site.orders:[];
    site.orders.unshift(order);await save(env,site);
    return json({ok:true,orderId:order.id},201);
  }
  if(p==="/api/contact"&&req.method==="POST"){
    const x=await body(req,30000);
    if(!String(x.name||"").trim()||!String(x.message||"").trim())return json({error:"Name and message are required."},400);
    if(x.email&&!email(x.email))return json({error:"Enter a valid email."},400);
    const site=await load(env);site.contacts=Array.isArray(site.contacts)?site.contacts:[];
    site.contacts.unshift(Object.assign({},x,{id:uid("MSG"),createdAt:new Date().toISOString()}));await save(env,site);
    return json({ok:true},201);
  }
  if(p==="/api/chat"&&req.method==="POST"){
    const x=await body(req,12000),m=String(x.message||"").toLowerCase();
    if(/price|cost|দাম|দর/.test(m))return json({reply:"Product prices are shown in BDT on the Shop and Product pages. Tell me the product name and I’ll point you to it."});
    if(/package|প্যাকেজ/.test(m))return json({reply:"NEXORA WEB offers Basic Website, Business Website and Premium E-commerce packages. Open /packages for the current starting prices."});
    if(/website|ওয়েব|ওয়েব/.test(m))return json({reply:"NEXORA WEB builds responsive business and e-commerce websites. Use Contact or WhatsApp for a project discussion."});
    if(/order|অর্ডার|cart|কার্ট/.test(m))return json({reply:"Add products to cart, open Checkout, then submit your name, phone and delivery details."});
    return json({reply:"I can help with products, orders, packages, websites and PC builds. বাংলা, Banglish and English supported."});
  }
  if(p==="/api/search"&&req.method==="GET"){
    const q=String(url.searchParams.get("q")||"").toLowerCase().trim(),site=await load(env),out=[];
    (site.products||[]).forEach(x=>{if((x.name+" "+x.brand+" "+x.category+" "+x.description).toLowerCase().includes(q))out.push({type:"product",title:x.name,description:x.description,url:"/product/"+x.id})});
    (site.services||[]).forEach(x=>{if((x.title+" "+x.description).toLowerCase().includes(q))out.push({type:"service",title:x.title,description:x.description,url:"/services#"+x.id})});
    (site.packages||[]).forEach(x=>{if((x.name+" "+(x.features||[]).join(" ")).toLowerCase().includes(q))out.push({type:"package",title:x.name,description:(x.features||[]).slice(0,3).join(" · "),url:"/packages"})});
    return json(out.slice(0,40));
  }
  const user=await adminUser(req,env);if(!user)return json({error:"Unauthorized"},401);
  const site=await load(env);
  if(p==="/api/admin/dashboard"&&req.method==="GET")return json({products:(site.products||[]).length,services:(site.services||[]).length,packages:(site.packages||[]).length,portfolio:(site.portfolio||[]).length,reviews:(site.reviews||[]).length,orders:(site.orders||[]).length,contacts:(site.contacts||[]).length});
  if(p==="/api/admin/site"&&req.method==="GET")return json(site);
  if(p==="/api/admin/site"&&req.method==="PUT"){
    const x=await body(req),next=Object.assign({},site,x,{settings:Object.assign({},site.settings,x.settings||{})});
    if(x.heroImage!==undefined)next.settings.heroImage=image(x.heroImage);
    await save(env,next);return json(next);
  }
  const m=p.match(/^\/api\/admin\/(products|services|packages|portfolio|reviews)(?:\/([^/]+))?$/);
  if(m){
    const type=m[1],id=m[2],list=Array.isArray(site[type])?site[type]:[];
    if(req.method==="GET")return json(list);
    if(req.method==="POST"){const item=normalize(type,await body(req),{});list.push(item);site[type]=list;await save(env,site);return json(item,201);}
    const idx=list.findIndex(x=>x.id===id);if(idx<0)return json({error:"Not found."},404);
    if(req.method==="PUT"){list[idx]=normalize(type,await body(req),list[idx]);site[type]=list;await save(env,site);return json(list[idx]);}
    if(req.method==="DELETE"){list.splice(idx,1);site[type]=list;await save(env,site);return json({ok:true});}
  }
  if(p==="/api/admin/orders"&&req.method==="GET")return json(site.orders||[]);
  const om=p.match(/^\/api\/admin\/orders\/([^/]+)$/);
  if(om){
    const list=site.orders||[],idx=list.findIndex(x=>x.id===om[1]);if(idx<0)return json({error:"Order not found."},404);
    if(req.method==="PUT"){const x=await body(req,12000);list[idx].status=String(x.status||"Pending");site.orders=list;await save(env,site);return json(list[idx]);}
    if(req.method==="DELETE"){list.splice(idx,1);site.orders=list;await save(env,site);return json({ok:true});}
  }
  if(p==="/api/admin/contacts"&&req.method==="GET")return json(site.contacts||[]);
  return json({error:"Not found."},404);
}
function headers(extra){return Object.assign({
  "x-content-type-options":"nosniff",
  "referrer-policy":"strict-origin-when-cross-origin",
  "permissions-policy":"camera=(), microphone=(), geolocation=()",
  "content-security-policy":"default-src 'self' https://images.unsplash.com https://wa.me https://m.me; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'"
},extra||{})}
async function asset(env,req,path){
  const res=await env.ASSETS.fetch(new Request(new URL(path,req.url),req));
  if(res.status!==404)return new Response(res.body,{status:res.status,headers:headers(Object.fromEntries(res.headers))});
  return env.ASSETS.fetch(new Request(new URL("/index.html",req.url),req));
}
export default {async fetch(req,env){
  const url=new URL(req.url);
  if(url.pathname.startsWith("/api/")){try{return await api(req,env,url)}catch(e){return json({error:e&&e.message||"Server error."},500)}}
  if(req.method!=="GET"&&req.method!=="HEAD")return new Response("Method Not Allowed",{status:405});
  if(url.pathname==="/admin"||url.pathname==="/admin/")return asset(env,req,"/admin.html");
  return asset(env,req,url.pathname);
}};