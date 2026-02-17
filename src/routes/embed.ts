/**
 * Embed Routes
 *
 * - GET /embed.js - Embed script loader
 * - GET /embed/:button_id - Embed iframe content
 */

import type { Env } from "../types";

// Embed script (minified inline)
const EMBED_SCRIPT = `(function(){'use strict';const EMBED_BASE='https://nice.sbs';function init(){document.querySelectorAll('script[data-button]').forEach(createEmbed)}function createEmbed(script){const buttonId=script.getAttribute('data-button');if(!buttonId)return;const theme=script.getAttribute('data-theme')||'light';const container=document.createElement('div');container.className='nice-embed';container.style.cssText='display:inline-block;vertical-align:middle;';const iframe=document.createElement('iframe');iframe.src=EMBED_BASE+'/embed/'+buttonId+'?theme='+encodeURIComponent(theme);iframe.style.cssText='border:none;overflow:hidden;width:100px;height:36px;';iframe.setAttribute('scrolling','no');iframe.setAttribute('frameborder','0');iframe.setAttribute('allowtransparency','true');iframe.setAttribute('sandbox','allow-scripts allow-same-origin allow-popups');iframe.setAttribute('title','Nice button');container.appendChild(iframe);script.parentNode.insertBefore(container,script.nextSibling);window.addEventListener('message',function(event){if(event.origin!==EMBED_BASE)return;try{const data=event.data;if(data.type==='nice-resize'&&data.buttonId===buttonId){iframe.style.width=data.width+'px';iframe.style.height=data.height+'px'}}catch(e){}})}if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init)}else{init()}})();`;

// Embed HTML template
const EMBED_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nice</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:transparent;display:flex;align-items:center;justify-content:center;min-height:36px;padding:4px}
.nice-button{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:none;border-radius:18px;font-size:14px;font-weight:500;cursor:pointer;transition:all .15s ease;user-select:none;-webkit-tap-highlight-color:transparent}
.nice-button:hover{transform:scale(1.02)}
.nice-button:active{transform:scale(.98)}
.theme-light .nice-button{background:#f3f4f6;color:#374151}
.theme-light .nice-button:hover{background:#e5e7eb}
.theme-light .nice-button.niced{background:#fef3c7;color:#92400e}
.theme-dark .nice-button{background:#374151;color:#f3f4f6}
.theme-dark .nice-button:hover{background:#4b5563}
.theme-dark .nice-button.niced{background:#78350f;color:#fef3c7}
.theme-minimal .nice-button{background:transparent;color:inherit;border:1px solid currentColor;opacity:.7}
.theme-minimal .nice-button:hover{opacity:1}
.theme-minimal .nice-button.niced{opacity:1;border-color:#f59e0b;color:#f59e0b}
.nice-icon{width:16px;height:16px;flex-shrink:0}
.nice-icon svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.niced .nice-icon svg{fill:currentColor}
.nice-count{font-variant-numeric:tabular-nums}
@keyframes pulse{0%{transform:scale(1)}50%{transform:scale(1.15)}100%{transform:scale(1)}}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
.nice-button.animating{animation:pulse .3s ease}
.nice-button.shake{animation:shake .3s ease}
.nice-button.disabled{opacity:.5;cursor:not-allowed}
.nice-button.disabled:hover{transform:none}
</style>
</head>
<body class="theme-{{THEME}}">
<button class="nice-button" id="niceBtn">
<span class="nice-icon"><svg viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg></span>
<span class="nice-count" id="niceCount">0</span>
</button>
<script>
(function(){'use strict';
const API_BASE='{{API_BASE}}';
const BUTTON_ID='{{BUTTON_ID}}';
const btn=document.getElementById('niceBtn');
const countEl=document.getElementById('niceCount');
let count=0,hasNiced=false,isLoading=false;
function formatCount(n){
if(n>=1e9)return(n/1e9).toFixed(1).replace(/\\.0$/,'')+'B';
if(n>=1e6)return(n/1e6).toFixed(1).replace(/\\.0$/,'')+'M';
if(n>=1e3)return(n/1e3).toFixed(1).replace(/\\.0$/,'')+'K';
return n.toString();
}
function updateDisplay(){
countEl.textContent=formatCount(count);
if(hasNiced)btn.classList.add('niced');
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
if(res.ok){count=data.count;if(!data.success&&data.reason==='already_niced')hasNiced=true;}
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
  
  // Validate theme
  const validThemes = ["light", "dark", "minimal"];
  const safeTheme = validThemes.includes(theme) ? theme : "light";

  // Get the API base URL from the request
  const apiBase = `${url.protocol}//${url.host}`;

  // Replace placeholders in HTML
  const html = EMBED_HTML
    .replace(/\{\{API_BASE\}\}/g, apiBase)
    .replace(/\{\{BUTTON_ID\}\}/g, buttonId)
    .replace(/\{\{THEME\}\}/g, safeTheme);

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
