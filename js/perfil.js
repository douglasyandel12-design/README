document.addEventListener('DOMContentLoaded', async () => {
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

        historyContainer.innerHTML = myOrders.map(order => `
            <div class="order-card" style="background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #f3f4f6;">
                <div class="order-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 1rem; margin-bottom: 1rem; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <span style="font-size: 0.9rem; color: #6b7280; display: block;">Nº de Pedido</span>
                        <strong style="font-size: 1.1rem; color: #111;">${order.id}</strong>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 0.8rem; color: #6b7280;">${order.date}</span>
                        <div style="margin-top: 4px;">
                            <span class="order-status" style="background-color: ${order.status === 'Entregado' ? '#dcfce7' : '#dbeafe'}; color: ${order.status === 'Entregado' ? '#166534' : '#1e40af'}; padding: 4px 12px; border-radius: 9999px; font-size: 0.85rem; font-weight: 600;">${order.status === 'Pendiente' ? 'En progreso' : order.status}</span>
                        </div>
                    </div>
                </div>
                <ul class="order-items" style="list-style: none; padding: 0; margin: 0;">
                    ${order.items.map(item => `<li style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; color: #374151;"><span>${item.quantity}x ${item.name}</span> <span>$${(item.price * item.quantity).toFixed(2)}</span></li>`).join('')}
                </ul>
                <div style="border-top: 1px solid #eee; margin-top: 1rem; padding-top: 1rem; display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #6b7280; font-size: 0.9rem;">Total Pagado</span>
                    <span style="font-size: 1.25rem; font-weight: 700; color: #111;">$${order.total.toFixed(2)}</span>
                </div>
                <div style="margin-top: 1rem; background-color: #f8fafc; padding: 0.75rem; border-radius: 6px; font-size: 0.85rem; color: #64748b; text-align: center;">
                    🔔 Te contactaremos por WhatsApp para el seguimiento.
                </div>
            </div>
        `).reverse().join('');

    } catch (error) {
        console.error('Error al cargar el perfil:', error);
        document.body.innerHTML = '<p>No se pudo cargar la información del perfil. Intenta de nuevo.</p>';
    }
});