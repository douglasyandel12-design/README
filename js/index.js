// Variable global para productos
let products = [];
let globalSettings = {}; // Para guardar config de promociones
let pastPromoPurchases = 0; // Variable para contar compras pasadas del producto en promo

const grid = document.getElementById('product-grid');
const cartCountEl = document.getElementById('cart-count');
const modal = document.getElementById('cart-modal');
const modalItems = document.getElementById('modal-cart-items');
const modalTotal = document.getElementById('modal-total');
const userMenu = document.getElementById('user-menu');

// Cargar carrito desde localStorage
let cart = JSON.parse(localStorage.getItem('lvs_cart')) || [];
// CORRECCIÓN: Limpiar items corruptos (null/undefined) que causan el bug
cart = cart.filter(item => item != null);

// Migración simple: si el carrito tiene items viejos sin cantidad, resetear o adaptar
// Para evitar errores, si detectamos items sin 'quantity', los adaptamos
cart = cart.map(item => item.quantity ? item : { ...item, quantity: 1 });

// Función de inicio
async function init() {
    await loadSettings(); // Cargar configuración primero
    await loadProducts();
    updateCartUI();
    checkUserSession();
}
init();

// Cargar configuraciones globales
async function loadSettings() {
    try {
        const res = await fetch('/api/settings');
        if (res.ok) globalSettings = await res.json();
    } catch (error) {
        console.error('Error cargando settings', error);
    }
}

// Cargar productos desde la Nube (Base de Datos)
async function loadProducts() {
    try {
        const res = await fetch('/api/products');
        if (res.ok) {
            products = await res.json();
            renderProducts();
        }
    } catch (error) {
        console.error('Error cargando productos:', error);
        grid.innerHTML = '<p>Error al cargar el catálogo.</p>';
    }
}

function handleGuestData() {
    const guestEmail = localStorage.getItem('lvs_guest_email');
    if (!guestEmail) return; // No hay nada que hacer

    // Crear el banner
    const banner = document.createElement('div');
    banner.id = 'guest-info-banner';
    banner.style.cssText = "background-color: #eef2ff; color: #3730a3; padding: 0.75rem 1rem; text-align: center; font-size: 0.9rem; display: flex; justify-content: center; align-items: center; gap: 1rem; flex-wrap: wrap;";
    banner.innerHTML = `
        <span>Bienvenido de nuevo, <strong>${guestEmail}</strong>. Tus descuentos acumulados están activos.</span>
        <button onclick="clearGuestData()" style="background: none; border: 1px solid #c7d2fe; color: #4338ca; padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">No soy yo</button>
    `;

    // Insertar el banner al principio del body
    document.body.insertBefore(banner, document.body.firstChild);
}

window.clearGuestData = function() {
    if (confirm('¿Quieres borrar tu correo y el historial de pedidos de este navegador? Perderás los descuentos acumulados como invitado.')) {
        localStorage.removeItem('lvs_guest_email');
        localStorage.removeItem('lvs_guest_orders');
        location.reload();
    }
}

