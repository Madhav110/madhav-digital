import PocketBase from "https://cdn.jsdelivr.net/npm/pocketbase@0.40.4/dist/pocketbase.es.mjs";

const pb = new PocketBase(window.location.origin);
let products = [];
let billItems = [];

const $ = id => document.getElementById(id);
const money = n => "₹" + Number(n || 0).toLocaleString("en-IN", {minimumFractionDigits:2, maximumFractionDigits:2});
const today = () => new Date().toISOString().slice(0,10);

function toast(msg){
  const el=$("toast"); el.textContent=msg; el.style.display="block";
  setTimeout(()=>el.style.display="none",2500);
}
function showMsg(id,msg){$(id).textContent=msg||"";}

function setLoggedIn(ok){
  $("loginScreen").classList.toggle("hidden",ok);
  $("app").classList.toggle("hidden",!ok);
}

async function init(){
  $("billDate").value=today();
  if(pb.authStore.isValid){
    try{await pb.collection("staff").authRefresh(); setLoggedIn(true); await loadAll();}
    catch{pb.authStore.clear();setLoggedIn(false);}
  }else setLoggedIn(false);
}

$("loginForm").addEventListener("submit",async e=>{
  e.preventDefault(); showMsg("loginMsg","Logging in...");
  try{
    await pb.collection("staff").authWithPassword($("loginEmail").value,$("loginPassword").value);
    showMsg("loginMsg","");
    setLoggedIn(true); await loadAll();
  }catch(err){showMsg("loginMsg",err?.response?.message||err.message||"Login failed");}
});

$("logoutBtn").onclick=()=>{pb.authStore.clear();setLoggedIn(false);};

document.querySelectorAll(".tab").forEach(btn=>{
  btn.onclick=async()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".panel").forEach(x=>x.classList.add("hidden"));
    $(btn.dataset.tab).classList.remove("hidden");
    if(btn.dataset.tab==="products") await loadProducts();
    if(btn.dataset.tab==="sales") await loadSales();
    if(btn.dataset.tab==="dashboard") await loadDashboard();
    if(btn.dataset.tab==="billing") await loadProducts();
  };
});

async function loadAll(){await loadProducts();await loadSales();await loadDashboard();fillProductSelect();}
async function loadProducts(){
  products=await pb.collection("products").getFullList({sort:"product_name"});
  renderProducts(); fillProductSelect(); loadDashboard();
}
function renderProducts(){
  const q=($("productSearch").value||"").toLowerCase();
  $("productRows").innerHTML=products.filter(p=>
    (p.product_name||"").toLowerCase().includes(q)||(p.product_code||"").toLowerCase().includes(q)
  ).map(p=>{
    const photo=p.photo?pb.files.getURL(p,p.photo):"";
    return `<tr><td>${photo?`<img class="thumb" src="${photo}">`:"—"}</td>
      <td>${esc(p.product_name)}</td><td>${esc(p.product_code)}</td><td>${esc(p.supplier||"")}</td>
      <td>${money(p.purchase_price)}</td><td>${money(p.selling_price)}</td><td>${p.stock_qty}</td>
      <td><button onclick="editProduct('${p.id}')">Edit</button></td></tr>`;
  }).join("")||`<tr><td colspan="8">No products</td></tr>`;
}
$("productSearch").addEventListener("input",renderProducts);

window.editProduct=async id=>{
  const p=products.find(x=>x.id===id); if(!p)return;
  $("productId").value=p.id;$("pName").value=p.product_name||"";$("pCode").value=p.product_code||"";
  $("pSupplier").value=p.supplier||"";$("pPurchase").value=p.purchase_price||0;$("pSelling").value=p.selling_price||0;
  $("pStock").value=p.stock_qty||0;$("pRemarks").value=p.remarks||"";
  window.scrollTo({top:0,behavior:"smooth"});
};

$("productCancel").onclick=()=>{
  $("productForm").reset();$("productId").value="";
};
$("productForm").addEventListener("submit",async e=>{
  e.preventDefault(); showMsg("productMsg","Saving...");
  try{
    const data={product_name:$("pName").value.trim(),product_code:$("pCode").value.trim(),
      supplier:$("pSupplier").value.trim(),purchase_price:Number($("pPurchase").value||0),
      selling_price:Number($("pSelling").value||0),stock_qty:Number($("pStock").value||0),
      remarks:$("pRemarks").value.trim()};
    const id=$("productId").value;
    const fd=new FormData(); for(const [k,v] of Object.entries(data))fd.append(k,v);
    const file=$("pPhoto").files[0]; if(file)fd.append("photo",file);
    if(id) await pb.collection("products").update(id,fd); else await pb.collection("products").create(fd);
    showMsg("productMsg","Saved."); $("productForm").reset(); $("productId").value="";
    await loadProducts(); toast("Product saved");
  }catch(err){showMsg("productMsg",err?.response?.message||err.message||"Save failed");}
});

