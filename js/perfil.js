document.addEventListener('DOMContentLoaded', async () => {
    // --- ESTILOS PARA LA NUEVA BARRA DE PROGRESO DE PEDIDOS ---
    const style = document.createElement('style');
    style.innerHTML = `
        .order-tracker {
            display: flex;
            list-style-type: none;
            padding: 0;
            margin: 1.5rem 0 0.5rem 0;
            justify-content: space-between;
            font-size: 0.8rem;
        }
        .order-tracker li {
            flex: 1;
            text-align: center;
            position: relative;
            color: #9ca3af; /* gray-400 */
            font-weight: 500;
            transition: color 0.3s ease;
        }
        .order-tracker li::before { /* La línea de conexión */
            content: '';
            position: absolute;
            top: 12px; /* Alineado al centro del círculo */
            left: -50%;
            width: 100%;
            height: 3px;
            background-color: #e5e7eb; /* gray-200 */
            z-index: 0;
            transition: background-color 0.3s ease;
        }
        .order-tracker li:first-child::before {
            content: none;
        }
        .order-tracker li span {
            display: block;
            margin-top: 0.75rem;
        }
        .order-tracker li.active, .order-tracker li.completed {
            color: #111827; /* gray-900 */
        }
        .order-tracker li::after { /* El círculo */
            content: '';
            position: relative;
            z-index: 1;
            display: block;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background-color: #e5e7eb; /* gray-200 */
            margin: 0 auto;
            transition: background-color 0.3s ease, border-color 0.3s ease;
            border: 3px solid #e5e7eb;
            box-sizing: border-box;
        }
        .order-tracker li.completed::after {
            content: '✓';
            background-color: #10b981; /* emerald-500 */
            border-color: #10b981;
            color: white;
            font-weight: bold;
            line-height: 19px; /* Alinea el checkmark */
        }
        .order-tracker li.active::after {
            background-color: white;
            border-color: #3b82f6; /* blue-500 */
        }
        .order-tracker li.completed::before {
            background-color: #10b981; /* emerald-500 */
        }
    `;
    document.head.appendChild(style);

    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        const user = data.user;

        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        // Renderizar tarjeta de perfil
        document.getElementById('profile-card').innerHTML = `
            <div class="profile-pic"><img src="${user.picture}" alt="Foto de perfil"></div>
            <div class="profile-info">
                <h2>${user.name}</h2>
                <p>${user.email}</p>
            </div>
        `;

        // Renderizar historial de pedidos
        // CORRECCIÓN: Pedimos los pedidos a la API en lugar de localStorage
        const ordersResponse = await fetch('/api/orders');
        const allOrders = await ordersResponse.json();
        const myOrders = allOrders.filter(order => order.customer && order.customer.email === user.email);
        const historyContainer = document.getElementById('order-history');

        if (myOrders.length === 0) {
            historyContainer.innerHTML = '<p>Aún no has realizado ningún pedido.</p>';
            return;
        }

        historyContainer.innerHTML = myOrders.map(order => {
            return `
            <div class="order-card" style="background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e5e7eb;">
                <div class="order-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">
                    <div>
                        <span style="font-size: 0.8rem; color: #6b7280; display: block;">Nº de Pedido</span>
                        <strong style="font-size: 1.1rem; color: #1f2937;">${order.id}</strong>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 0.8rem; color: #6b7280; display: block;">Fecha</span>
                        <strong style="font-size: 1rem; color: #374151;">${order.date}</strong>
                    </div>
                </div>
                
                ${getOrderStatusTracker(order.status)}

                <div class="order-details" style="border-top: 1px solid #e5e7eb; padding-top: 1.5rem; margin-top: 1.5rem;">
                    <strong style="display: block; margin-bottom: 1rem; color: #374151;">Resumen del pedido</strong>
                    <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 0.75rem;">
                        ${order.items.map(item => `
                            <li style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem;">
                                <span style="color: #4b5563;">${item.quantity}x ${item.name}</span>
                                <span style="font-weight: 500; color: #1f2937;">$${(item.price * item.quantity).toFixed(2)}</span>
                            </li>
                        `).join('')}
                    </ul>
                    <div style="border-top: 1px dashed #d1d5db; margin-top: 1rem; padding-top: 1rem; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 1rem; font-weight: 600; color: #374151;">Total Pagado</span>
                        <span style="font-size: 1.25rem; font-weight: 700; color: #111827;">$${order.total.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `}).reverse().join('');

    } catch (error) {
        console.error('Error al cargar el perfil:', error);
        document.body.innerHTML = '<p>No se pudo cargar la información del perfil. Intenta de nuevo.</p>';
    }
});

// Helper function para crear la barra de progreso del estado del pedido
function getOrderStatusTracker(currentStatus) {
    const statuses = ['En progreso', 'Aceptado', 'Enviado', 'Entregado'];
    const normalizedStatus = currentStatus === 'Pendiente' ? 'En progreso' : currentStatus;
    const currentIndex = statuses.indexOf(normalizedStatus);

    const items = statuses.map((status, index) => {
        let className = '';
        if (index < currentIndex) {
            className = 'completed';
        } else if (index === currentIndex) {
            className = 'active';
        }
        return `<li class="${className}"><span>${status}</span></li>`;
    }).join('');

    return `<ol class="order-tracker">${items}</ol>`;
}