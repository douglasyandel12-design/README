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
            <div class="order-card">
                <div class="order-header">
                    <div><strong>Pedido:</strong> ${order.id}</div>
                    <div><strong>Fecha:</strong> ${order.date}</div>
                    <div class="order-status status-${order.status}">${order.status}</div>
                </div>
                <ul class="order-items">
                    ${order.items.map(item => `<li>${item.quantity}x ${item.name} - $${(item.price * item.quantity).toFixed(2)}</li>`).join('')}
                </ul>
                <p style="text-align: right; font-weight: bold; margin-top: 1rem;">Total: $${order.total.toFixed(2)}</p>
            </div>
        `).reverse().join('');

    } catch (error) {
        console.error('Error al cargar el perfil:', error);
        document.body.innerHTML = '<p>No se pudo cargar la información del perfil. Intenta de nuevo.</p>';
    }
});