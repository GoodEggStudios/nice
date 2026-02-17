/**
 * Embed Routes
 *
 * - GET /embed.js - Embed script loader
 * - GET /embed/:button_id - Embed iframe content
 */

import type { Env } from "../types";

// Embed script (minified inline)
const EMBED_SCRIPT = `(function(){'use strict';const EMBED_BASE='https://nice.sbs';function init(){document.querySelectorAll('script[data-button]').forEach(createEmbed)}function createEmbed(script){const buttonId=script.getAttribute('data-button');if(!buttonId)return;const theme=script.getAttribute('data-theme')||'light';const size=script.getAttribute('data-size')||'md';const container=document.createElement('div');container.className='nice-embed';container.style.cssText='display:inline-block;vertical-align:middle;';const iframe=document.createElement('iframe');iframe.src=EMBED_BASE+'/embed/'+buttonId+'?theme='+encodeURIComponent(theme)+'&size='+encodeURIComponent(size);iframe.style.cssText='border:none;overflow:hidden;width:100px;height:36px;';iframe.setAttribute('scrolling','no');iframe.setAttribute('frameborder','0');iframe.setAttribute('allowtransparency','true');iframe.setAttribute('sandbox','allow-scripts allow-same-origin allow-popups');iframe.setAttribute('title','Nice button');container.appendChild(iframe);script.parentNode.insertBefore(container,script.nextSibling);window.addEventListener('message',function(event){if(event.origin!==EMBED_BASE)return;try{const data=event.data;if(data.type==='nice-resize'&&data.buttonId===buttonId){iframe.style.width=data.width+'px';iframe.style.height=data.height+'px'}}catch(e){}})}if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init)}else{init()}})();`;

// Embed HTML template - Bungee font design with size variants
const EMBED_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nice</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bungee&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Bungee',cursive;background:transparent;display:flex;align-items:center;justify-content:center;padding:2px}
.nice-button{display:inline-flex;align-items:center;border:none;font-family:'Bungee',cursive;cursor:pointer;transition:all .15s ease;user-select:none;-webkit-tap-highlight-color:transparent;text-transform:uppercase;letter-spacing:0.5px}
.nice-button:hover{transform:scale(1.05)}
.nice-button:active{transform:scale(0.95)}

/* Size variants */
.size-sm .nice-button{gap:4px;padding:4px 8px;border-radius:4px;font-size:10px}
.size-sm .nice-count{font-size:9px}
.size-sm body{min-height:24px}

.size-md .nice-button{gap:6px;padding:6px 12px;border-radius:6px;font-size:12px}
.size-md .nice-count{font-size:11px}
.size-md body{min-height:32px}

.size-lg .nice-button{gap:8px;padding:8px 16px;border-radius:8px;font-size:16px}
.size-lg .nice-count{font-size:14px}
.size-lg body{min-height:44px}

