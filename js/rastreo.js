function trackOrder() {
    const idInput = document.getElementById('order-id').value.trim();
    const resultDiv = document.getElementById('result');
    
    if (!idInput) return alert("Por favor ingresa un número de pedido.");

    const orders = JSON.parse(localStorage.getItem('lvs_orders')) || [];
    // Buscamos el pedido (convertimos a string para comparar por si acaso)
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