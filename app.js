// Configuració
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwDZoiG0lEuMHakCGP3O3QzrVMmM1xP4nYB66ziMsLKK1G2aGT4R4u9HesaOQEyb1eg/exec';

// Carregar reserves en carregar la pàgina
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicialitzant aplicació...');
    carregarReserves();
    
    // Configurar formulari
    document.getElementById('reservaForm').addEventListener('submit', afegirReserva);
});

// Funció JSONP per carregar reserves (sense CORS)
function carregarReserves() {
    const reservesList = document.getElementById('reservesList');
    reservesList.innerHTML = '<p class="loading">⏳ Carregant reserves...</p>';
    
    console.log('📡 Carregant reserves via JSONP...');
    
    // Crear script tag per JSONP
    const callbackName = 'jsonpCallback_' + new Date().getTime();
    const script = document.createElement('script');
    
    // Configurar la funció de callback global
    window[callbackName] = function(data) {
        // Netejar el script tag
        document.head.removeChild(script);
        delete window[callbackName];
        
        console.log('📊 Dades rebudes via JSONP:', data);
        
        if (data.success) {
            mostrarReserves(data.data);
        } else {
            reservesList.innerHTML = `<div class="error">❌ Error: ${data.error}</div>`;
        }
    };
    
    // Afegir timeout per si falla
    setTimeout(() => {
        if (window[callbackName]) {
            document.head.removeChild(script);
            delete window[callbackName];
            reservesList.innerHTML = '<div class="error">❌ Timeout carregant reserves</div>';
        }
    }, 10000);
    
    // Configurar i afegir el script tag
    script.src = `${GAS_URL}?callback=${callbackName}&action=getReserves`;
    script.onerror = function() {
        document.head.removeChild(script);
        delete window[callbackName];
        reservesList.innerHTML = '<div class="error">❌ Error de connexió</div>';
    };
    
    document.head.appendChild(script);
}

// Funció per verificar disponibilitat abans de reservar
async function verificarDisponibilitat(dataEntrada, dataSortida) {
  return new Promise((resolve) => {
    const callbackName = 'disponibilitatCallback_' + new Date().getTime();
    const script = document.createElement('script');
    
    window[callbackName] = function(data) {
      document.head.removeChild(script);
      delete window[callbackName];
      resolve(data);
    };
    
    script.src = `${GAS_URL}?callback=${callbackName}&action=verificarDisponibilitat&dataEntrada=${dataEntrada}&dataSortida=${dataSortida}`;
    script.onerror = function() {
      document.head.removeChild(script);
      delete window[callbackName];
      resolve({ success: false, error: 'Error de connexió' });
    };
    
    document.head.appendChild(script);
  });
}

// Funció per mostrar reserves (AMB COLORS D'ESTAT)
function mostrarReserves(dades) {
    const reservesList = document.getElementById('reservesList');
    
    if (!dades || dades.length <= 1) {
        reservesList.innerHTML = '<p>📭 No hi ha reserves encara.</p>';
        return;
    }
    
    const reserves = dades.slice(1);
    let html = '';
    
    reserves.forEach((reserva, index) => {
        const [timestamp, entrada, sortida, nom, telefon, estat, pagament] = reserva;
        
        // Determinar la classe CSS segons l'estat
        let classeEstat = 'estat-pendent';
        if (estat === 'Confirmat') classeEstat = 'estat-confirmat';
        if (estat === 'Ocupat') classeEstat = 'estat-ocupat';
        if (estat === 'Completat') classeEstat = 'estat-completat';
        if (estat === 'Cancelat') classeEstat = 'estat-cancelat';
        
        html += `
            <div class="reserva-item">
                <div class="reserva-header">
                    <span class="reserva-nom">${nom}</span>
                    <span class="${classeEstat}">${estat}</span>
                </div>
                <div class="reserva-dates">
                    📅 ${entrada} → ${sortida}
                </div>
                <div class="reserva-telefon">
                    📞 ${telefon || 'No especificat'}
                </div>
                <div class="reserva-pagament">
                    💰 Pagament: ${pagament}
                </div>
                <div class="reserva-timestamp">
                    ⏰ Registre: ${new Date(timestamp).toLocaleString('ca-ES')}
                </div>
            </div>
        `;
    });
    
    reservesList.innerHTML = html;
}

// Funció per afegir reserves (AMB VERIFICACIÓ DE DISPONIBILITAT)
async function afegirReserva(event) {
  event.preventDefault();
  
  const form = event.target;
  const button = form.querySelector('button[type="submit"]');
  const originalText = button.textContent;
  
  button.disabled = true;
  button.textContent = 'Verificant...';
  
  const novaReserva = {
    dataEntrada: document.getElementById('dataEntrada').value,
    dataSortida: document.getElementById('dataSortida').value,
    nom: document.getElementById('nom').value,
    telefon: document.getElementById('telefon').value
  };
  
  console.log('📤 Verificant disponibilitat...', novaReserva);
  
  try {
    // PRIMER: Verificar disponibilitat
    const resultatDisponibilitat = await verificarDisponibilitat(novaReserva.dataEntrada, novaReserva.dataSortida);
    
    if (!resultatDisponibilitat.success) {
      throw new Error('Error verificant disponibilitat: ' + resultatDisponibilitat.error);
    }
    
    if (!resultatDisponibilitat.disponible) {
      throw new Error(resultatDisponibilitat.message);
    }
    
    button.textContent = 'Afegint...';
    
    // SEGON: Si està disponible, fer la reserva
    const response = await fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(novaReserva)
    });
    
    console.log('✅ Reserva enviada (mode no-cors)');
    
    // Netejar formulari
    form.reset();
    
    // Mostrar missatge d'èxit
    const reservesList = document.getElementById('reservesList');
    reservesList.innerHTML = `<p class="success">✅ Reserva afegida correctament (estat: Pendent)</p>` + reservesList.innerHTML;
    
    // Actualitzar llista després d'un moment
    setTimeout(() => carregarReserves(), 2000);
    
  } catch (error) {
    console.error('❌ Error:', error);
    alert(error.message);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

// Mètode alternatiu per afegir reserves (formulari hidden)
function afegirReservaAlternatiu(dades) {
    return new Promise((resolve, reject) => {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = GAS_URL;
        form.style.display = 'none';
        
        // Afegir camps com a inputs hidden
        const input = document.createElement('input');
        input.name = 'postData';
        input.value = JSON.stringify(dades);
        form.appendChild(input);
        
        // Afegir al document i enviar
        document.body.appendChild(form);
        
        // Crear iframe per rebre la resposta
        const iframe = document.createElement('iframe');
        iframe.name = 'hiddenIframe';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        form.target = 'hiddenIframe';
        
        // Configurar timeout
        const timeout = setTimeout(() => {
            document.body.removeChild(form);
            document.body.removeChild(iframe);
            reject(new Error('Timeout'));
        }, 10000);
        
        // Esperar que es carregui l'iframe (resposta)
        iframe.onload = function() {
            clearTimeout(timeout);
            document.body.removeChild(form);
            document.body.removeChild(iframe);
            resolve();
        };
        
        form.submit();
    });
}