/* Theme: Light */
.theme-light .nice-button{background:#f3f4f6;color:#374151}
.theme-light .nice-button:hover{background:#e5e7eb}
.theme-light .nice-button.niced{background:#fef3c7;color:#92400e}

/* Theme: Dark */
.theme-dark .nice-button{background:#374151;color:#f3f4f6}
.theme-dark .nice-button:hover{background:#4b5563}
.theme-dark .nice-button.niced{background:#fbbf24;color:#000}

/* Theme: Minimal */
.theme-minimal .nice-button{background:transparent;color:inherit;border:2px solid currentColor;opacity:.7}
.theme-minimal .nice-button:hover{opacity:1}
.theme-minimal .nice-button.niced{opacity:1;border-color:#fbbf24;color:#fbbf24}

.nice-text{transition:all .15s ease}
.nice-count{opacity:0.8}

@keyframes pulse{0%{transform:scale(1)}50%{transform:scale(1.1)}100%{transform:scale(1)}}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
.nice-button.animating{animation:pulse .3s ease}
.nice-button.shake{animation:shake .3s ease}
.nice-button.disabled{opacity:.5;cursor:not-allowed}
.nice-button.disabled:hover{transform:none}
</style>
</head>
<body class="theme-{{THEME}} size-{{SIZE}}">
<button class="nice-button" id="niceBtn">
<span class="nice-text" id="niceText">Nice</span>
<span class="nice-count" id="niceCount"></span>
</button>
<script>
(function(){'use strict';
const API_BASE='{{API_BASE}}';
const BUTTON_ID='{{BUTTON_ID}}';
const STORAGE_KEY='nice:'+BUTTON_ID;
const btn=document.getElementById('niceBtn');
const textEl=document.getElementById('niceText');
const countEl=document.getElementById('niceCount');
let count=0,hasNiced=false,isLoading=false;
try{hasNiced=localStorage.getItem(STORAGE_KEY)==='1';}catch(e){}
function formatCount(n){
if(n>=1e9)return(n/1e9).toFixed(1).replace(/\\.0$/,'')+'B';
if(n>=1e6)return(n/1e6).toFixed(1).replace(/\\.0$/,'')+'M';
if(n>=1e3)return(n/1e3).toFixed(1).replace(/\\.0$/,'')+'K';
return n.toString();
}
function updateDisplay(){
if(count>0){countEl.textContent=formatCount(count);countEl.style.display='';}else{countEl.textContent='';countEl.style.display='none';}
if(hasNiced){
btn.classList.add('niced');
textEl.textContent="Nice'd";
}else{
textEl.textContent='Nice';
}
notifyResize();
}
function notifyResize(){
const rect=btn.getBoundingClientRect();
parent.postMessage({type:'nice-resize',buttonId:BUTTON_ID,width:Math.ceil(rect.width)+8,height:Math.ceil(rect.height)+8},'*');
}
function getFingerprint(){
const data=[screen.width+'x'+screen.height,new Date().getTimezoneOffset(),navigator.language,navigator.userAgent.slice(0,50)].join('|');
let hash=0;for(let i=0;i<data.length;i++){hash=((hash<<5)-hash)+data.charCodeAt(i);hash=hash&hash;}
return hash.toString(36);
}
async function fetchCount(){
try{
const res=await fetch(API_BASE+'/api/v1/nice/'+BUTTON_ID+'/count');
if(res.ok){const data=await res.json();count=data.count||0;updateDisplay();}
}catch(e){console.error('Nice: Failed to fetch count',e);}
}
async function recordNice(){
if(isLoading)return;
if(hasNiced){btn.classList.add('shake');setTimeout(()=>btn.classList.remove('shake'),300);return;}
isLoading=true;
count++;hasNiced=true;btn.classList.add('animating');updateDisplay();
setTimeout(()=>btn.classList.remove('animating'),300);
try{
const res=await fetch(API_BASE+'/api/v1/nice/'+BUTTON_ID,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fingerprint:getFingerprint()})});
const data=await res.json();
if(res.ok){count=data.count;if(data.success||data.reason==='already_niced'){hasNiced=true;try{localStorage.setItem(STORAGE_KEY,'1');}catch(e){}}}
else if(res.status===429){count--;hasNiced=false;btn.classList.remove('niced');}
updateDisplay();
}catch(e){count--;hasNiced=false;btn.classList.remove('niced');updateDisplay();console.error('Nice: Failed to record',e);}
finally{isLoading=false;}
}
async function checkButton(){
try{const res=await fetch(API_BASE+'/api/v1/nice/'+BUTTON_ID+'/count');if(!res.ok){btn.classList.add('disabled');btn.title='Button not available';}}
catch(e){btn.classList.add('disabled');}
}
btn.addEventListener('click',recordNice);
if(BUTTON_ID){checkButton();fetchCount();}else{btn.classList.add('disabled');}
setTimeout(notifyResize,100);
})();
</script>
</body>
</html>`;

/**
 * GET /embed.js - Serve the embed script
 */
export async function serveEmbedScript(request: Request): Promise<Response> {
  return new Response(EMBED_SCRIPT, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      "Access-Control-Allow-Origin": "*",
    },
  });
}

/**
 * GET /embed/:button_id - Serve the embed iframe content
 */
export async function serveEmbedPage(
  request: Request,
  buttonId: string
): Promise<Response> {
  const url = new URL(request.url);
  const theme = url.searchParams.get("theme") || "light";
  const size = url.searchParams.get("size") || "md";
  
  // Validate theme
  const validThemes = ["light", "dark", "minimal"];
  const safeTheme = validThemes.includes(theme) ? theme : "light";

  // Validate size
  const validSizes = ["sm", "md", "lg"];
  const safeSize = validSizes.includes(size) ? size : "md";

  // Get the API base URL from the request
  const apiBase = `${url.protocol}//${url.host}`;

  // Replace placeholders in HTML
  const html = EMBED_HTML
    .replace(/\{\{API_BASE\}\}/g, apiBase)
    .replace(/\{\{BUTTON_ID\}\}/g, buttonId)
    .replace(/\{\{THEME\}\}/g, safeTheme)
    .replace(/\{\{SIZE\}\}/g, safeSize);

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache", // Don't cache - count should be fresh
      "X-Frame-Options": "ALLOWALL", // Allow embedding
      "Content-Security-Policy": "frame-ancestors *",
    },
  });
}
