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
            --primary: #111; 
            --accent: #2563eb;
            --bg-page: #f3f4f6; 
            --bg-card: #ffffff;
            --text-main: #111827; 
            --text-muted: #6b7280;
            --border-color: #e5e7eb; 
            --input-bg: #fff;
            --focus-ring: rgba(0,0,0,0.05);
        }
        body { 
            font-family: 'Inter', system-ui, -apple-system, sans-serif; 
            color: var(--text-main); 
            background: var(--bg-page); 
            margin: 0;
            line-height: 1.5;
        }
        header {
            background: var(--bg-card);
            padding: 1rem 1.5rem;
            border-bottom: 1px solid var(--border-color);
        }
        header nav {
            max-width: 1100px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        header .logo {
            font-weight: 800;
            font-size: 1.5rem;
            color: var(--text-main);
            text-decoration: none;
        }
        header .btn-outline { padding: 8px 16px; text-decoration: none; }
        
        /* Layout Principal */
        .container { 
            max-width: 1100px; 
            margin: 0 auto; 
            padding: 2rem 1.5rem;
            display: flex;
            gap: 1.5rem;
            /* Mobile layout: stacked */
        }

        h1 { 
            font-size: 1.8rem; 
            font-weight: 800; 
            margin: 0; 
            color: var(--text-main);
            letter-spacing: -0.025em;
        }
        
        /* Layout Desktop Responsive */
        @media (min-width: 900px) {
            .container {
                grid-template-columns: 1.5fr 1fr;
                grid-template-areas: 
                    "header header"
                    "form summary";
                align-items: start;
                gap: 2rem;
            }
            h1 { grid-area: header; }
            form { grid-area: form; }
            .order-summary { 
                grid-area: summary; 
                position: sticky;
                top: 2rem;
            }
        }

        /* Estilo Tarjeta para Formulario y Resumen */
        form, .order-summary {
            background: var(--bg-card);
            padding: 2rem;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
            border: 1px solid var(--border-color);
        }

        /* Elementos del Formulario */
        .form-group { margin-bottom: 1.25rem; }
        /* Fix para checkbox con display flex si es necesario */
        .form-group:has(input[type="checkbox"]) { display: flex; } 
        
        label { 
            display: block; 
            font-size: 0.875rem; 
            font-weight: 600; 
            color: var(--text-main); 
            margin-bottom: 0.5rem; 
        }
        
        input, select, textarea { 
            width: 100%; 
            padding: 0.875rem 1rem; 
            border: 1px solid var(--border-color); 
            border-radius: 8px; 
            font-size: 0.95rem; 
            color: var(--text-main);
            background: var(--input-bg);
            box-sizing: border-box; 
            transition: all 0.2s;
        }
        
        input:focus, select:focus, textarea:focus { 
            outline: none; 
            border-color: #000; 
            box-shadow: 0 0 0 4px var(--focus-ring);
        }

        /* Botones */
        .btn { 
            display: block;
            width: 100%;
            background: #000; 
            color: #fff; 
            padding: 1rem; 
            border-radius: 8px; 
            font-size: 1rem; 
            font-weight: 600; 
            border: none; 
            cursor: pointer; 
            transition: transform 0.1s, opacity 0.2s; 
            text-align: center;
            text-decoration: none;
        }
        .btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .btn-outline { background: transparent; color: var(--text-main); border: 1px solid var(--border-color); }
        .btn-outline:hover { background: var(--bg-page); border-color: var(--text-muted); }

        /* Estilos del Resumen */
        .order-summary h3 {
            margin-top: 0;
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 1rem;
            margin-bottom: 1.5rem;
        }

        .item-row { 
            display: flex; 
            align-items: flex-start; 
            margin-bottom: 1rem; 
            padding-bottom: 1rem; 
            border-bottom: 1px dashed var(--border-color);
        }
        .item-row:last-child { border-bottom: none; padding-bottom: 0; }
        
        .item-image-box { 
            width: 70px; 
            height: 70px; 
            border-radius: 8px; 
            overflow: hidden; 
            border: 1px solid var(--border-color); 
            margin-right: 1rem; 
            flex-shrink: 0; 
            background: #fff;
            position: relative;
            cursor: pointer;
        }
        .item-image-box img { width: 100%; height: 100%; object-fit: contain; }
        
        .item-details { flex: 1; min-width: 0; }
        .item-name { 
            font-weight: 600; 
            font-size: 0.95rem; 
            line-height: 1.3;
            margin-bottom: 4px;
            display: block;
            cursor: pointer;
        }
        .item-name:hover { color: var(--accent); }
        
        .qty-wrapper { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
        .qty-btn { 
            width: 28px; height: 28px; 
            border: 1px solid var(--border-color); 
            background: #fff; 
            border-radius: 6px; 
            display: flex; align-items: center; justify-content: center; 
            cursor: pointer; 
            color: #444;
            transition: all 0.2s;
        }
        .qty-btn:hover { border-color: #000; color: #000; }
        .qty-val { font-size: 0.9rem; font-weight: 600; min-width: 1.5rem; text-align: center; }
        
        .remove-link { 
            font-size: 0.75rem; 
            color: #ef4444; 
            background: none; 
            border: none; 
            text-decoration: underline; 
            cursor: pointer; 
            margin-left: 10px;
        }

        .item-price { font-weight: 700; font-size: 1rem; margin-left: 1rem; }

        /* Totales y Footer del Resumen */
        .summary-row { display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 0.5rem; color: var(--text-muted); }
        .total-row { 
            display: flex; 
            justify-content: space-between; 
            margin-top: 1.5rem; 
            padding-top: 1rem; 
            border-top: 2px solid var(--border-color); 
            font-size: 1.35rem; 
            font-weight: 800; 
            color: var(--text-main);
            align-items: center;
        }

        /* Modal de Imagen */
        .image-modal-overlay {
            display: none; position: fixed; z-index: 10000; left: 0; top: 0; width: 100%; height: 100%;
            overflow: auto; background-color: rgba(0,0,0,0.85); backdrop-filter: blur(5px);
            justify-content: center; align-items: center; flex-direction: column; animation: fadeIn 0.3s;
        }
        .image-modal-content {
            margin: auto; display: block; width: auto; max-width: 90%; max-height: 80vh;
            object-fit: contain; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.5);
            animation: zoomIn 0.3s; background: #fff;
        }
        .image-modal-caption {
            margin: 15px auto; display: block; width: 80%; max-width: 700px; text-align: center;
            color: #fff; font-size: 1.1rem; font-weight: 500;
        }
        .image-modal-close {
            position: absolute; top: 20px; right: 35px; color: #f1f1f1; font-size: 40px;
            font-weight: bold; transition: 0.3s; cursor: pointer; z-index: 10001;
        }
        .image-modal-close:hover { color: #bbb; }
        @keyframes zoomIn { from {transform:scale(0.9); opacity:0} to {transform:scale(1); opacity:1} }
        @keyframes fadeIn { from {opacity:0} to {opacity:1} }
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
                // Si existía una dirección guardada antigua, la ponemos en la calle para no perderla
                if(document.getElementById('client-street')) document.getElementById('client-street').value = savedInfo.address || '';
            }
        }
    } catch (error) {
        console.error('No se pudo rellenar los datos del usuario.', error);
    }
}

