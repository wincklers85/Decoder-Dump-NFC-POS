'use strict';

const $ = id => document.getElementById(id);
const examples = {
  '31.50':'23 00 41 01 00 6E 0C 13 00 01 00 2C 01 9B A0 14 03 00 00',
  '1.10':'23 00 15 00 41 01 00 6E 00 13 00 01 00 01 00 9B A0 00 00 00 00',
  '13.85':'1E0031010100D90315A12A0E00039001CF0000000000000000000000000000'
};
const nfcTemplate='1E0031010100E80315A12A0E00039001CF0000000000000000000000000000';
let lastRawText='';

function toHex(v){return v.toString(16).toUpperCase().padStart(2,'0')}
function findPattern(bytes,pattern){for(let i=0;i<=bytes.length-pattern.length;i++){let ok=true;for(let j=0;j<pattern.length;j++)if(bytes[i+j]!==pattern[j]){ok=false;break}if(ok)return i}return -1}
function euro(n){return n.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'}
function normalizeHex(raw){return raw.replace(/0x|,|;|\s|-/gi,'').toUpperCase()}
function bytesFromHex(hex){const a=[];for(let i=0;i<hex.length;i+=2)a.push(parseInt(hex.slice(i,i+2),16));return a}
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.remove('hidden');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.add('hidden'),1400)}
async function copyText(text){try{await navigator.clipboard.writeText(text);toast('Copiato negli appunti')}catch{const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();toast('Copiato negli appunti')}}
async function pasteText(){try{const txt=await navigator.clipboard.readText();$('hexInput').value=txt;toast('Incollato dagli appunti')}catch{$('hexInput').focus();toast('Tieni premuto nel campo e scegli Incolla')}}
function showError(msg){$('errorBox').textContent=msg;$('errorBox').classList.remove('hidden');$('resultsSection').classList.add('hidden')}
function clearError(){$('errorBox').classList.add('hidden')}

function parseDump(bytes){
  const result={type:'Sconosciuto',amounts:[],creditPrev:null,reparto:null,length:bytes.length,explanations:[]};
  if(bytes[0]===0x1E&&bytes[1]===0&&bytes[2]===0x31&&bytes[3]===1){
    result.type='NFC Mifare Settore 1';
    if(bytes.length>=8){const c=bytes[6]|(bytes[7]<<8);result.amounts.push({label:'Importo Carta',cents:c,euros:c/100,offset:6,bytes:[bytes[6],bytes[7]]});result.explanations.push({title:'Importo Carta NFC',desc:`Byte 6–7: <span class="byte">${toHex(bytes[6])} ${toHex(bytes[7])}</span>`,calc:`Little-endian: ${toHex(bytes[7])}${toHex(bytes[6])} = ${c} centesimi = ${euro(c/100)}`})}
    if(bytes.length>=10){const c=bytes[8]|(bytes[9]<<8);if(c>0&&c<100000)result.amounts.push({label:'Valore Blocco 2',cents:c,euros:c/100,offset:8,bytes:[bytes[8],bytes[9]]})}
    if(bytes.length>=16){const c=bytes[14]|(bytes[15]<<8);if(c>0&&c<100000){result.creditPrev=c;result.explanations.push({title:'Credito precedente',desc:`Byte 14–15: <span class="byte">${toHex(bytes[14])} ${toHex(bytes[15])}</span>`,calc:`${c} centesimi = ${euro(c/100)}`})}}
    return result;
  }
  if(bytes[0]===0x23&&bytes[1]===0){
    result.type='Seriale POS';
    const i=findPattern(bytes,[0x41,0x01,0x00]);
    if(i!==-1&&i+4<bytes.length){const c=bytes[i+3]|(bytes[i+4]<<8);result.amounts.push({label:'Importo Corrente',cents:c,euros:c/100,offset:i+3,bytes:[bytes[i+3],bytes[i+4]]});result.explanations.push({title:'Importo corrente POS',desc:`Dopo 41 01 00: <span class="byte">${toHex(bytes[i+3])} ${toHex(bytes[i+4])}</span>`,calc:`Little-endian: ${toHex(bytes[i+4])}${toHex(bytes[i+3])} = ${c} centesimi = ${euro(c/100)}`})}
    const p=findPattern(bytes,[0x9B,0xA0]);
    if(p!==-1&&p+3<bytes.length){const c=bytes[p+2]|(bytes[p+3]<<8);result.creditPrev=c;result.amounts.push({label:'Credito Precedente',cents:c,euros:c/100,offset:p+2,bytes:[bytes[p+2],bytes[p+3]]});result.explanations.push({title:'Credito precedente POS',desc:`Dopo 9B A0: <span class="byte">${toHex(bytes[p+2])} ${toHex(bytes[p+3])}</span>`,calc:`${c} centesimi = ${euro(c/100)}`})}
    const r=findPattern(bytes,[0x13,0x00,0x01,0x00]);if(r!==-1&&r+4<bytes.length)result.reparto=bytes[r+4];
    return result;
  }
  result.error='Formato non riconosciuto. Supportati: Seriale POS (23 00…) e NFC Mifare (1E 00 31 01…).';return result;
}

