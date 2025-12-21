// Servicio cliente para generar PDF de la boleta usando html2canvas + jsPDF cargados desde CDN
import { storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export async function loadScriptOnce(src) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export async function generateBoletaPDF(datosPago, meta = {}) {
  // Cargar librerías desde CDN si no están presentes
  if (!window.html2canvas) {
    await loadScriptOnce('https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js');
  }
  if (!window.jspdf) {
    await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  }

  const { jsPDF } = window.jspdf;

  // Crear elemento temporal con la plantilla HTML
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-9999px';
  wrapper.style.top = '0';
  wrapper.style.width = '360px';
  wrapper.innerHTML = generateHTMLBoleta(datosPago, meta);
  document.body.appendChild(wrapper);

  try {
    const canvas = await window.html2canvas(wrapper, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({ unit: 'pt', format: [wrapper.offsetWidth, wrapper.offsetHeight] });
    pdf.addImage(imgData, 'PNG', 0, 0, wrapper.offsetWidth, wrapper.offsetHeight);

    const blob = pdf.output('blob');
    return blob;
  } finally {
    // Clean up
    if (wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
  }
}

/**
 * Sube un Blob a Firebase Storage usando el SDK.
 * Esto evita problemas de CORS que ocurren con llamadas REST manuales.
 */
export async function uploadBlobToStorage(blob, path) {
  if (!storage) throw new Error('Firebase storage not initialized');
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  const url = await getDownloadURL(storageRef);
  return url;
}

function escapeHtml(str) {
  if (!str && str !== 0) return '';
  return String(str).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function money(n) { return `S/ ${Number(n||0).toFixed(2)}`; }

function generateHTMLBoleta(datosPago, meta) {
  const fecha = new Date(datosPago.fecha || Date.now());
  const fechaStr = fecha.toLocaleDateString('es-PE') + '  ' + fecha.toLocaleTimeString('es-PE');
  const customerName = escapeHtml(datosPago.cliente?.nombre || '-');
  const docNum = escapeHtml(datosPago.cliente?.docNumber || '-');
  const direccion = escapeHtml(datosPago.cliente?.direccion || '-');
  const serie = escapeHtml(meta.series || datosPago.series || '---');
  const number = escapeHtml(meta.number || datosPago.number || '---');

  // Items
  const items = datosPago.items || [];
  const itemsHtml = items.map(it => `
    <tr>
      <td style="width:40px; text-align:left">${escapeHtml(it.qty)}</td>
      <td style="padding-left:6px">${escapeHtml(it.plato || it.name || '')}</td>
      <td style="width:60px; text-align:right">${money(it.precio||it.unit||0)}</td>
      <td style="width:70px; text-align:right">${money(it.subtotal || (it.precio||0)*(it.qty||1))}</td>
    </tr>
  `).join('');

  // Pagos dinámicos (solo los usados)
  const pagos = datosPago.payments || [];
  const pagosHtml = pagos.map((p, idx) => {
    const ref = p.details?.reference ? `\n   Ref: ${escapeHtml(p.details.reference)}` : '';
    if ((p.amount || 0) <= 0) return '';
    return `
      <div style="margin-top:8px; font-size:11px;">
        <div style="font-weight:bold">${idx+1}. ${escapeHtml(p.method.toUpperCase())}</div>
        <div>   ${p.method.toUpperCase().includes('EFECTIVO')? 'Recibido: ' + money(p.received || p.amount) + '   |   Vuelto: ' + money(p.change || 0) : '   Monto: ' + money(p.amount)}${ref ? '<div style="font-size:10px; margin-top:4px;">' + escapeHtml(p.details?.label || '') + '<br/>' + escapeHtml(p.details?.reference || '') + '</div>' : ''}</div>
      </div>
    `;
  }).join('');

  // Convertir monto a letras (simple, para enteros y 2 decimales)
  function numberToWordsES(n) {
    const unidades = ['CERO','UNO','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE','DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISEIS','DIECISIETE','DIECIOCHO','DIECINUEVE','VEINTE'];
    const decenas = ['','DIEZ','VEINTE','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'];
    const centenas = ['','CIEN','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS','SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS'];
    n = Number(n);
    if (n <= 20) return unidades[n];
    if (n < 100) {
      const d = Math.floor(n/10);
      const u = n%10;
      if (d === 2 && u>0) return 'VEINTI' + numberToWordsES(u).toLowerCase();
      return decenas[d] + (u? ' Y ' + unidades[u]: '');
    }
    if (n < 1000) {
      const c = Math.floor(n/100);
      const rest = n%100;
      const cent = c===1 && rest>0 ? 'CIENTO' : centenas[c];
      return cent + (rest? ' ' + numberToWordsES(rest):'');
    }
    if (n < 1000000) {
      const miles = Math.floor(n/1000);
      const rest = n%1000;
      return (miles>1? numberToWordsES(miles) + ' MIL': 'MIL') + (rest? ' ' + numberToWordsES(rest):'');
    }
    return n.toString();
  }

  const total = Number(datosPago.totals?.grandTotal || 0);
  const entero = Math.floor(total);
  const cents = Math.round((total - entero) * 100);
  const enLetras = `${numberToWordsES(entero)} CON ${String(cents).padStart(2,'0')}/100 SOLES`;

  const html = `
    <div style="font-family: monospace; width:380px; padding:8px; background:#fff; color:#000; font-size:12px;">
      <div style="text-align:center; font-weight:bold; font-size:15px;">CHURRASQUERÍA "ESTRELLA"</div>
      <div style="text-align:center; font-size:11px;">RUC: 20601234567</div>
      <div style="text-align:center; font-size:11px;">AV. ALAMEDA - PTO. MALDONADO</div>
      <div style="text-align:center; font-size:11px; margin-bottom:6px;">Telf: 916884949</div>
      <div style="border-top:2px solid #000; border-bottom:2px solid #000; padding:6px 0; text-align:center; font-weight:bold;">BOLETA DE VENTA ELECTRÓNICA</div>
      <div style="text-align:center; margin:8px 0; font-weight:bold;">Serie: ${serie} - Nro: ${number}</div>
      <div style="border-top:1px dashed #000; margin:6px 0;"></div>

      <div style="font-size:11px; display:flex; justify-content:space-between;">
        <div>FECHA EMISIÓN : ${escapeHtml(fechaStr)}</div>
      </div>
      <div style="font-size:11px; display:flex; justify-content:space-between; margin-top:4px;">
        <div>CAJERO        : ${escapeHtml(meta.cajeroName || meta.cajeroId || '')}</div>
      </div>
      <div style="font-size:11px; margin-top:4px;">CLIENTE       : ${customerName}</div>
      <div style="font-size:11px;">DNI/RUC       : ${docNum}</div>
      <div style="font-size:11px;">DIRECCIÓN     : ${direccion}</div>

      <div style="border-top:1px solid #000; margin:6px 0;"></div>
      <table style="width:100%; border-collapse:collapse; font-size:11px;">
        <thead>
          <tr>
            <th style="text-align:left; width:40px">CANT.</th>
            <th style="text-align:left">DESCRIPCIÓN</th>
            <th style="text-align:right; width:60px">P.UNIT</th>
            <th style="text-align:right; width:70px">IMPORTE</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      <div style="border-top:1px solid #000; margin:6px 0;"></div>

      <div style="font-size:11px;">
        <div style="display:flex; justify-content:space-between;"><div>OP. GRAVADA</div><div style="text-align:right; width:120px">${money(datosPago.totals?.subtotal)}</div></div>
        <div style="display:flex; justify-content:space-between;"><div>I.G.V. (18%)</div><div style="text-align:right; width:120px">${money(datosPago.totals?.igv)}</div></div>
        <div style="display:flex; justify-content:space-between; font-weight:bold;"><div>IMPORTE TOTAL</div><div style="text-align:right; width:120px">${money(datosPago.totals?.grandTotal)}</div></div>
      </div>
      <div style="border-top:1px solid #000; margin:6px 0; text-align:left; font-weight:bold;">SON: ${enLetras}</div>

      <div style="border-top:1px solid #000; margin-top:8px; font-weight:bold; text-align:center;"> &gt;&gt;&gt; FORMAS DE PAGO &lt;&lt;&lt; </div>
      ${pagosHtml}

      <div style="border-top:1px dashed #000; margin-top:8px; padding-top:6px; text-align:center; font-size:11px;">
        Representación Impresa de la Boleta de<br/>Venta Electrónica. Consulte en:<br/>
        www.ChurrasqueriaEstrella.com
      </div>

      <div style="text-align:center; margin-top:8px; font-weight:bold;">¡Gracias por su preferencia!</div>
    </div>
  `;

  return html;
}