// Función mejorada: Carga países, configura eventos y detecta ubicación
async function detectUserLocation() {
    const countrySelect = document.getElementById('client-country');
    const stateSelect = document.getElementById('client-state');
    const cityField = document.getElementById('client-city');

    if (!countrySelect || !stateSelect) return;

    // 1. Cargar lista de países disponibles (API CountriesNow)
    try {
        const res = await fetch('https://countriesnow.space/api/v0.1/countries/iso');
        const data = await res.json();
        if (!data.error) {
            countrySelect.innerHTML = '<option value="">Selecciona tu país</option>' + 
                data.data.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        }
    } catch (e) {
        countrySelect.innerHTML = '<option value="">Error cargando países</option>';
    }

    // 2. Configurar el evento de cambio manual
    countrySelect.onchange = async (e) => {
        await loadStatesForCountry(e.target.value);
    };

    // 3. Detectar ubicación automática por IP
    try {
        const response = await fetch('https://ipapi.co/json/');
        if (response.ok) {
            const geoData = await response.json();
            
            // Buscar el país detectado en el selector
            // A veces el nombre de IPAPI difiere ligeramente, buscamos coincidencia
            const options = Array.from(countrySelect.options);
            const match = options.find(opt => opt.value.toLowerCase() === geoData.country_name.toLowerCase());

            if (match) {
                countrySelect.value = match.value;
                cityField.value = geoData.city;
                // Cargar estados para el país detectado y seleccionar la región
                await loadStatesForCountry(match.value, geoData.region);
            }
        }
    } catch (error) {
        console.warn('No se pudo detectar la ubicación automáticamente.');
    }
}

