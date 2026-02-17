// Al cargar la página, verificamos URL y Sesión
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Auto-rellenar y buscar si viene el ID en la URL (ej: rastreo.html?id=ORD-123)
    const urlParams = new URLSearchParams(window.location.search);
    const orderIdParam = urlParams.get('id');
    
    if (orderIdParam) {
        document.getElementById('order-id').value = orderIdParam;
        trackOrder(); // Ejecutar búsqueda automáticamente
    }

    // 2. Verificar sesión para mostrar advertencia
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        
        // Si NO hay usuario (data.user es null), mostramos el mensaje
        if (!data.user) {
            const container = document.querySelector('.container') || document.body;
            const warningMsg = document.createElement('div');
            warningMsg.style.cssText = "background-color: #fff3cd; color: #856404; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid #ffeeba; text-align: center;";
            warningMsg.innerHTML = `
                <strong>⚠️ Aviso para invitados:</strong> 
                Como no has iniciado sesión, solo podrás visualizar el progreso de tu pedido en este dispositivo. 
                <br><small>Guarda tu número de pedido en un lugar seguro.</small>
            `;
            // Insertar al principio del contenedor (antes del input de rastreo)
            container.insertBefore(warningMsg, container.firstChild);
        }
    } catch (e) {
        console.error("Error verificando sesión en rastreo", e);
    }
});

async function trackOrder() {
    const idInput = document.getElementById('order-id').value.trim();
    const resultDiv = document.getElementById('result');
    
    if (!idInput) return alert("Por favor ingresa un número de pedido.");

    // CAMBIO: Buscar en la base de datos en lugar de localStorage
    const response = await fetch('/api/orders');
    const orders = await response.json();
    const order = orders.find(o => o.id.toString() === idInput);

    if (order) {
        resultDiv.style.display = 'block';
        
        // Configurar badge de estado
        const status = order.status || 'En progreso';
        
        let badgeClass = 'status-en-progreso';
        let statusText = status;
        
        // Si es pendiente o en progreso, usamos el mismo estilo visual
        if (status === 'Pendiente' || status === 'En progreso') {
            badgeClass = 'status-pendiente'; // Reusamos clase o creamos nueva
            statusText = 'En progreso';
        }
        if (status === 'Entregado') badgeClass = 'status-entregado';

        document.getElementById('status-display').innerHTML = `
            <div style="text-align:center; margin-bottom:1rem;">
                <span class="status-badge ${badgeClass}" style="font-size:1.5rem; padding: 0.5rem 1.5rem; border-radius: 50px; background-color: #3b82f6; color: white;">${statusText}</span>
            </div>
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 1rem; border-radius: 8px; text-align: center; margin-bottom: 1.5rem;">
                <p style="margin: 0; font-weight: 500;">📱 Esté atento a su WhatsApp y Email.</p>
                <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">Nos pondremos en contacto por WhatsApp para coordinar la entrega.</p>
            </div>
        `;

        document.getElementById('res-date').textContent = order.date;
        document.getElementById('res-name').textContent = order.customer.name;
        document.getElementById('res-total').textContent = '$' + order.total.toFixed(2);
        
        const itemsList = document.getElementById('res-items');
        itemsList.innerHTML = order.items.map(item => `
            <li>${item.quantity}x ${item.name}</li>
        `).join('');

    } else {
        resultDiv.style.display = 'none';
        alert("No encontramos un pedido con ese número. Verifica e intenta de nuevo.");
    }
}