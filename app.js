// Configuració - CANVIA AQUÍ AMB LA TEVA URL!
const GAS_URL = 'https://script.google.com/macros/s/AKfycby6nTKSzHFZMgcpZFTNvf8_SFkUZJBcxjEb-KCj-8HCz6QwQxdCsVNfa2sUPr_fTijt/exec';

// Carregar reserves en carregar la pàgina
document.addEventListener('DOMContentLoaded', function() {
    carregarReserves();
    
    // Configurar formulari
    document.getElementById('reservaForm').addEventListener('submit', afegirReserva);
});

// Funció per carregar reserves des de Google Sheets
async function carregarReserves() {
    const reservesList = document.getElementById('reservesList');
    reservesList.innerHTML = '<p class="loading">⏳ Carregant reserves...</p>';
    
    try {
        const response = await fetch(GAS_URL);
        const result = await response.json();
        
        if (result.success) {
            mostrarReserves(result.data);
        } else {
            reservesList.innerHTML = `<p class="error">❌ Error: ${result.error}</p>`;
        }
    } catch (error) {
        reservesList.innerHTML = `<p class="error">❌ Error de connexió: ${error.message}</p>`;
    }
}

// Funció per mostrar reserves a la pàgina
function mostrarReserves(dades) {
    const reservesList = document.getElementById('reservesList');
    
    if (!dades || dades.length <= 1) {
        reservesList.innerHTML = '<p>📭 No hi ha reserves encara.</p>';
        return;
    }
    
    // Saltar la primera fila (capçaleres)
    const reserves = dades.slice(1);
    
    let html = '';
    reserves.forEach((reserva, index) => {
        const [timestamp, entrada, sortida, nom, telefon, estat, pagament] = reserva;
        
        html += `
            <div class="reserva-item">
                <div class="reserva-header">
                    <span class="reserva-nom">${nom}</span>
                    <span class="reserva-estat estat-pendent">${estat}</span>
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
            </div>
        `;
    });
    
    reservesList.innerHTML = html;
}

// Funció per afegir una nova reserva
async function afegirReserva(event) {
    event.preventDefault();
    
    const form = event.target;
    const button = form.querySelector('button[type="submit"]');
    const originalText = button.textContent;
    
    // Desactivar botó mentre es processa
    button.disabled = true;
    button.textContent = 'Afegint...';
    
    const novaReserva = {
        dataEntrada: document.getElementById('dataEntrada').value,
        dataSortida: document.getElementById('dataSortida').value,
        nom: document.getElementById('nom').value,
        telefon: document.getElementById('telefon').value
    };
    
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify(novaReserva)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Netejar formulari
            form.reset();
            
            // Mostrar missatge d'èxit
            const reservesList = document.getElementById('reservesList');
            reservesList.innerHTML = `<p class="success">✅ ${result.message}</p>` + reservesList.innerHTML;
            
            // Actualitzar llista
            setTimeout(() => carregarReserves(), 1000);
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        alert(`Error de connexió: ${error.message}`);
    } finally {
        // Reactivar botó
        button.disabled = false;
        button.textContent = originalText;
    }
}