async function checkUserSession() {
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        if (data.user) {
            window.currentUser = data.user; // Guardar usuario globalmente para usarlo en render
            const user = data.user;
            
            // Configuración visual para Admin vs Usuario Normal
            let iconHtml = '';
            let adminOption = '';

            if (user.isAdmin) {
                // Icono "A" para el admin
                iconHtml = `<div class="profile-icon" onclick="toggleDropdown()" style="background: #000; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem;">A</div>`;
                // Opción extra en el menú
                adminOption = `<a href="admin.html" style="color: #2563eb; font-weight: bold; border-bottom: 1px solid #eee;">Entrar al panel de control</a>`;
            } else {
                // Foto normal de Google
                iconHtml = `<div class="profile-icon" onclick="toggleDropdown()"><img src="${user.picture}" alt="Foto"></div>`;
            }

            userMenu.innerHTML = `
                ${iconHtml}
                <div class="dropdown-menu" id="profile-dropdown">
                    <div class="user-info">
                        <p>${user.name}</p>
                        <small>${user.email}</small>
                    </div>
                    ${adminOption}
                    <a href="perfil.html" style="font-weight: 600; color: #2563eb;">📦 Mis Pedidos</a>
                    <a href="perfil.html">Mi Perfil</a>
                    <a href="configuracion.html">Configuración</a>
                    <a href="/api/auth/logout" class="logout">Cerrar Sesión</a>
                </div>
            `;
            
            // Re-renderizar productos para aplicar descuentos de socio si aplica
            renderProducts();
        } else {
            // Si es invitado, verificamos si tiene pedidos locales
            const guestOrders = JSON.parse(localStorage.getItem('lvs_guest_orders')) || [];
            let guestLink = '';
            
            if (guestOrders.length > 0) {
                // Se vuelve a agregar el enlace para que los invitados puedan rastrear su último pedido.
                guestLink = `<a href="rastreo.html?id=${guestOrders[guestOrders.length-1]}" style="margin-right:10px; text-decoration:none; font-size:0.9rem; color:#2563eb;">📦 Mis Pedidos</a>`;
            }

            userMenu.innerHTML = `${guestLink}<a href="login.html" style="text-decoration: none; color: var(--primary); font-weight: 600; font-size: 0.9rem; border: 1px solid #000; padding: 5px 10px; border-radius: 4px;">Iniciar Sesión</a>`;
        
            // Mostrar banner si hay datos de invitado guardados
            handleGuestData();
        }

        // Calcular compras pasadas para aplicar descuento acumulativo
        await fetchPastOrders();

    } catch (error) {
        console.error('Error al verificar sesión:', error);
        userMenu.innerHTML = `<a href="login.html" style="text-decoration: none; color: var(--primary); font-weight: 600; font-size: 0.9rem; border: 1px solid #000; padding: 5px 10px; border-radius: 4px;">Iniciar Sesión</a>`;
    }
}

// Función para buscar en el historial cuántas veces se ha comprado el producto en promo
async function fetchPastOrders() {
    if (!globalSettings.promo_product_id) return;
    pastPromoPurchases = 0; // Reiniciar contador

    try {
        const res = await fetch('/api/orders');
        if (!res.ok) return;
        const allOrders = await res.json();
        
        let relevantOrders = [];
        
        if (window.currentUser) {
            // Si es usuario registrado, filtramos por su email
            relevantOrders = allOrders.filter(o => o.customer && o.customer.email === window.currentUser.email);
        } else {
            // Si es invitado...
            // 1. Intentamos usar el email guardado en localStorage (Más efectivo)
            const guestEmail = localStorage.getItem('lvs_guest_email');
            
            if (guestEmail) {
                relevantOrders = allOrders.filter(o => o.customer && o.customer.email === guestEmail);
            } else {
                // 2. Si no hay email, usamos los IDs de pedidos locales (Fallback)
                const guestIds = JSON.parse(localStorage.getItem('lvs_guest_orders')) || [];
                if (guestIds.length > 0) {
                    relevantOrders = allOrders.filter(o => guestIds.includes(o.id));
                }
            }
        }

        // Contar cuántas veces aparece el producto en promoción en esos pedidos
        relevantOrders.forEach(order => {
            if (order.items) {
                order.items.forEach(item => {
                    // Usamos == para comparar ID (puede ser string o number)
                    if (item.id == globalSettings.promo_product_id) {
                        pastPromoPurchases += (item.quantity || 0);
                    }
                });
            }
        });
        
        // Actualizar la cuadrícula de productos para reflejar el nuevo precio base si aplica
        renderProducts();
        
    } catch (e) {
        console.error("Error calculando compras pasadas:", e);
    }
}

