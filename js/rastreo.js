// Al cargar la página, verificamos URL y Sesión
document.addEventListener('DOMContentLoaded', async () => {
    const container = document.querySelector('.container') || document.body;
    
    // Reemplazamos la interfaz de búsqueda por el título y contenedor de la lista
    container.innerHTML = `
        <h2 style="text-align: center; margin-bottom: 1.5rem;">📦 Mis Pedidos</h2>
        <div id="orders-list-container" style="max-width: 600px; margin: 0 auto;">
            <p style="text-align: center; color: #666;">Cargando historial...</p>
        </div>
    `;
    
    const listContainer = document.getElementById('orders-list-container');

    try {
        // 1. Obtener usuario actual (si existe)
        const authRes = await fetch('/api/auth/status');
        const authData = await authRes.json();
        const currentUser = authData.user;

        // 2. Obtener todos los pedidos de la base de datos
        const ordersRes = await fetch('/api/orders');
        if (!ordersRes.ok) throw new Error('Error al conectar con el servidor');
        const allOrders = await ordersRes.json();

        let myOrders = [];

        if (currentUser) {
            // Si es usuario registrado: Filtramos por su email
            myOrders = allOrders.filter(o => o.customer && o.customer.email === currentUser.email);
        } else {
            // Si es INVITADO: Filtramos por los IDs guardados en el dispositivo (localStorage)
            const localIds = JSON.parse(localStorage.getItem('lvs_guest_orders')) || [];
            const guestEmail = localStorage.getItem('lvs_guest_email');
            
            myOrders = allOrders.filter(o => {
                // Coincidencia por ID guardado localmente
                const matchesId = localIds.includes(o.id) || localIds.includes(String(o.id));
                // Coincidencia por email (si el invitado guardó su correo)
                const matchesEmail = guestEmail && o.customer && o.customer.email === guestEmail;
                return matchesId || matchesEmail;
            });
        }

        // 3. Renderizar la lista
        if (myOrders.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                    <p style="color: #4b5563; margin-bottom: 1rem;">No se encontraron pedidos en este dispositivo.</p>
                    <a href="index.html" class="btn" style="text-decoration: none; display: inline-block;">Ir a la tienda</a>
                </div>
            `;
            return;
        }

        // Ordenar: Más recientes primero
        myOrders.sort((a, b) => new Date(b.date) - new Date(a.date));

        listContainer.innerHTML = myOrders.map(order => {
            // Determinar color del estado
            let statusColor = '#3b82f6'; // Azul (En progreso)
            if (order.status === 'Entregado') statusColor = '#10b981'; // Verde
            if (order.status === 'Cancelado') statusColor = '#ef4444'; // Rojo

            return `
                <div class="order-card" style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid #f3f4f6;">
                        <div>
                            <span style="font-weight: 700; color: #111827; font-size: 1.1rem;">${order.id}</span>
                            <div style="font-size: 0.8rem; color: #6b7280; margin-top: 2px;">${order.date}</div>
                        </div>
                        <span style="background-color: ${statusColor}; color: white; padding: 4px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">
                            ${order.status || 'En progreso'}
                        </span>
                    </div>
                    
                    <div style="margin-bottom: 1rem;">
                        <ul style="list-style: none; padding: 0; margin: 0;">
                            ${order.items.map(item => `
                                <li style="display: flex; justify-content: space-between; font-size: 0.95rem; color: #374151; margin-bottom: 4px;">
                                    <span>${item.quantity}x ${item.name}</span>
                                    <span style="font-weight: 500;">$${(item.price * item.quantity).toFixed(2)}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.75rem; border-top: 1px dashed #d1d5db;">
                        <span style="font-size: 0.9rem; color: #4b5563;">Total</span>
                        <span style="font-size: 1.2rem; font-weight: 800; color: #111827;">$${order.total.toFixed(2)}</span>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Error cargando lista de pedidos:", error);
        listContainer.innerHTML = `
            <div style="text-align: center; color: #ef4444; padding: 1rem;">
                <p>Ocurrió un error al cargar la información.</p>
                <button onclick="location.reload()" style="margin-top: 0.5rem; padding: 4px 8px; cursor: pointer;">Reintentar</button>
            </div>
        `;
    }
});