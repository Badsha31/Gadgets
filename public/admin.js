const qs=s=>document.querySelector(s),qsa=s=>Array.from(document.querySelectorAll(s));
const meta={
 products:{label:"Products",fields:["name","category","brand","price","oldPrice","stock","rating","badge","image","description","features","specs"]},
 services:{label:"Services",fields:["icon","title","description","features"]},
 packages:{label:"Packages",fields:["name","price","period","featured","visibility","features"]},
 portfolio:{label:"Portfolio",fields:["title","category","description","url","technology","image"]},
 reviews:{label:"Reviews",fields:["name","rating","date","text","image"]}
};
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]))}
function labelize(k){return k.replace(/([A-Z])/g," $1")}
function inputField(k,v){
 const val=Array.isArray(v)?v.join(", "):typeof v==="object"&&v?JSON.stringify(v):v??"";
 const multi=["description","text"].includes(k);
 if(k==="image"||k==="heroImage")return "<label class='full'>"+esc(labelize(k))+"<input name='"+esc(k)+"' value='"+esc(val)+"'><input type='file' accept='image/*' data-image-file='"+esc(k)+"'><small class='muted'>Upload an image or paste an https URL. Uploads are stored in the server data layer.</small></label>";
 return "<label"+(multi?" class='full'":"")+">"+esc(labelize(k))+(multi?"<textarea name='"+esc(k)+"'>"+esc(val)+"</textarea>":"<input name='"+esc(k)+"' value='"+esc(val)+"'>")+"</label>";
}
function fileToData(file){return new Promise((resolve,reject)=>{if(!file)return resolve("");if(file.size>1400000)return reject(new Error("Image is too large. Use an optimized image under 1.4MB."));const r=new FileReader();r.onload=()=>resolve(String(r.result||""));r.onerror=()=>reject(new Error("Could not read the image."));r.readAsDataURL(file)})}
function money(n){return "৳"+Number(n||0).toLocaleString("en-BD")}
async function api(url,opt){const r=await fetch(url,Object.assign({headers:{"Content-Type":"application/json"}},opt||{}));const d=await r.json();if(r.status===401){location.reload();throw new Error("Session expired")}if(!r.ok)throw new Error(d.error||"Request failed");return d}
async function init(){
 const check=await fetch("/api/admin/dashboard").catch(()=>null);
 if(!check||!check.ok){const f=qs("#loginForm");if(f)f.onsubmit=login;return}
 const logout=qs("#adminLogout");if(logout)logout.onclick=async()=>{await fetch("/api/logout",{method:"POST"});location.reload()};
 qsa(".adminSide [data-view]").forEach(b=>b.onclick=()=>show(b.dataset.view));
 show("dashboard");
}
async function login(e){e.preventDefault();const f=new FormData(e.target),n=qs("#loginNotice");try{await api("/api/login",{method:"POST",body:JSON.stringify(Object.fromEntries(f.entries()))});location.reload()}catch(err){n.textContent=err.message;n.className="notice error"}}
async function show(view){
 qsa(".adminSide [data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
 qs("#adminTitle").textContent=view.charAt(0).toUpperCase()+view.slice(1);
 const app=qs("#adminApp");if(!app)return;
 if(view==="dashboard"){
  const d=await api("/api/admin/dashboard"),s=await api("/api/admin/site");
  app.innerHTML="<div class='adminView'><div class='statGrid'>"+Object.entries(d).map(x=>"<div class='statCard'><strong>"+x[1]+"</strong><span>"+esc(x[0])+"</span></div>").join("")+"</div><div class='adminSplit'><div class='adminCard'><h2>Content control</h2><p class='muted'>Products, orders, reviews, packages and portfolio are stored in the server data layer.</p><div class='adminActions'><button class='btn primary' data-jump='products'>Manage products</button><button class='btn ghost' data-jump='portfolio'>Manage portfolio</button></div></div><div class='adminCard'><h2>Brand credits</h2><p class='muted'>"+esc(s.maker)+"</p><p class='muted'>"+esc(s.sponsor)+"</p><p class='muted'>Update these from Website Settings.</p></div></div></div>";
  qsa("[data-jump]").forEach(b=>b.onclick=()=>show(b.dataset.jump));return;
 }
 if(view==="settings"){
  const s=await api("/api/admin/site"),so=s.socials||{};
  app.innerHTML="<div class='adminCard'><h2>Website Settings</h2><form id='settingsForm' class='adminForm'>"+inputField("brand",s.brand)+inputField("maker",s.maker)+inputField("sponsor",s.sponsor)+inputField("ctaText",s.ctaText)+inputField("tagline",s.tagline)+inputField("heroTitle",s.heroTitle)+inputField("heroDescription",s.heroDescription)+inputField("heroImage",s.heroImage)+inputField("phone",s.phone)+inputField("whatsapp",s.whatsapp)+inputField("messenger",s.messenger)+inputField("email",s.email)+inputField("address",s.address)+inputField("facebook",so.facebook)+inputField("instagram",so.instagram)+inputField("tiktok",so.tiktok)+inputField("youtube",so.youtube)+inputField("socialWhatsapp",so.whatsapp)+"<div class='adminActions full'><button class='btn primary'>Save settings ↗</button></div><div class='notice' id='settingsNotice'></div></form></div>";
  qs("#settingsForm").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));try{const hero=qs("[data-image-file='heroImage']",e.target);if(hero?.files?.[0])d.heroImage=await fileToData(hero.files[0])}catch(err){qs("#settingsNotice").textContent=err.message;qs("#settingsNotice").className="notice error";return}d.socials={facebook:d.facebook,instagram:d.instagram,tiktok:d.tiktok,youtube:d.youtube,whatsapp:d.socialWhatsapp};["facebook","instagram","tiktok","youtube","socialWhatsapp"].forEach(k=>delete d[k]);try{await api("/api/admin/site",{method:"PUT",body:JSON.stringify(d)});qs("#settingsNotice").textContent="Settings saved.";qs("#settingsNotice").className="notice success"}catch(err){qs("#settingsNotice").textContent=err.message;qs("#settingsNotice").className="notice error"}};return;
 }
 if(view==="orders"){
  const list=await api("/api/admin/orders");
  app.innerHTML="<div class='adminCard'><h2>Orders</h2>"+(list.length?"<div style='overflow:auto'><table class='adminTable'><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Created</th><th></th></tr></thead><tbody>"+list.map(o=>"<tr><td>"+esc(o.id)+"</td><td>"+esc(o.customer.name)+"<br>"+esc(o.customer.phone)+"</td><td>"+money(o.total)+"</td><td><select data-order-status='"+esc(o.id)+"'>"+["Pending","Confirmed","Processing","Shipped","Delivered","Cancelled"].map(st=>"<option "+(st===o.status?"selected":"")+">"+st+"</option>").join("")+"</select></td><td>"+esc(o.createdAt.slice(0,10))+"</td><td><button class='btn ghost danger' data-delete-order='"+esc(o.id)+"'>Delete</button></td></tr>").join("")+"</tbody></table></div>":"<div class='emptyState'>No orders yet.</div>")+"</div>";
  qsa("[data-order-status]").forEach(s=>s.onchange=async()=>{await api("/api/admin/orders/"+s.dataset.orderStatus,{method:"PUT",body:JSON.stringify({status:s.value})});toastA("Order updated.")});
  qsa("[data-delete-order]").forEach(b=>b.onclick=async()=>{if(!confirm("Delete this order?"))return;await api("/api/admin/orders/"+b.dataset.deleteOrder,{method:"DELETE"});show("orders")});return;
 }
 if(view==="contacts"){
  const list=await api("/api/admin/contacts");
  app.innerHTML="<div class='adminCard'><h2>Contact messages</h2>"+(list.length?"<div class='adminList'>"+list.map(x=>"<div class='adminListItem'><div class='meta'><strong>"+esc(x.name)+" · "+esc(x.email)+"</strong><small>"+esc(x.service||"General")+" · "+esc(x.createdAt.slice(0,10))+"</small><p>"+esc(x.message)+"</p></div></div>").join("")+"</div>":"<div class='emptyState'>No messages yet.</div>")+"</div>";return;
 }
 if(meta[view]){await showResource(view)}
}
async function showResource(type,editItem){
 const items=await api("/api/admin/"+type),m=meta[type],app=qs("#adminApp");
 const item=editItem||{};
 const fields=m.fields.map(k=>inputField(k,item[k])).join("");
 app.innerHTML="<div class='adminSplit'><div class='adminCard'><h2>"+(editItem?"Edit ":"Add ")+m.label.slice(0,-1)+"</h2><p class='muted'>Use comma-separated values for features, technology or tags. Use JSON for product specs.</p><form id='resourceForm' class='adminForm' data-type='"+type+"' data-id='"+esc(item.id||"")+"'>"+fields+"<div class='adminActions full'><button class='btn primary' type='submit'>"+(editItem?"Update":"Save")+"</button><button class='btn ghost' type='button' id='clearForm'>Clear</button></div><div class='notice' id='resourceNotice'></div></form></div><div class='adminCard'><h2>Current "+m.label+"</h2><div class='adminList'>"+(items.length?items.map(x=>"<div class='adminListItem'>"+(x.image?"<img src='"+esc(x.image)+"' alt=''>":"")+"<div class='meta'><strong>"+esc(x.name||x.title||"Untitled")+"</strong><small>"+esc(x.category||x.description||x.text||"").slice(0,100)+"</small></div><div class='adminActions'><button class='btn ghost' data-edit='"+esc(x.id)+"'>Edit</button><button class='btn ghost danger' data-delete='"+esc(x.id)+"'>Delete</button></div></div>").join(""):"<div class='emptyState'>Nothing here yet.</div>")+"</div></div></div>";
 bindResource(type);
 qsa("[data-edit]").forEach(b=>b.onclick=async()=>{const fresh=await api("/api/admin/"+type);const x=fresh.find(z=>z.id===b.dataset.edit);showResource(type,x)});
 qsa("[data-delete]").forEach(b=>b.onclick=async()=>{if(!confirm("Delete this item?"))return;await api("/api/admin/"+type+"/"+b.dataset.delete,{method:"DELETE"});show(type)});
 qs("#clearForm").onclick=()=>show(type);
}
function bindResource(type){
 const form=qs("#resourceForm");if(!form)return;
 form.onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(form).entries());
  try{for(const f of qsa("[data-image-file]",form)){if(f.files&&f.files[0])d[f.dataset.imageFile]=await fileToData(f.files[0])}}catch(err){const n=qs("#resourceNotice");n.textContent=err.message;n.className="notice error";return}
  ["features","technology"].forEach(k=>{if(d[k]!==undefined)d[k]=d[k].split(",").map(x=>x.trim()).filter(Boolean)});
  ["price","oldPrice","stock","rating"].forEach(k=>{if(d[k]!==undefined&&d[k]!=="")d[k]=Number(d[k])});
  if(d.featured!==undefined)d.featured=String(d.featured)==="true";if(d.visibility!==undefined)d.visibility=String(d.visibility)!=="false";
  if(d.specs){try{d.specs=JSON.parse(d.specs)}catch{d.specs={}}}
  try{const id=form.dataset.id;await api("/api/admin/"+type+(id?"/"+id:""),{method:id?"PUT":"POST",body:JSON.stringify(d)});toastA("Saved successfully.");show(type)}catch(err){const n=qs("#resourceNotice");n.textContent=err.message;n.className="notice error"}
 };
}
function toastA(msg,error){let n=qs("#adminToast");if(!n){n=document.createElement("div");n.id="adminToast";n.className="toast";document.body.appendChild(n)}n.textContent=msg;n.classList.toggle("error",!!error);n.classList.add("show");clearTimeout(window.__adminToast);window.__adminToast=setTimeout(()=>n.classList.remove("show"),2200)}
document.addEventListener("DOMContentLoaded",init);