function fillProductSelect(){
  $("billProduct").innerHTML=`<option value="">Select product</option>`+
    products.filter(p=>Number(p.stock_qty)>0).map(p=>
      `<option value="${p.id}" data-rate="${p.selling_price||0}">${esc(p.product_name)} — ${esc(p.product_code)} — Stock ${p.stock_qty}</option>`
    ).join("");
}
$("billProduct").addEventListener("change",()=>{
  const opt=$("billProduct").selectedOptions[0]; if(opt)$("billRate").value=opt.dataset.rate||0;
});
$("addItem").onclick=()=>{
  const id=$("billProduct").value, qty=Number($("billQty").value), rate=Number($("billRate").value);
  const p=products.find(x=>x.id===id);
  if(!p)return toast("Product select करें");
  if(!Number.isInteger(qty)||qty<1)return toast("Quantity सही डालें");
  if(qty>Number(p.stock_qty))return toast("Stock available: "+p.stock_qty);
  const old=billItems.find(x=>x.product_id===id);
  if(old){if(old.quantity+qty>Number(p.stock_qty))return toast("Stock available: "+p.stock_qty);old.quantity+=qty;old.rate=rate;}
  else billItems.push({product_id:id,product_name:p.product_name,quantity:qty,rate});
  renderBill();
};
function renderBill(){
  $("billRows").innerHTML=billItems.map((x,i)=>`<tr><td>${esc(x.product_name)}</td><td>${x.quantity}</td><td>${money(x.rate)}</td><td>${money(x.quantity*x.rate)}</td><td><button onclick="removeBillItem(${i})">×</button></td></tr>`).join("")||`<tr><td colspan="5">No items</td></tr>`;
  const subtotal=billItems.reduce((s,x)=>s+x.quantity*x.rate,0), discount=Number($("billDiscount").value||0);
  const total=Math.max(0,subtotal-discount),paid=Number($("billPaid").value||0),due=Math.max(0,total-paid);
  $("billSubtotal").textContent=money(subtotal);$("billDiscountView").textContent=money(discount);
  $("billTotal").textContent=money(total);$("billPaidView").textContent=money(paid);$("billDue").textContent=money(due);
}
window.removeBillItem=i=>{billItems.splice(i,1);renderBill();};
$("billDiscount").oninput=renderBill;$("billPaid").oninput=renderBill;

$("saveBill").onclick=async()=>{
  if(!billItems.length)return toast("Bill में product add करें");
  const discount=Number($("billDiscount").value||0), paid=Number($("billPaid").value||0);
  const subtotal=billItems.reduce((s,x)=>s+x.quantity*x.rate,0), total=Math.max(0,subtotal-discount), due=Math.max(0,total-paid);
  if(paid>total)return toast("Paid amount total से ज्यादा नहीं होना चाहिए");
  const bill={
    customer_name:$("customerName").value.trim(),customer_mobile:$("customerMobile").value.trim(),
    bill_date:$("billDate").value,discount,paid,remarks:$("billRemarks").value.trim(),
    items:billItems.map(x=>({product_id:x.product_id,quantity:x.quantity,rate:x.rate}))
  };
  try{
    $("saveBill").disabled=true; $("saveBill").textContent="Saving...";
    const res=await pb.send("/api/madhav/create-sale",{method:"POST",body:bill});
    toast("Bill saved: "+res.bill_no);
    const msg=`Madhav Digital%0ABill No: ${res.bill_no}%0ACustomer: ${encodeURIComponent(bill.customer_name||"Customer")}%0ATotal: ${encodeURIComponent(money(total))}%0APaid: ${encodeURIComponent(money(paid))}%0ADue: ${encodeURIComponent(money(due))}%0AThank you!`;
    if(bill.customer_mobile) window.open(`https://wa.me/${bill.customer_mobile.replace(/\D/g,"")}?text=${msg}`,"_blank");
    clearBill(); await loadProducts(); await loadSales(); await loadDashboard();
  }catch(err){toast(err?.response?.message||err.message||"Bill save failed");}
  finally{$("saveBill").disabled=false;$("saveBill").textContent="Save Bill";}
};
function clearBill(){
  billItems=[];$("customerName").value="";$("customerMobile").value="";$("billDiscount").value=0;
  $("billPaid").value=0;$("billRemarks").value="";$("billDate").value=today();renderBill();
}
$("clearBill").onclick=clearBill;

async function loadSales(){
  const sales=await pb.collection("sales").getFullList({sort:"-bill_date,-created"});
  $("salesRows").innerHTML=sales.map(s=>`<tr><td>${esc(s.bill_no)}</td><td>${esc((s.bill_date||"").slice(0,10))}</td>
  <td>${esc(s.customer_name||"")}</td><td>${money(s.total)}</td><td>${money(s.paid)}</td><td>${money(s.due)}</td>
  <td>${esc(s.payment_status||"")}</td><td><button onclick="shareSale('${s.id}')">WhatsApp</button></td></tr>`).join("")||`<tr><td colspan="8">No sales</td></tr>`;
  window.__sales=sales;
}
window.shareSale=async id=>{
  const s=(window.__sales||[]).find(x=>x.id===id);if(!s)return;
  const msg=`Madhav Digital%0ABill No: ${encodeURIComponent(s.bill_no)}%0ATotal: ${encodeURIComponent(money(s.total))}%0APaid: ${encodeURIComponent(money(s.paid))}%0ADue: ${encodeURIComponent(money(s.due))}`;
  if(s.customer_mobile)window.open(`https://wa.me/${s.customer_mobile.replace(/\D/g,"")}?text=${msg}`,"_blank");
  else toast("Customer mobile saved नहीं है");
};
$("refreshSales").onclick=loadSales;

async function loadDashboard(){
  try{
    const sales=await pb.collection("sales").getFullList({fields:"total,due"});
    $("statProducts").textContent=products.length;
    $("statStock").textContent=products.reduce((s,p)=>s+Number(p.stock_qty||0),0);
    $("statSales").textContent=money(sales.reduce((s,x)=>s+Number(x.total||0),0));
    $("statDue").textContent=money(sales.reduce((s,x)=>s+Number(x.due||0),0));
  }catch{}
}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}

init();
