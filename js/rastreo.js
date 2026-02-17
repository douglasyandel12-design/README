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
        const status = order.status || 'Pendiente';
        
        // Lógica para la barra de progreso
        const steps = ['Pendiente', 'Aceptado', 'Enviado', 'Entregado'];
        let currentStepIndex = steps.indexOf(status);
        if (currentStepIndex === -1) currentStepIndex = 0;

        let stepperHtml = '<div class="stepper-wrapper">';
        steps.forEach((step, index) => {
            let className = 'stepper-item';
            if (index < currentStepIndex) className += ' completed';
            if (index === currentStepIndex) className += ' active';
            
            stepperHtml += `
                <div class="${className}">
                    <div class="step-counter">${index + 1}</div>
                    <div class="step-name">${step}</div>
                </div>
            `;
        });
        stepperHtml += '</div>';

        let badgeClass = 'status-pendiente';
        if (status === 'Aceptado') badgeClass = 'status-aceptado';
        if (status === 'Enviado') badgeClass = 'status-enviado';
        if (status === 'Entregado') badgeClass = 'status-entregado';

        document.getElementById('status-display').innerHTML = `
            <div style="text-align:center; margin-bottom:1rem;"><span class="status-badge ${badgeClass}" style="font-size:1.1rem;">${status}</span></div>
            ${stepperHtml}
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