// Helper para cargar estados dinámicamente
async function loadStatesForCountry(countryName, preSelectedRegion = null) {
    const stateSelect = document.getElementById('client-state');
    if (!stateSelect) return;
    
    stateSelect.innerHTML = '<option>Cargando...</option>';
    
    try {
        const statesRes = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ country: countryName })
        });
        const statesData = await statesRes.json();
        
        if (!statesData.error && statesData.data.states.length > 0) {
            stateSelect.innerHTML = statesData.data.states.map(s => 
                `<option value="${s.name}" ${preSelectedRegion && s.name === preSelectedRegion ? 'selected' : ''}>${s.name}</option>`
            ).join('');
        } else {
            stateSelect.innerHTML = preSelectedRegion 
                ? `<option value="${preSelectedRegion}">${preSelectedRegion}</option>` 
                : '<option value="">Sin estados disponibles</option>';
        }
    } catch (err) {
        stateSelect.innerHTML = '<option value="">Selecciona un país primero</option>';
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
        const subtotalItem = item.price * item.quantity;
        
        // Obtener imagen actualizada desde la base de datos (productos cargados en memoria)
        const product = products.find(p => String(p.id) === String(item.id));
        let imgUrl = '';
        if (product) {
            if (product.images && product.images.length > 0) imgUrl = product.images[0];
            else if (product.image) imgUrl = product.image;
        }
        // Si no se encuentra en BD (raro), usar la del carrito o un placeholder
        if (!imgUrl) imgUrl = item.image || 'https://placehold.co/64x64?text=Foto';

        const safeName = item.name.replace(/'/g, "\\'"); // Escapar comillas para el onclick
        return `
            <div class="item-row">
                <div class="item-image-box" onclick="openImageModal('${imgUrl}', '${safeName}')" title="Ver imagen grande">
                    <img src="${imgUrl}" alt="${item.name}" onerror="this.style.display='none'">
                </div>
                <div class="item-details">
                    <span class="item-name" style="cursor: pointer;" onclick="openImageModal('${imgUrl}', '${safeName}')" title="Ver detalles">${item.name}</span>
                    <div class="qty-wrapper">
                        <button type="button" class="qty-btn" onclick="updateOrderItemQuantity(${index}, -1)">−</button>
                        <span class="qty-val">${item.quantity}</span>
                        <button type="button" class="qty-btn" onclick="updateOrderItemQuantity(${index}, 1)">+</button>
                        <button type="button" class="remove-link" onclick="removeOrderItem(${index})">Eliminar</button>
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
    
    const product = products.find(p => String(p.id) === String(item.id));
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

    // Combinar la dirección estructurada en una sola cadena para el backend
    const fullAddress = [
        document.getElementById('client-street').value,
        document.getElementById('client-city').value,
        document.getElementById('client-state').value,
        document.getElementById('client-country').value
    ].filter(Boolean).join(', ');

    // 1. Validar campos y recolectar datos del cliente
    const customer = {
        name: document.getElementById('client-name').value,
        email: document.getElementById('client-email').value,
        phone: document.getElementById('client-phone').value,
        address: fullAddress, // Enviamos la dirección completa concatenada
        payment: 'Pagar al recibir'
    };

    // Validación simple de que se llenaron los campos de dirección
    if (!customer.name || !customer.email || !customer.phone || !document.getElementById('client-street').value) {
        Swal.fire('Campos Incompletos', 'Por favor, rellena todos los datos de envío para continuar.', 'error');
        return;
    }

    // 2. Crear un payload simplificado. El servidor se encargará del total y el stock.
    const orderPayload = {
        customer,
        // Enviamos solo los datos necesarios para que el backend verifique y procese.
        items: cart.map(item => {
            return { id: item.id, name: item.name, quantity: item.quantity };
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

// Nueva función para asegurar que los precios estén actualizados con las reglas vigentes al cargar
function recalculateCart() {
    let updated = false;
    cart.forEach(item => {
        const product = products.find(p => String(p.id) === String(item.id));
        if (product) {
            const newPrice = calculateItemPrice(product, item.quantity);
            if (Math.abs(item.price - newPrice) > 0.001) {
                item.price = newPrice;
                updated = true;
            }
        }
    });
    if (updated) {
        saveCart();
        renderOrderSummary(); // Refrescar visualmente
    }
}

// Función para abrir el modal de imagen en grande
window.openImageModal = function(src, alt) {
    let modal = document.getElementById('image-viewer-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'image-viewer-modal';
        modal.className = 'image-modal-overlay';
        modal.innerHTML = `<span class="image-modal-close">&times;</span><img class="image-modal-content" id="img-modal-target"><div id="img-modal-caption" class="image-modal-caption"></div>`;
        document.body.appendChild(modal);
        // Eventos para cerrar
        modal.querySelector('.image-modal-close').onclick = () => modal.style.display = "none";
        modal.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };
    }
    const modalImg = document.getElementById('img-modal-target');
    const captionText = document.getElementById('img-modal-caption');
    modal.style.display = "flex";
    modalImg.src = src;
    captionText.textContent = alt;
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

        recalculateCart(); // Recalcular precios con la info fresca (settings y usuario)
        renderOrderSummary();
        prefillUserData();
        detectUserLocation(); // Intentar detectar ubicación

    } catch (error) {
        console.error('Error al inicializar la página de pedido:', error);
        itemsList.innerHTML = '<p style="color:red;">Error al cargar los datos. Por favor, recarga la página.</p>';
    }
}

// Llamar a la función de inicio
document.addEventListener('DOMContentLoaded', () => {
    initPedido();
});