function decodeDump(){
  clearError();const raw=$('hexInput').value.trim();if(!raw)return showError('Inserisci un dump esadecimale.');
  const clean=normalizeHex(raw);if(!/^[0-9A-F]+$/.test(clean))return showError('Il dump contiene caratteri non esadecimali.');if(clean.length%2)return showError('Lunghezza HEX dispari: ogni byte deve avere 2 caratteri.');
  const bytes=bytesFromHex(clean);if(bytes.length<8)return showError('Dump troppo corto.');const result=parseDump(bytes);if(result.error)return showError(result.error);lastRawText=bytes.map(toHex).join(' ');displayResults(result,bytes);
}

function displayResults(result,bytes){
  $('resultsSection').classList.remove('hidden');$('dumpType').textContent=result.type;$('dumpLength').textContent=result.length+' byte';
  const sel=$('creditSelect');sel.innerHTML='';if(result.amounts.length){result.amounts.forEach((a,i)=>{const o=document.createElement('option');o.value=i;o.textContent=`${a.label}: ${euro(a.euros)}`;sel.appendChild(o)});$('creditSelector').classList.remove('hidden');sel.onchange=()=>updateTable(result,+sel.value)}else $('creditSelector').classList.add('hidden');
  updateTable(result,0);$('explainer').innerHTML=result.explanations.map(x=>`<div class="explain-item"><strong>${x.title}</strong><div>${x.desc}</div><div class="mono" style="margin-top:6px;color:#94a3b8;font-size:12px">${x.calc}</div></div>`).join('');
  const hi=new Set();result.amounts.forEach(a=>{hi.add(a.offset);hi.add(a.offset+1)});let html='';bytes.forEach((b,i)=>{if(i&&i%16===0)html+='\n';else if(i)html+=' ';html+=hi.has(i)?`<span class="byte">${toHex(b)}</span>`:toHex(b)});$('rawDump').innerHTML=html;
}

function updateTable(result,idx){const el=$('resultsTable');if(!result.amounts.length){el.innerHTML='<div class="result-row"><span>Nessun importo trovato</span></div>';return}const s=result.amounts[idx];const rows=[['Importo selezionato',`<strong class="green">${euro(s.euros)}</strong><small>${s.cents} centesimi</small>`],['Byte raw',`<strong class="mono">${toHex(s.bytes[0])} ${toHex(s.bytes[1])}</strong><small>offset ${s.offset}–${s.offset+1}</small>`]];if(result.creditPrev!==null&&result.creditPrev!==s.cents){rows.push(['Credito precedente',`<strong class="blue">${euro(result.creditPrev/100)}</strong>`]);rows.push(['Differenza',`<strong class="amber">${euro((s.cents-result.creditPrev)/100)}</strong>`])}if(result.reparto!==null)rows.push(['Reparto',`<strong>${result.reparto}</strong><small>${toHex(result.reparto)} hex</small>`]);rows.push(['Tipo dump',`<strong>${result.type}</strong>`]);el.innerHTML=rows.map(r=>`<div class="result-row"><span>${r[0]}</span><div class="result-value">${r[1]}</div></div>`).join('')}

function generateValue(){
  $('generatorError').classList.add('hidden');const txt=$('manualAmount').value.trim().replace(',','.');const val=Number(txt);if(!Number.isFinite(val)||val<0){$('generatorError').textContent='Inserisci un importo valido.';$('generatorError').classList.remove('hidden');return}const cents=Math.round(val*100);if(cents>65535){$('generatorError').textContent='Massimo 655,35 € con 2 byte unsigned.';$('generatorError').classList.remove('hidden');return}const lo=cents&255,hi=(cents>>8)&255,bytes=`${toHex(lo)} ${toHex(hi)}`;$('genEuros').textContent=euro(cents/100);$('genCents').textContent=String(cents);$('genBytes').textContent=bytes;$('generatedBytes').textContent=bytes;const clean=normalizeHex(nfcTemplate),arr=bytesFromHex(clean);arr[6]=lo;arr[7]=hi;$('generatedDump').textContent=arr.map(toHex).join(' ');
}

document.addEventListener('DOMContentLoaded',()=>{
  $('decodeBtn').onclick=decodeDump;$('pasteBtn').onclick=pasteText;$('copyInputBtn').onclick=()=>copyText($('hexInput').value);$('clearBtn').onclick=()=>{$('hexInput').value='';$('resultsSection').classList.add('hidden');clearError()};$('copyRawBtn').onclick=()=>copyText(lastRawText);$('generateAmountBtn').onclick=generateValue;$('copyBytesBtn').onclick=()=>copyText($('generatedBytes').textContent);$('copyGeneratedDumpBtn').onclick=()=>copyText($('generatedDump').textContent);
  document.querySelectorAll('[data-example]').forEach(b=>b.onclick=()=>{$('hexInput').value=examples[b.dataset.example];decodeDump()});
  document.querySelectorAll('.quick').forEach(b=>b.onclick=()=>{document.querySelectorAll('.quick').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('manualAmount').value=Number(b.dataset.value).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});generateValue()});
  $('manualAmount').addEventListener('keydown',e=>{if(e.key==='Enter')generateValue()});generateValue();
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
});
