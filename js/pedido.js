const cart = JSON.parse(localStorage.getItem('lvs_cart')) || [];
const itemsList = document.getElementById('items-list');
const totalEl = document.getElementById('order-total');

// Función para auto-rellenar datos del usuario desde el backend
async function prefillUserData() {
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        if (data.user) {
            document.getElementById('client-name').value = data.user.name;
            document.getElementById('client-email').value = data.user.email;

            // Cargar info de envío guardada desde configuración
            const savedInfo = JSON.parse(localStorage.getItem(`shippingInfo-${data.user.email}`));
            if (savedInfo) {
                document.getElementById('client-phone').value = savedInfo.phone || '';
                document.getElementById('client-address').value = savedInfo.address || '';
            }
        }
    } catch (error) {
        console.error('No se pudo obtener la sesión del usuario.', error);
    }
}

if (cart.length === 0) {
    itemsList.innerHTML = "<p>No hay productos seleccionados.</p>";
} else {
    // Adaptar items antiguos si no tienen quantity
    cart.forEach(item => { if(!item.quantity) item.quantity = 1; });

    itemsList.innerHTML = cart.map(item => `
        <div class="item-row">
            <span>${item.quantity}x ${item.name}</span>
            <span>$${(item.price * item.quantity).toFixed(2)}</span>
        </div>`).join('');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    totalEl.textContent = '$' + total.toFixed(2);
}

// Llamar a las funciones al cargar la página
prefillUserData();

async function submitOrder(e) {
    e.preventDefault();
    if(cart.length === 0) {
        Swal.fire('Carrito Vacío', 'No puedes realizar un pedido sin productos.', 'warning');
        return;
    }

    // NOTA: Se eliminó la verificación obligatoria de sesión (verifySession)
    // para permitir compras de invitados.

    // Crear objeto de pedido con toda la info
    const order = {
        id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
        status: 'Pendiente',
        date: new Date().toLocaleString(),
        customer: {
            name: document.getElementById('client-name').value,
            email: document.getElementById('client-email').value,
            phone: document.getElementById('client-phone').value,
            address: document.getElementById('client-address').value,
            payment: document.getElementById('client-payment').value
        },
        items: cart,
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    };

    // Desactivar botón para prevenir clics múltiples
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Procesando...';

    try {
        // 1. Enviar el pedido a nuestro nuevo backend (Netlify Function)
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        });

        if (!response.ok) {
            // Si el servidor falla, mostramos un error pero no perdemos los datos del cliente
            throw new Error('El servidor no pudo procesar el pedido.');
        }

        await Swal.fire('¡Pedido Confirmado!', `Tu número de pedido es: ${order.id}`, 'success');
        
        localStorage.removeItem('lvs_cart'); // Limpiar carrito
        window.location.href = 'index.html';

    } catch (error) {
        console.error('Error al enviar el pedido:', error);
        Swal.fire('Error', 'Hubo un problema al procesar tu pedido. Por favor, intenta de nuevo más tarde.', 'error');
        // Reactivar el botón si hubo un error
        submitButton.disabled = false;
        submitButton.textContent = 'Confirmar Pedido';
    }
}

async function verifySession() {
    try {
        const response = await fetch('/api/auth/status');
        if (!response.ok) return false;
        const data = await response.json();
        return !!data.user;
    } catch (error) {
        return false;
    }
}