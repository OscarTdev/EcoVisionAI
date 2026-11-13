const $ = (id) => document.getElementById(id);
const categories = {
  plastico: {label:"Plástico", icon:"▤", confidence:94, destination:"Recipiente blanco", advice:"Si el envase está limpio y seco, deposítalo en el recipiente blanco de aprovechables. Aplica las reglas locales de separación."},
  papel: {label:"Cartón o papel", icon:"▤", confidence:92, destination:"Recipiente blanco", advice:"El papel y el cartón deben estar limpios y secos para poder aprovecharse. Deposítalos en el recipiente blanco."},
  vidrio: {label:"Vidrio", icon:"◇", confidence:96, destination:"Recipiente blanco", advice:"Los envases de vidrio aprovechables van en el recipiente blanco. Manipúlalos con cuidado y no deposites vidrio roto sin protección."},
  no_reciclable: {label:"No reciclable", icon:"×", confidence:89, destination:"Recipiente negro", advice:"Este residuo se clasifica como no aprovechable. Deposítalo en el recipiente negro."}
};
// Nombres de clase del modelo (metadata.json) -> categoría de la app
const aliases = {plastico:"plastico", vidrio:"vidrio", carton_o_papel:"papel", papel_carton:"papel", papel:"papel", carton:"papel", no_reciclable:"no_reciclable", no_aprovechable:"no_reciclable"};
const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
const LOW_CONFIDENCE = 0.60;
let stream = null, model = null, modelReady = false, liveTimer = null, busy = false;

function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),2800);}
function clearActiveBins(){document.querySelectorAll(".bin-card").forEach(x=>x.classList.remove("active"));}

function renderProbs(predictions){
  const list=$("probList"); if(!list) return;
  const sorted=[...predictions].sort((a,b)=>b.probability-a.probability);
  list.innerHTML=sorted.map((p,i)=>`<div class="prob ${i===0?"top":""}"><span>${p.className}</span><i><b style="width:${(p.probability*100).toFixed(0)}%"></b></i><span>${(p.probability*100).toFixed(0)}%</span></div>`).join("");
}
function showResult(key, confidence, source){
  const item=categories[key]; if(!item) return;
  $("emptyResult").hidden=true; $("resultContent").hidden=false;
  $("resultName").textContent=item.label; $("resultSymbol").textContent=item.icon;
  const low = source==="model" && confidence<LOW_CONFIDENCE*100;
  $("confidenceLabel").textContent = source==="model" ? (low?"Confianza baja: repite con mejor luz y un solo objeto":"Puntuación del modelo") : "Confianza ilustrativa (simulación)";
  $("confidenceValue").textContent=Math.round(confidence)+"%";
  $("confidenceMeter").style.width=Math.max(0,Math.min(100,confidence))+"%";
  $("recommendationTitle").textContent="Destino: "+item.destination;
  $("recommendationText").textContent=item.advice;
  clearActiveBins();
  if(!low){const card=document.querySelector(`[data-bin="${key}"]`); if(card) card.classList.add("active");}
  $("demoNote").hidden=source==="model";
  if(source!=="model") $("probList").innerHTML="";
  $("showBinBtn").textContent="Ver recipiente: "+item.label;
}
function resetResult(){$("resultContent").hidden=true;$("emptyResult").hidden=false;$("demoNote").hidden=true;clearActiveBins();}

// Copia el cuadro actual (video o imagen) a un canvas, para que el modelo lo lea de forma segura
function toCanvas(src){
  const w=src.videoWidth||src.naturalWidth||src.width, h=src.videoHeight||src.naturalHeight||src.height;
  if(!w||!h) return null;
  const c=document.createElement("canvas"); c.width=w; c.height=h; c.getContext("2d").drawImage(src,0,0,w,h); return c;
}
async function classify(src){
  if(!modelReady||busy) return;
  const canvas=toCanvas(src); if(!canvas) return;
  busy=true;
  try{
    const predictions=await model.predict(canvas);
    const top=[...predictions].sort((a,b)=>b.probability-a.probability)[0];
    const key=aliases[normalize(top.className)];
    renderProbs(predictions);
    if(!key){toast("Clase sin categoría en la app: "+top.className);return;}
    showResult(key, top.probability*100, "model");
  }catch(e){console.error(e);toast("No se pudo analizar la imagen.");}
  finally{busy=false;}
}

async function startCamera(){
  if(stream){stopCamera();return;}
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
    const v=$("video"); v.srcObject=stream; await v.play().catch(()=>{});
    v.hidden=false; $("preview").hidden=true; $("cameraPlaceholder").hidden=true; $("captureBtn").disabled=false;
    $("cameraBtn").textContent="Ⅱ Detener cámara"; $("cameraStatus").textContent="Cámara activa"; $("cameraStatus").classList.add("active");
    $("cameraStage").classList.add("scanning");
    toast(modelReady?"Cámara activa. Muestra un residuo.":"Cámara activa, pero el modelo aún no carga.");
    clearInterval(liveTimer); liveTimer=setInterval(()=>classify($("video")),300);
  }catch(e){toast("No se pudo abrir la cámara. Revisa los permisos del navegador.");}
}
function stopCamera(){
  clearInterval(liveTimer); liveTimer=null;
  if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
  $("video").srcObject=null; $("video").hidden=true; $("cameraBtn").textContent="▶ Activar cámara";
  $("cameraStatus").textContent="Cámara apagada"; $("cameraStatus").classList.remove("active");
  $("cameraStage").classList.remove("scanning"); $("captureBtn").disabled=true;
  if($("preview").hidden) $("cameraPlaceholder").hidden=false;
}
function showImage(src){
  const img=$("preview"); img.onload=()=>classify(img); img.src=src; img.hidden=false;
  $("video").hidden=true; $("cameraPlaceholder").hidden=true;
}
function capture(){
  if(!stream) return;
  const c=toCanvas($("video")); if(!c) return;
  const data=c.toDataURL("image/jpeg",.9); stopCamera(); showImage(data); toast("Imagen capturada y analizada.");
}
async function loadModel(){
  try{
    model=await tmImage.load("./modelo/model.json","./modelo/metadata.json");
    modelReady=true; $("modePill").textContent="MODELO IA CONECTADO"; $("modePill").classList.add("connected");
    toast("Modelo cargado: "+model.getTotalClasses()+" clases.");
  }catch(e){
    console.error(e); $("modePill").textContent="MODO SIMULACIÓN";
    toast("No se pudo cargar el modelo. Abre la página desde un servidor (no con doble clic).");
  }
}

$("cameraBtn").addEventListener("click",startCamera);
$("captureBtn").addEventListener("click",capture);
$("fileInput").addEventListener("change",e=>{
  const file=e.target.files[0]; if(!file) return;
  if(!file.type.startsWith("image/")){toast("Selecciona un archivo de imagen.");return;}
  stopCamera(); const reader=new FileReader();
  reader.onload=()=>{resetResult();showImage(reader.result);};
  reader.readAsDataURL(file);
});
$("demoBtn").addEventListener("click",()=>{const key=$("demoSelect").value;showResult(key,categories[key].confidence,"demo");toast("Simulación: no es una predicción de IA.");});
$("resetBtn").addEventListener("click",()=>{resetResult();$("fileInput").value="";$("preview").hidden=true;if(!stream)$("cameraPlaceholder").hidden=false;});
$("showBinBtn").addEventListener("click",()=>$("binsSection").scrollIntoView({behavior:"smooth"}));
loadModel();