function toggleDropdown() {
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

function logout() {
    // Esta función ya no es necesaria, el link se encarga de todo.
}

// Renderizar productos
function renderProducts() {
    grid.innerHTML = ''; // Limpiar grid
    
    // Verificar si aplica promo de socio (Usuario logueado + Config activa)
    const isPromoActive = globalSettings.promo_login_5 === true && window.currentUser;

    products.forEach((product, index) => {
    // Determinar si mostrar imagen o placeholder
    const imgContent = product.image 
        ? `<img src="${product.image}" alt="${product.name}">` 
        : `<span>${product.name}</span>`;

    // --- LÓGICA DE PRECIOS OPTIMIZADA ---
    const isPromoProduct = product.id == globalSettings.promo_product_id;
    let displayPrice = product.price;
    let originalPriceHtml = '';
    let promoMsg = '';

    if (isPromoProduct) {
        // Calculamos cuánto le costará la SIGUIENTE unidad (Marginal)
        // Esto motiva al usuario mostrándole el precio rebajado inmediato
        const nextUnitIndex = pastPromoPurchases + 1;
        const cycleLength = Math.ceil(product.price);
        const step = ((nextUnitIndex - 1) % cycleLength) + 1;
        
        let discount = (step >= 2) ? step : 0;
        displayPrice = Math.max(0, product.price - discount);

        if (displayPrice < product.price) {
            originalPriceHtml = `<span class="original-price" style="text-decoration:line-through; color:#999; margin-right:5px; font-size: 0.9rem;">$${product.price.toFixed(2)}</span>`;
            promoMsg = `<small style="color:#ef4444; display:block; font-weight:bold; font-size:0.75rem; margin-top:4px;">¡Precio especial por tu unidad n.º ${nextUnitIndex}!</small>`;
        }
    } else {
        // Lógica normal (Descuento fijo + Socio)
        const hasDiscount = product.discount && product.discount > 0;
        let base = hasDiscount ? product.price * (1 - product.discount / 100) : product.price;
        
        if (isPromoActive) {
            base = base * 0.95;
            promoMsg = '<small style="color:green; display:block; font-size:0.7rem;">¡Precio Socio!</small>';
        }
        displayPrice = base;

        if (displayPrice < product.price) {
            originalPriceHtml = `<span class="original-price" style="text-decoration:line-through; color:#999; margin-right:5px; font-size: 0.9rem;">$${product.price.toFixed(2)}</span>`;
        }
    }
    
    const priceHtml = `<div class="price-container">${originalPriceHtml}<span class="product-price" style="color:${(isPromoProduct && displayPrice < product.price) ? '#ef4444' : '#000'}">$${displayPrice.toFixed(2)}</span>${promoMsg}</div>`;

    // Añadir insignia si es el producto con promoción progresiva
    const promoBadge = isPromoProduct 
        ? `<div class="promo-badge" style="position: absolute; top: 10px; right: 10px; background: #ef4444; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: bold;">OFERTA</div>`
        : '';

    const card = document.createElement('div');
    card.className = 'product-card';
    card.style.position = 'relative'; // Necesario para la insignia
    card.style.animationDelay = `${index * 0.1}s`; // Animación escalonada
    card.innerHTML = `
        ${promoBadge}
        <div class="product-image">${imgContent}</div>
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            ${priceHtml}
            <div class="btn-container">
                <button class="btn btn-outline" onclick="addToCart(${product.id})">Añadir</button>
                <button class="btn" onclick="orderNow(${product.id})">Pedir ahora</button>
            </div>
        </div>
    `;
    grid.appendChild(card);
    });
}

// Función auxiliar para calcular precio (incluye la nueva lógica progresiva)
function calculateItemPrice(product, quantity) {
    // 1. Lógica especial para el producto en promoción (ID configurado por el admin)
    // Usamos '==' para permitir que el ID sea string o number
    if (globalSettings.promo_product_id && product.id == globalSettings.promo_product_id) {
        const basePrice = product.price;
        const cycleLength = Math.ceil(basePrice);

        // Si el producto es gratis o tiene precio inválido, no aplicar descuento.
        if (cycleLength <= 0) return basePrice;

        // --- CÁLCULO DE PRECIO PROMEDIO ---
        // Calculamos el costo real de cada unidad individualmente y sacamos el promedio.
        // Esto evita que el precio "salte" si se reinicia el ciclo.
        let totalCost = 0;

        for (let i = 1; i <= quantity; i++) {
            // Índice absoluto de la unidad en la historia del usuario
            const unitIndex = pastPromoPurchases + i;
            
            // Calcular descuento para ESTA unidad específica
            const step = ((unitIndex - 1) % cycleLength) + 1;
            const discount = (step >= 2) ? step : 0;
            
            totalCost += Math.max(0, basePrice - discount);
        }

        // Retornamos el precio unitario promedio
        return totalCost / quantity;
    }

    // 2. Lógica normal (Descuento base + Socio)
    let finalPrice = product.discount ? product.price * (1 - product.discount / 100) : product.price;
    
    const isPromoActive = globalSettings.promo_login_5 === true && window.currentUser;
    if (isPromoActive) {
        finalPrice = finalPrice * 0.95;
    }
    return finalPrice;
}

function addToCart(id) {
    // Usamos '==' para asegurar compatibilidad si el ID viene como texto o número
    const product = products.find(p => p.id == id);
    
    // Si no encuentra el producto, detenemos la función para no romper el carrito
    if (!product) return;

    // Lógica de agrupación
    const existingItem = cart.find(item => item.id == id);
    const newQuantity = existingItem ? existingItem.quantity + 1 : 1;

    // Calcular precio dinámicamente
    const finalPrice = calculateItemPrice(product, newQuantity);
    
    if (existingItem) {
        existingItem.quantity = newQuantity;
        existingItem.price = finalPrice; // Actualizar el precio unitario
    } else {
        // Guardamos el precio original por si necesitamos recalcular y el producto ya no está en la lista `products`
        cart.push({ id: product.id, name: product.name, price: finalPrice, quantity: 1, originalPrice: product.price });
    }

    saveCart();
    updateCartUI();
    
    // Mostrar notificación animada en lugar del modal
    showToast(`¡${product.name} agregado!`);
}

function orderNow(id) {
    const product = products.find(p => p.id == id);
    if (!product) return;

    // Lógica de agrupación para pedido directo
    const existingItem = cart.find(item => item.id == id);
    const newQuantity = existingItem ? existingItem.quantity + 1 : 1;

    // Calcular precio dinámicamente
    const finalPrice = calculateItemPrice(product, newQuantity);

    if (existingItem) {
        existingItem.quantity = newQuantity;
        existingItem.price = finalPrice;
    } else {
        cart.push({ id: product.id, name: product.name, price: finalPrice, quantity: 1, originalPrice: product.price });
    }

    saveCart();
    // Redirigir directamente al formulario
    window.location.href = 'pedido.html';
}

function saveCart() {
    localStorage.setItem('lvs_cart', JSON.stringify(cart));
}

function updateCartUI() {
    // Actualizar contador
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCountEl.textContent = totalCount;
    
    // Animación simple
    cartCountEl.style.transform = 'scale(1.2)';
    setTimeout(() => {
        cartCountEl.style.transform = 'scale(1)';
    }, 200);

    // Actualizar Modal
    if (cart.length === 0) {
        modalItems.innerHTML = '<p>Tu carrito está vacío.</p>';
        modalTotal.textContent = '$0.00';
    } else {
        modalItems.innerHTML = cart.map((item, index) => `
            <div class="cart-item">
                <div class="cart-item-details">
                    <span style="font-weight:600;">${item.name}</span>
                    <span style="font-size:0.8rem; color:#666;">
                        Cant: ${item.quantity} x 
                        ${
                            (item.originalPrice && item.price < item.originalPrice)
                            ? `<span style="text-decoration: line-through; color: #ef4444; margin-right: 4px;">$${item.originalPrice.toFixed(2)}</span> <strong style="color: #000;">$${item.price.toFixed(2)}</strong>`
                            : `$${item.price.toFixed(2)}`
                        }
                    </span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight:bold;">$${(item.price * item.quantity).toFixed(2)}</span>
                    <button onclick="removeFromCart(${index})" style="color: #ef4444; border: none; background: none; cursor: pointer; font-size: 1.2rem; padding: 0; line-height: 1;">&times;</button>
                </div>
            </div>
        `).join('');
        
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        modalTotal.textContent = '$' + total.toFixed(2);
    }
}

function removeFromCart(index) {
    const item = cart[index];
    if (item.quantity > 1) {
        item.quantity -= 1;

        // Si es el producto en promoción, hay que recalcular su precio
        if (globalSettings.promo_product_id && item.id == globalSettings.promo_product_id) {
            // Buscamos el producto original para obtener el precio base
            const product = products.find(p => p.id == item.id) || { id: item.id, price: item.originalPrice };
            if (product.price !== undefined) {
                item.price = calculateItemPrice(product, item.quantity);
            }
        }
        // Para productos normales, el precio unitario no cambia, así que no hacemos nada más.

    } else {
        cart.splice(index, 1);
    }
    saveCart();
    updateCartUI();
}

function toggleCart() {
    modal.classList.toggle('active');
}

function showToast(message) {
    // Eliminar toast anterior si existe para evitar acumulación
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `✅ ${message}`;
    document.body.appendChild(toast);

    // Pequeño delay para permitir que el DOM se actualice antes de la animación
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Ocultar y eliminar después de 3 segundos
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Escuchar cambios en localStorage para actualizar automáticamente cuando el Admin haga cambios
window.addEventListener('storage', (e) => {
    if (e.key === 'lvs_products') {
        location.reload();
    }
});