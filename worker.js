import SITE from "./data/site.json";

let state=structuredClone(SITE);
const limits=new Map();
const sessions=new Map();

function json(data,status=200,extra={}){return new Response(JSON.stringify(data),{status,headers:Object.assign({"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"},extra)})}
function num(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f}
function uid(p){return p+"-"+crypto.randomUUID().slice(0,8)}
function email(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||""))}
function sameOrigin(r){const o=r.headers.get("origin");if(!o)return true;try{return new URL(o).host===new URL(r.url).host}catch{return false}}
function limit(r){const k=(r.headers.get("cf-connecting-ip")||"x"),n=Date.now(),x=limits.get(k)||{t:n,c:0};if(n-x.t>60000){x.t=n;x.c=0}x.c++;limits.set(k,x);return x.c>80}
async function read(r,max=2000000){const t=await r.text();if(t.length>max)throw new Error("Payload too large");try{return t?JSON.parse(t):{}}catch{throw new Error("Invalid JSON")}}
async function load(env){if(env.STORE_KV){const x=await env.STORE_KV.get("site","json");if(x)return x}return state}
async function save(env,x){state=structuredClone(x);if(env.STORE_KV)await env.STORE_KV.put("site",JSON.stringify(x));return x}
function normalize(type,x,old={}){const y=Object.assign({},old);["name","category","brand","badge","description","title","icon","period","url","date","text"].forEach(k=>{if(x[k]!==undefined)y[k]=String(x[k]).trim().slice(0,12000)});["price","oldPrice","stock","rating"].forEach(k=>{if(x[k]!==undefined)y[k]=num(x[k])});["features","technology"].forEach(k=>{if(x[k]!==undefined)y[k]=Array.isArray(x[k])?x[k].map(String).filter(Boolean):String(x[k]).split(",").map(s=>s.trim()).filter(Boolean)});if(x.specs!==undefined)y.specs=typeof x.specs==="object"?x.specs:{};if(x.featured!==undefined)y.featured=x.featured===true||String(x.featured)==="true";if(x.visibility!==undefined)y.visibility=!(x.visibility===false||String(x.visibility)==="false");if(x.image!==undefined)y.image=String(x.image);if(!y.id)y.id=uid(type.slice(0,-1));if(type==="products"&&!y.name)throw new Error("Product name is required");if(type==="services"&&!y.title)throw new Error("Service title is required");if(type==="packages"&&!y.name)throw new Error("Package name is required");if(type==="portfolio"&&!y.title)throw new Error("Portfolio title is required");if(type==="reviews"&&!y.name)throw new Error("Reviewer name is required");return y}
function currentSession(req){const c=(req.headers.get("cookie")||"").split(";").map(s=>s.trim()).find(s=>s.startsWith("nx_admin="));if(!c)return null;const x=sessions.get(c.slice(9));if(!x||x.exp<Date.now()){sessions.delete(c?.slice(9));return null}return x.user}
async function api(req,env,url){
  if(limit(req))return json({error:"Too many requests"},429);
  const p=url.pathname;
  if(p==="/api/site"&&req.method==="GET")return json(await load(env));
  if(p==="/api/login"&&req.method==="POST"){
    if(!sameOrigin(req))return json({error:"Invalid request origin"},403);
    if(!env.ADMIN_USER||!env.ADMIN_KEY)return json({error:"Configure ADMIN_USER and ADMIN_KEY in Cloudflare Variables"},503);
    const x=await read(req,10000);
    if(x.username!==env.ADMIN_USER||x.password!==env.ADMIN_KEY)return json({error:"Invalid credentials"},401);
    const token=crypto.randomUUID();sessions.set(token,{user:env.ADMIN_USER,exp:Date.now()+8*60*60*1000});
    return json({ok:true},200,{"set-cookie":"nx_admin="+token+"; Max-Age=28800; Path=/; HttpOnly; SameSite=Strict; Secure"});
  }
  if(p==="/api/logout"&&req.method==="POST"){const c=(req.headers.get("cookie")||"").split(";").map(s=>s.trim()).find(s=>s.startsWith("nx_admin="));if(c)sessions.delete(c.slice(9));return json({ok:true},200,{"set-cookie":"nx_admin=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict; Secure"})}
  if(p==="/api/orders"&&req.method==="POST"){const x=await read(req,40000),c=x.customer||{};if(!String(c.name||"").trim()||!String(c.phone||"").trim())return json({error:"Name and phone are required"},400);if(c.email&&!email(c.email))return json({error:"Invalid email"},400);const s=await load(env),items=Array.isArray(x.items)?x.items:[],total=items.reduce((a,i)=>a+num(i.price)*Math.max(1,Math.min(20,num(i.qty,1))),0),o={id:uid("ORD"),customer:c,payment:x.payment||"Cash on delivery",items,total,status:"Pending",createdAt:new Date().toISOString()};s.orders=Array.isArray(s.orders)?s.orders:[];s.orders.unshift(o);await save(env,s);return json({ok:true,orderId:o.id},201)}
  if(p==="/api/contact"&&req.method==="POST"){const x=await read(req,30000);if(!String(x.name||"").trim()||!String(x.message||"").trim())return json({error:"Name and message are required"},400);if(x.email&&!email(x.email))return json({error:"Invalid email"},400);const s=await load(env);s.contacts=Array.isArray(s.contacts)?s.contacts:[];s.contacts.unshift(Object.assign({},x,{id:uid("MSG"),createdAt:new Date().toISOString()}));await save(env,s);return json({ok:true},201)}
  if(p==="/api/chat"&&req.method==="POST"){const x=await read(req,12000),m=String(x.message||"").toLowerCase();if(/package|প্যাকেজ/.test(m))return json({reply:"Basic Website, Business Website and Premium E-commerce packages are available on /packages."});if(/price|cost|দাম/.test(m))return json({reply:"Open Shop or tell me the product name for pricing."});if(/website|ওয়েব|ওয়েব/.test(m))return json({reply:"NEXORA WEB builds responsive business and e-commerce websites. Use Contact for a project discussion."});return json({reply:"I can help with products, orders, packages, websites and PC builds. বাংলা, Banglish and English supported."})}
  if(p==="/api/search"&&req.method==="GET"){const q=String(url.searchParams.get("q")||"").toLowerCase(),s=await load(env),out=[];(s.products||[]).forEach(x=>{if((x.name+" "+x.brand+" "+x.category+" "+x.description).toLowerCase().includes(q))out.push({type:"product",title:x.name,description:x.description,url:"/product/"+x.id})});(s.services||[]).forEach(x=>{if((x.title+" "+x.description).toLowerCase().includes(q))out.push({type:"service",title:x.title,description:x.description,url:"/services#"+x.id})});(s.packages||[]).forEach(x=>{if((x.name+" "+(x.features||[]).join(" ")).toLowerCase().includes(q))out.push({type:"package",title:x.name,description:(x.features||[]).slice(0,3).join(" · "),url:"/packages"})});return json(out.slice(0,40))}
  const user=currentSession(req);if(!user)return json({error:"Unauthorized"},401);
  const s=await load(env);
  if(p==="/api/admin/dashboard"&&req.method==="GET")return json({products:(s.products||[]).length,services:(s.services||[]).length,packages:(s.packages||[]).length,portfolio:(s.portfolio||[]).length,reviews:(s.reviews||[]).length,orders:(s.orders||[]).length,contacts:(s.contacts||[]).length});
  if(p==="/api/admin/site"&&req.method==="GET")return json(s);
  if(p==="/api/admin/site"&&req.method==="PUT"){const x=await read(req),n=Object.assign({},s,x,{settings:Object.assign({},s.settings,x.settings||{})});await save(env,n);return json(n)}
  const m=p.match(/^\/api\/admin\/(products|services|packages|portfolio|reviews)(?:\/([^/]+))?$/);
  if(m){const t=m[1],id=m[2],list=Array.isArray(s[t])?s[t]:[];if(req.method==="GET")return json(list);if(req.method==="POST"){const x=normalize(t,await read(req),{});list.push(x);s[t]=list;await save(env,s);return json(x,201)}const i=list.findIndex(x=>x.id===id);if(i<0)return json({error:"Not found"},404);if(req.method==="PUT"){list[i]=normalize(t,await read(req),list[i]);s[t]=list;await save(env,s);return json(list[i])}if(req.method==="DELETE"){list.splice(i,1);s[t]=list;await save(env,s);return json({ok:true})}}
  if(p==="/api/admin/orders"&&req.method==="GET")return json(s.orders||[]);
  const om=p.match(/^\/api\/admin\/orders\/([^/]+)$/);if(om){const i=(s.orders||[]).findIndex(x=>x.id===om[1]);if(i<0)return json({error:"Order not found"},404);if(req.method==="PUT"){const x=await read(req,10000);s.orders[i].status=String(x.status||"Pending");await save(env,s);return json(s.orders[i])}if(req.method==="DELETE"){s.orders.splice(i,1);await save(env,s);return json({ok:true})}}
  if(p==="/api/admin/contacts")return json(s.contacts||[]);
  return json({error:"Not found"},404);
}
async function asset(env,req,path){const r=await env.ASSETS.fetch(new Request(new URL(path,req.url),req));if(r.status!==404)return r;return env.ASSETS.fetch(new Request(new URL("/index.html",req.url),req))}
export default {async fetch(req,env){const u=new URL(req.url);if(u.pathname.startsWith("/api/")){try{return await api(req,env,u)}catch(e){return json({error:e.message||"Server error"},500)}}if(req.method!=="GET"&&req.method!=="HEAD")return new Response("Method Not Allowed",{status:405});if(u.pathname==="/admin"||u.pathname==="/admin/")return asset(env,req,"/admin.html");return asset(env,req,u.pathname)}};