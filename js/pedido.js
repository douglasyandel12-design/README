const cart = JSON.parse(localStorage.getItem('lvs_cart')) || [];
const itemsList = document.getElementById('items-list');
const totalEl = document.getElementById('order-total');

// Función para auto-rellenar datos del usuario desde el backend
async function prefillUserData() {
    // --- INYECCIÓN DE ESTILOS DE CONFIANZA (B&W) ---
    const style = document.createElement('style');
    style.innerHTML = `
        :root { --primary: #000; --bg: #fff; --text: #111; --border: #e5e5e5; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: var(--text); background: #f9f9f9; }
        .container { background: #fff; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); max-width: 800px; margin: 2rem auto; }
        h2 { text-align: center; font-weight: 300; letter-spacing: 1px; margin-bottom: 2rem; }
        input, select { border: 1px solid var(--border); padding: 12px; border-radius: 4px; width: 100%; box-sizing: border-box; transition: border 0.3s; }
        input:focus, select:focus { border-color: #000; outline: none; }
        label { font-weight: 600; font-size: 0.9rem; margin-bottom: 0.5rem; display: block; color: #333; }
        .btn { background: #000; color: #fff; padding: 15px; border-radius: 4px; width: 100%; font-size: 1rem; font-weight: bold; letter-spacing: 0.5px; border: none; cursor: pointer; transition: background 0.3s; }
        .btn:hover { background: #333; }
        .item-row { display: flex; justify-content: space-between; padding: 1rem 0; border-bottom: 1px solid #f0f0f0; }
        #order-total { font-size: 1.5rem; font-weight: 700; }
        .trust-badge { text-align: center; margin-top: 1rem; font-size: 0.8rem; color: #666; display: flex; align-items: center; justify-content: center; gap: 5px; }
    `;
    document.head.appendChild(style);

    // --- FORZAR MÉTODO DE PAGO ---
    const paymentSelect = document.getElementById('client-payment');
    if (paymentSelect) {
        paymentSelect.innerHTML = '<option value="Pagar al recibir">💵 Pagar al recibir (Efectivo/Transferencia)</option>';
        // Bloqueamos visualmente pero permitimos el envío
        paymentSelect.style.backgroundColor = "#f9fafb";
        paymentSelect.style.cursor = "not-allowed";
        
        // Mensaje de confianza debajo del input
        paymentSelect.insertAdjacentHTML('afterend', '<small style="color: #166534; display: block; margin-top: 5px;">✅ Método seguro: No pagas nada hasta tener el producto en tus manos.</small>');
    }

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
        status: 'En progreso',
        date: new Date().toLocaleString(),
        customer: {
            name: document.getElementById('client-name').value,
            email: document.getElementById('client-email').value,
            phone: document.getElementById('client-phone').value,
            address: document.getElementById('client-address').value,
            payment: 'Pagar al recibir' // Forzamos el valor en el objeto del pedido
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

        // Si no hay usuario logueado (invitado), guardamos el ID localmente para que no lo pierda
        const isLogged = await verifySession();
        if (!isLogged) {
            const guestOrders = JSON.parse(localStorage.getItem('lvs_guest_orders')) || [];
            guestOrders.push(order.id);
            localStorage.setItem('lvs_guest_orders', JSON.stringify(guestOrders));

            // Guardar email del invitado para futuros descuentos, SOLO SI EL USUARIO DIO SU CONSENTIMIENTO
            const rememberEmail = document.getElementById('remember-email').checked;
            if (rememberEmail) {
                localStorage.setItem('lvs_guest_email', order.customer.email);
            }
        }

        // Redirigir "de una" a la página de rastreo con el ID en la URL
        window.location.href = `rastreo.html?id=${order.id}`;

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