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

        /* MEJORA: Nuevos estilos para el historial de pedidos */
        #order-history {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }
        .order-card {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            border: 1px solid #e5e7eb;
            transition: box-shadow 0.2s ease-in-out;
        }
        .order-card:hover {
            box-shadow: 0 8px 20px rgba(0,0,0,0.08);
        }
        .order-header {
            display: flex; justify-content: space-between; align-items: flex-start;
            flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;
            padding-bottom: 1rem; border-bottom: 1px solid #f3f4f6;
        }
        .order-id-label { font-size: 0.75rem; color: #6b7280; display: block; text-transform: uppercase; letter-spacing: 0.5px; }
        .order-id { font-size: 1.1rem; color: #1f2937; font-weight: 600; }
        .order-date { font-size: 0.9rem; color: #4b5563; font-weight: 500; align-self: center; }
        .order-body { margin-top: 1.5rem; }
        .order-item-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.75rem; }
        .order-item { display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem; }
        .item-name { color: #374151; }
        .item-price { font-weight: 500; color: #1f2937; }
        .order-total {
            border-top: 1px dashed #d1d5db; margin-top: 1.5rem; padding-top: 1.5rem;
            display: flex; justify-content: space-between; align-items: center;
            font-size: 1.1rem; font-weight: 600; color: #111827;
        }
        .order-total strong { font-size: 1.5rem; font-weight: 700; }

        /* MEJORA: Estilos para el estado vacío */
        .empty-state {
            text-align: center; padding: 3rem 1rem; background: #f9fafb;
            border-radius: 12px; border: 1px dashed #d1d5db;
        }
        .empty-state h3 { font-size: 1.5rem; color: #1f2937; margin-bottom: 0.5rem; }
        .empty-state p { color: #6b7280; margin-bottom: 1.5rem; }
        .btn-shop {
            display: inline-block; background: #000; color: #fff; padding: 12px 24px;
            border-radius: 8px; text-decoration: none; font-weight: 600; transition: background-color 0.2s;
        }
        .btn-shop:hover { background-color: #333; }
    `;
    document.head.appendChild(style);

    const historyContainer = document.getElementById('order-history');
    historyContainer.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem 0;">Cargando tu historial de pedidos...</p>';

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

        // MEJORA: Se pide al nuevo endpoint seguro que solo devuelve los pedidos del usuario actual.
        // Esto es más rápido y seguro que traer todos los pedidos y filtrarlos en el cliente.
        const ordersResponse = await fetch('/api/my-orders');
        if (!ordersResponse.ok) {
            if (ordersResponse.status === 401) {
                // Si el servidor dice que no estamos autorizados, es un error de sesión.
                window.location.href = 'login.html';
                return;
            }
            throw new Error('No se pudieron cargar los pedidos desde el servidor.');
        }
        const myOrders = await ordersResponse.json();

        if (myOrders.length === 0) {
            // MEJORA: "Estado vacío" más amigable y con una llamada a la acción.
            historyContainer.innerHTML = `
                <div class="empty-state">
                    <h3>Aún no has realizado ningún pedido</h3>
                    <p>¡Explora nuestros productos y encuentra algo que te encante!</p>
                    <a href="index.html" class="btn-shop">Ir a la Tienda</a>
                </div>
            `;
            return;
        }

        // MEJORA: Se rediseña la tarjeta de pedido para ser más clara y moderna.
        historyContainer.innerHTML = myOrders.map(order => {
            // MEJORA: Formateo de fecha más legible para el usuario.
            const formattedDate = new Date(order.date).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            return `
            <div class="order-card">
                <div class="order-header">
                    <div>
                        <span class="order-id-label">Pedido</span>
                        <strong class="order-id">${order.id}</strong>
                    </div>
                    <div class="order-date">${formattedDate}</div>
                </div>
                
                ${getOrderStatusTracker(order.status)}

                <div class="order-body">
                    <ul class="order-item-list">
                        ${order.items.map(item => `
                            <li class="order-item">
                                <span class="item-name">${item.quantity}x ${item.name}</span>
                                <span class="item-price">$${(item.price * item.quantity).toFixed(2)}</span>
                            </li>
                        `).join('')}
                    </ul>
                    <div class="order-total">
                        <span>Total</span>
                        <strong>$${order.total.toFixed(2)}</strong>
                    </div>
                </div>
            </div>
        `}).join('');

    } catch (error) {
        console.error('Error al cargar el perfil:', error);
        historyContainer.innerHTML = '<p style="text-align: center; color: #ef4444;">No se pudo cargar tu historial. Por favor, intenta recargar la página.</p>';
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