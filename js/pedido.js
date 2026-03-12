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
        :root { 
            --primary: #000; 
            --bg-page: #fff; 
            --bg-summary: #fafafa;
            --text: #333; 
            --text-light: #717171;
            --border: #d9d9d9; 
            --focus-ring: #000;
        }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"; 
            color: var(--text); 
            background: var(--bg-page); 
            margin: 0;
        }
        .container { 
            background: #fff; 
            padding: 2rem; 
            max-width: 900px; 
            margin: 0 auto; 
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }
        
        /* Títulos y Encabezados */
        h2 { text-align: left; font-weight: 400; font-size: 1.7rem; margin-bottom: 1.5rem; letter-spacing: -0.5px; }
        h3 { font-size: 1.1rem; font-weight: 500; color: var(--text); margin-bottom: 1rem; }

        /* Inputs Estilo Shopify */
        input, select, textarea { 
            border: 1px solid var(--border); 
            padding: 0.9rem; 
            border-radius: 5px; 
            width: 100%; 
            box-sizing: border-box; 
            transition: all 0.2s ease;
            font-size: 0.95rem;
            color: var(--text);
            background: #fff;
        }
        input:focus, select:focus { 
            border-color: var(--focus-ring); 
            outline: none; 
            box-shadow: 0 0 0 1px var(--focus-ring); 
        }
        label { font-weight: 500; font-size: 0.85rem; margin-bottom: 0.4rem; display: block; color: var(--text); }
        .form-group { margin-bottom: 1rem; }

        /* Botón de Pago */
        .btn { 
            background: var(--primary); 
            color: #fff; 
            padding: 1.2rem; 
            border-radius: 5px; 
            width: 100%; 
            font-size: 1rem; 
            font-weight: 600; 
            border: none; 
            cursor: pointer; 
            transition: opacity 0.3s; 
            margin-top: 1rem;
        }
        .btn:hover { opacity: 0.9; }

        /* Estilos de Lista de Productos (Checkout Style) */
        .item-row { display: flex; justify-content: space-between; align-items: center; padding: 1rem 0; border-bottom: 1px solid rgba(0,0,0,0.05); }
        #order-total { font-size: 1.5rem; font-weight: 700; }
        
        /* Contenedor de imagen con badge de cantidad */
        .item-image-container { position: relative; width: 64px; height: 64px; border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; background: #fff; flex-shrink: 0; margin-right: 15px; }
        .item-image { width: 100%; height: 100%; object-fit: cover; border-radius: 8px; padding: 2px; box-sizing: border-box; }
        .qty-badge {
            position: absolute; top: -10px; right: -10px;
            background: #717171; color: #fff;
            width: 20px; height: 20px; border-radius: 50%;
            font-size: 0.75rem; font-weight: 600;
            display: flex; align-items: center; justify-content: center;
            z-index: 10;
        }

        .item-details { flex-grow: 1; display: flex; flex-direction: column; justify-content: center; }
        .item-name { display: block; font-weight: 600; font-size: 0.9rem; color: var(--text); margin-bottom: 2px; }
        .item-meta { font-size: 0.8rem; color: var(--text-light); }
        .item-price { font-weight: 600; font-size: 0.95rem; color: var(--text); white-space: nowrap; }

        /* Controles pequeños para editar */
        .mini-actions { margin-top: 4px; display: flex; gap: 8px; }
        .mini-btn { font-size: 0.75rem; color: var(--text-light); background: none; border: none; cursor: pointer; padding: 0; text-decoration: underline; }
        .mini-btn:hover { color: var(--primary); }

        /* Sección de Totales (Estilo Sidebar) */
        .order-summary-box {
            background: var(--bg-summary);
            border-top: 1px solid var(--border);
            border-bottom: 1px solid var(--border);
            padding: 1.5rem 0;
            margin-bottom: 2rem;
        }
        .summary-row { display: flex; justify-content: space-between; margin-top: 0.8rem; font-size: 0.9rem; color: var(--text-light); }
        .total-row { display: flex; justify-content: space-between; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(0,0,0,0.05); align-items: center; }
        .total-label { font-size: 1.1rem; color: var(--text); font-weight: 500; }
        .total-value { font-size: 1.6rem; font-weight: 700; color: var(--text); letter-spacing: -0.5px; }
        .currency { font-size: 0.75rem; color: var(--text-light); font-weight: 400; vertical-align: middle; margin-right: 4px; }

        @media (min-width: 900px) {
            .container { flex-direction: row; align-items: flex-start; }
            .form-column { flex: 1.2; order: 1; }
            .summary-column { flex: 0.8; order: 2; background: var(--bg-summary); padding: 2rem; border-radius: 8px; border: 1px solid var(--border); margin-top: 0; }
            .order-summary-box { border: none; padding: 0; margin: 0; background: transparent; }
        }
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
        // Buscar producto actualizado (Fresca de la BD) - Comparación segura de Strings
        const product = products.find(p => String(p.id) === String(item.id));
        
        // Lógica de imagen idéntica al Admin: Priorizar BD > Array > String Legacy > Carrito > Placeholder
        let imageUrl = '';
        
        if (product) {
            // 1. Intentar sacar del array de imágenes (nuevo sistema)
            if (Array.isArray(product.images) && product.images.length > 0) {
                imageUrl = product.images[0];
            } 
            // 2. Intentar sacar string de imagen (sistema antiguo)
            else if (product.image && typeof product.image === 'string') {
                imageUrl = product.image;
            }
        }

        // 3. Si no hay imagen en BD (o producto no existe), usar la del carrito local
        if (!imageUrl && item.image) {
            imageUrl = item.image;
        }

        // 4. Fallback final
        if (!imageUrl) imageUrl = 'img/placeholder.png';

        const subtotalItem = item.price * item.quantity;

        return `
            <div class="item-row">
                <div class="item-image-container">
                    <img src="${imageUrl}" class="item-image" alt="${item.name}" onerror="this.onerror=null;this.src='img/placeholder.png';">
                    <span class="qty-badge">${item.quantity}</span>
                </div>
                <div class="item-details">
                    <span class="item-name">${item.name}</span>
                    <div class="mini-actions">
                        <button type="button" class="mini-btn" onclick="updateOrderItemQuantity(${index}, -1)">Disminuir</button>
                        <button type="button" class="mini-btn" onclick="updateOrderItemQuantity(${index}, 1)">Aumentar</button>
                        <button type="button" class="mini-btn" style="color:#ef4444;" onclick="removeOrderItem(${index})">Quitar</button>
                    </div>
                </div>
                <span class="item-price">$${subtotalItem.toFixed(2)}</span>
            </div>
        `;
    }).join('');

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Agregar resumen final estilo checkout debajo de los items
    itemsList.innerHTML += `
        <div class="summary-row" style="margin-top: 1.5rem;">
            <span>Subtotal</span>
            <span>$${total.toFixed(2)}</span>
        </div>
        <div class="summary-row">
            <span>Envío</span>
            <span style="font-size: 0.8rem;">Calculado en el siguiente paso</span>
        </div>
    `;

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
            const product = products.find(p => String(p.id) === String(item.id));
            
            // Usar la misma lógica prioritaria para guardar la imagen correcta en el pedido
            let imageToSave = '';
            if (product) {
                if (Array.isArray(product.images) && product.images.length > 0) imageToSave = product.images[0];
                else if (product.image && typeof product.image === 'string') imageToSave = product.image;
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

        // Verificar sesión usando la variable global ya cargada, ahorrando una petición
        const isLogged = window.currentUser !== null;
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