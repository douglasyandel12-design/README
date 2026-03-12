// Global variables
let cart = JSON.parse(localStorage.getItem('lvs_cart')) || [];
let itemsList = document.getElementById('items-list');
const totalEl = document.getElementById('order-total');
let products = [];
let globalSettings = {};
window.currentUser = null;

function injectStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        :root { --primary: #000; --bg: #fff; --text: #111; --border: #e5e5e5; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: var(--text); background: #f9f9f9; }
        .container { background: #fff; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); max-width: 800px; margin: 2rem auto; }
        h2 { text-align: center; font-weight: 300; letter-spacing: 1px; margin-bottom: 2rem; }
        input, select, textarea { border: 1px solid var(--border); padding: 12px; border-radius: 4px; width: 100%; box-sizing: border-box; transition: border 0.3s; }
        input:focus, select:focus { border-color: #000; outline: none; }
        label { font-weight: 600; font-size: 0.9rem; margin-bottom: 0.5rem; display: block; color: #333; }
        .btn { background: #000; color: #fff; padding: 15px; border-radius: 4px; width: 100%; font-size: 1rem; font-weight: bold; letter-spacing: 0.5px; border: none; cursor: pointer; transition: background 0.3s; }
        .btn:hover { background: #333; }
        .item-row { display: flex; justify-content: space-between; padding: 1rem 0; border-bottom: 1px solid #f0f0f0; }
        #order-total { font-size: 1.5rem; font-weight: 700; }
        .trust-badge { text-align: center; margin-top: 1rem; font-size: 0.8rem; color: #666; display: flex; align-items: center; justify-content: center; gap: 5px; }

        /* Nuevos estilos para carrito interactivo */
        .item-row { align-items: center; gap: 1rem; }
        .item-image { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid #eee; background: #fff; }
        .item-info { flex-grow: 1; }
        .item-name { display: block; font-weight: 600; margin-bottom: 4px; }
        .item-price { font-size: 0.9rem; color: #555; }
        .item-actions { display: flex; align-items: center; gap: 0.75rem; }
        .qty-btn { background: #f3f4f6; border: 1px solid #e5e7eb; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 1.2rem; line-height: 1; display: flex; align-items: center; justify-content: center; }
        .remove-btn { background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 1.2rem; line-height: 1; }
        .item-quantity { font-weight: bold; min-width: 20px; text-align: center; }
    `;
    document.head.appendChild(style);

}

function forcePaymentMethod() {
    const paymentSelect = document.getElementById('client-payment');
    if (paymentSelect) {
        paymentSelect.innerHTML = '<option value="Pagar al recibir">💵 Pagar al recibir (Efectivo/Transferencia)</option>';
        // Bloqueamos visualmente pero permitimos el envío
        paymentSelect.style.backgroundColor = "#f9fafb";
        paymentSelect.style.cursor = "not-allowed";

        // Mensaje de confianza debajo del input
        paymentSelect.insertAdjacentHTML('afterend', '<small style="color: #166534; display: block; margin-top: 5px;">✅ Método seguro: No pagas nada hasta tener el producto en tus manos.</small>');
    }
}

// Función para auto-rellenar datos del usuario desde el backend
function prefillUserData() {
    try {
        if (window.currentUser) {
            document.getElementById('client-name').value = window.currentUser.name;
            document.getElementById('client-email').value = window.currentUser.email;

            // Cargar info de envío guardada desde configuración
            const savedInfo = JSON.parse(localStorage.getItem(`shippingInfo-${window.currentUser.email}`));
            if (savedInfo) {
                document.getElementById('client-phone').value = savedInfo.phone || '';
                document.getElementById('client-address').value = savedInfo.address || '';
            }
        }
    } catch (error) {
        console.error('No se pudo rellenar los datos del usuario.', error);
    }
}

function calculateItemPrice(product, quantity) {
    let priceAfterPrimaryDiscount;
    const isProgressivePromoActive = globalSettings.promo_progressive_active === true;

    // 1. Lógica de descuento primario (Progresivo o Fijo)
    if (isProgressivePromoActive) {
        const basePrice = product.price;
        let discount = 0;
        if (quantity >= 2) {
            discount = Math.min(quantity, 5); 
        }
        priceAfterPrimaryDiscount = Math.max(0, basePrice - discount);
    } else if (product.discount && product.discount > 0) {
        priceAfterPrimaryDiscount = product.price * (1 - product.discount / 100);
    } else {
        priceAfterPrimaryDiscount = product.price;
    }

    // 2. Aplicar descuento de socio (5%) SOBRE el precio ya rebajado, si aplica.
    const isMemberPromoActive = globalSettings.promo_login_5 === true && window.currentUser;
    if (isMemberPromoActive) {
        return priceAfterPrimaryDiscount * 0.95;
    }

    return priceAfterPrimaryDiscount;
}

function renderOrderSummary() {
    cart = cart.filter(item => item != null).map(item => item.quantity ? item : { ...item, quantity: 1 });

    if (cart.length === 0) {
        document.querySelector('.order-summary').innerHTML = '<h3>Resumen del Pedido</h3><p>Tu carrito está vacío. <a href="index.html">Vuelve a la tienda</a> para añadir productos.</p>';
        document.querySelector('form').style.display = 'none';
        return;
    }

    // Asegurar que el elemento existe
    if (!itemsList) itemsList = document.getElementById('items-list');
    if (!itemsList) return;

    itemsList.innerHTML = cart.map((item, index) => {
        // Buscar producto actualizado (Fresca de la BD)
        const product = products.find(p => p.id == item.id);
        
        // Lógica de imagen idéntica al Admin: Priorizar BD > Array > String Legacy > Carrito > Placeholder
        let imageUrl = '';
        
        if (product) {
            // 1. Intentar sacar del array de imágenes (nuevo sistema)
            if (product.images && product.images.length > 0) {
                imageUrl = product.images[0];
            } 
            // 2. Intentar sacar string de imagen (sistema antiguo)
            else if (product.image) {
                imageUrl = product.image;
            }
        }

        // 3. Si no hay imagen en BD (o producto no existe), usar la del carrito local
        if (!imageUrl && item.image) {
            imageUrl = item.image;
        }

        // 4. Fallback final
        if (!imageUrl) imageUrl = 'img/placeholder.png';

        return `
            <div class="item-row">
                <img src="${imageUrl}" class="item-image" alt="${item.name}" onerror="this.onerror=null;this.src='img/placeholder.png';">
                <div class="item-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-price">$${(item.price * item.quantity).toFixed(2)}</span>
                </div>
                <div class="item-actions">
                    <button type="button" class="qty-btn" onclick="updateOrderItemQuantity(${index}, -1)">-</button>
                    <span class="item-quantity">${item.quantity}</span>
                    <button type="button" class="qty-btn" onclick="updateOrderItemQuantity(${index}, 1)">+</button>
                    <button type="button" class="remove-btn" onclick="removeOrderItem(${index})">&times;</button>
                </div>
            </div>
        `;
    }).join('');

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    totalEl.textContent = '$' + total.toFixed(2);
}

window.updateOrderItemQuantity = function(index, change) {
    const item = cart[index];
    if (!item) return;

    const newQuantity = item.quantity + change;

    if (newQuantity <= 0) {
        removeOrderItem(index);
        return;
    }

    item.quantity = newQuantity;
    
    const product = products.find(p => p.id == item.id);
    if (product) {
        item.price = calculateItemPrice(product, item.quantity);
    }

    saveCart();
    renderOrderSummary();
}

window.removeOrderItem = function(index) {
    cart.splice(index, 1);
    saveCart();
    renderOrderSummary();
}

function saveCart() {
    localStorage.setItem('lvs_cart', JSON.stringify(cart));
}

async function submitOrder(e) {
    e.preventDefault();
    if(cart.length === 0) {
        Swal.fire('Carrito Vacío', 'No puedes realizar un pedido sin productos.', 'warning');
        return;
    }

    // 1. Validar campos y recolectar datos del cliente
    const customer = {
        name: document.getElementById('client-name').value,
        email: document.getElementById('client-email').value,
        phone: document.getElementById('client-phone').value,
        address: document.getElementById('client-address').value,
        payment: 'Pagar al recibir'
    };

    if (!customer.name || !customer.email || !customer.phone || !customer.address) {
        Swal.fire('Campos Incompletos', 'Por favor, rellena todos los datos de envío para continuar.', 'error');
        return;
    }

    // 2. Crear un payload simplificado. El servidor se encargará del total y el stock.
    const orderPayload = {
        customer,
        // Enviamos solo los datos necesarios para que el backend verifique y procese.
        items: cart.map(item => {
            const product = products.find(p => p.id == item.id);
            
            // Usar la misma lógica prioritaria para guardar la imagen correcta en el pedido
            let imageToSave = '';
            if (product) {
                if (product.images && product.images.length > 0) imageToSave = product.images[0];
                else if (product.image) imageToSave = product.image;
            }
            if (!imageToSave) imageToSave = item.image || ''; // Respaldo del carrito

            return { id: item.id, name: item.name, quantity: item.quantity, image: imageToSave };
        })
    };

    // Desactivar botón para prevenir clics múltiples
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Procesando...';

    try { // 3. Enviar el pedido al backend para un procesamiento seguro
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });

        const result = await response.json();

        if (!response.ok) {
            // El servidor ahora puede devolver errores específicos (ej: falta de stock)
            throw new Error(result.message || 'El servidor no pudo procesar el pedido.');
        }

        // ¡Éxito! El backend procesó todo correctamente.
        // El bloque de actualización de stock del cliente se elimina por completo.

        const serverOrder = result.order;
        await Swal.fire('¡Pedido Confirmado!', `Tu número de pedido es: ${serverOrder.id}`, 'success');
        
        localStorage.removeItem('lvs_cart'); // Limpiar carrito

        // Si no hay usuario logueado (invitado), guardamos el ID localmente para que no lo pierda
        const isLogged = await verifySession();
        if (!isLogged) {
            const guestOrders = JSON.parse(localStorage.getItem('lvs_guest_orders')) || [];
            guestOrders.push(serverOrder.id);
            localStorage.setItem('lvs_guest_orders', JSON.stringify(guestOrders));

            // Guardar email del invitado para futuros descuentos, SOLO SI EL USUARIO DIO SU CONSENTIMIENTO
            const rememberEmailCheckbox = document.getElementById('remember-email');
            if (rememberEmailCheckbox && rememberEmailCheckbox.checked) {
                localStorage.setItem('lvs_guest_email', customer.email);
            }
        }

        // Redirigir "de una" a la página de rastreo con el ID en la URL
        window.location.href = `rastreo.html?id=${serverOrder.id}`;

    } catch (error) {
        console.error('Error al enviar el pedido:', error);
        Swal.fire('Error', `Hubo un problema: ${error.message}`, 'error');
    } finally {
        // Siempre reactivar el botón, haya éxito (antes de redirección) o error
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

// Función de inicio principal
async function initPedido() {
    // Asegurar referencia al elemento
    itemsList = document.getElementById('items-list');
    
    injectStyles();
    forcePaymentMethod();

    try {
        itemsList.innerHTML = '<p>Cargando productos...</p>';
        const [productsRes, settingsRes, sessionRes] = await Promise.all([
            fetch('/api/products'),
            fetch('/api/settings'),
            fetch('/api/auth/status')
        ]);

        products = productsRes.ok ? await productsRes.json() : [];
        globalSettings = settingsRes.ok ? await settingsRes.json() : {};
        const sessionData = sessionRes.ok ? await sessionRes.json() : { user: null };
        window.currentUser = sessionData.user;

        renderOrderSummary();
        prefillUserData();

    } catch (error) {
        console.error('Error al inicializar la página de pedido:', error);
        itemsList.innerHTML = '<p style="color:red;">Error al cargar los datos. Por favor, recarga la página.</p>';
    }
}

// Llamar a la función de inicio
document.addEventListener('DOMContentLoaded', () => {
    initPedido();
});