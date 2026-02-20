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
    // --- ESTILOS GLOBALES B&W Y CONFIANZA ---
    const style = document.createElement('style');
    style.innerHTML = `
        :root { --primary: #000000; --accent: #333333; --bg: #ffffff; --text: #111111; }
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: #fff; color: #111; }
        header { background: #fff; border-bottom: 1px solid #eee; box-shadow: none; }
        .logo { color: #000; font-weight: 800; letter-spacing: -1px; }
        .btn { background-color: #000; color: #fff; border-radius: 4px; border: 1px solid #000; font-weight: 500; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px; padding: 10px 20px; }
        .btn:hover { background-color: #333; border-color: #333; }
        .btn-outline { background: transparent; color: #000; border: 1px solid #e5e5e5; }
        .btn-outline:hover { border-color: #000; background: #fff; }
        .product-card { border: 1px solid #f0f0f0; box-shadow: none; transition: transform 0.3s, box-shadow 0.3s; border-radius: 0; }
        .product-card:hover { transform: translateY(-5px); box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
        
        /* --- Hero / Portada Estilo Fondo --- */
        .hero { 
            background-image: linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('img/Portada.jpg');
            background-size: cover;
            background-position: center;
            height: 60vh; /* Altura considerable */
            min-height: 400px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #fff; 
            text-align: center;
            margin-bottom: 3rem;
        }
        .hero h1 { font-size: 3rem; font-weight: 800; margin: 0 0 1rem 0; letter-spacing: -1px; text-shadow: 0 2px 10px rgba(0,0,0,0.3); }
        .hero p { font-size: 1.2rem; margin-bottom: 2rem; opacity: 0.9; }
        .hero-btn {
            background: #fff; color: #000; border: none; padding: 15px 35px; font-size: 1rem; font-weight: bold;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .hero-btn:hover { transform: scale(1.05); background: #fff; color: #000; box-shadow: 0 5px 15px rgba(255,255,255,0.3); }

        /* --- Barra de Herramientas (Búsqueda y Filtros) --- */
        .toolbar { display: flex; gap: 1rem; margin-bottom: 2rem; flex-wrap: wrap; justify-content: center; }
        .search-input { padding: 10px 15px; border: 1px solid #ddd; border-radius: 50px; width: 100%; max-width: 300px; outline: none; transition: border-color 0.3s; }
        .search-input:focus { border-color: #000; }
        .filter-chip { 
            padding: 8px 16px; border-radius: 50px; background: #f3f4f6; color: #333; cursor: pointer; font-size: 0.9rem; font-weight: 500; transition: all 0.2s; border: 1px solid transparent;
        }
        .filter-chip:hover { background: #e5e7eb; }
        .filter-chip.active { background: #000; color: #fff; }

        /* Animación de entrada para productos */
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* --- Footer Mejorado --- */
        footer {
            background: #fff;
            color: #666;
            padding: 3rem 1rem;
            text-align: center;
            border-top: 1px solid #f0f0f0;
            margin-top: 3rem;
        }
        .social-links a {
            color: #333;
            margin: 0 15px;
            text-decoration: none;
            font-weight: bold;
            transition: color 0.3s;
        }
        .social-links a:hover { color: #000; }
        .footer-links { margin-top: 1.5rem; }
        .footer-links a {
            color: #666;
            margin: 0 10px;
            text-decoration: none;
            font-size: 0.9rem;
        }
        .footer-links a:hover { text-decoration: underline; }
        .copyright { font-size: 0.85rem; margin-top: 1.5rem; color: #999; }
    `;
    document.head.appendChild(style);

    await loadSettings(); // Cargar configuración primero
    await loadProducts();
    updateCartUI();
    checkUserSession();
    renderFooter(); // Renderizar el nuevo footer
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
            renderToolbar(); // Renderizar barra de búsqueda y filtros
            renderProducts();
        }
    } catch (error) {
        console.error('Error cargando productos:', error);
        grid.innerHTML = '<p>Error al cargar el catálogo.</p>';
    }
}

let currentFilter = 'all';
let searchTerm = '';

function renderToolbar() {
    // Insertar barra de herramientas antes del grid
    if (document.querySelector('.toolbar')) return;
    
    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';
    toolbar.innerHTML = `
        <input type="text" class="search-input" placeholder="🔍 Buscar producto..." oninput="handleSearch(this.value)">
        <div style="display:flex; gap:0.5rem;">
            <div class="filter-chip active" onclick="setFilter('all', this)">Todos</div>
            <div class="filter-chip" onclick="setFilter('offers', this)">Ofertas</div>
        </div>
    `;
    grid.parentNode.insertBefore(toolbar, grid);
}

window.handleSearch = (val) => { searchTerm = val.toLowerCase(); renderProducts(); }
window.setFilter = (type, el) => {
    currentFilter = type;
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    renderProducts();
}

function renderFooter() {
    const footer = document.querySelector('footer');
    if (!footer) return;

    footer.innerHTML = `
        <div class="footer-container">
            <div class="social-links">
                <a href="#" title="Facebook">Facebook</a>
                <a href="#" title="Instagram">Instagram</a>
                <a href="#" title="Twitter">X (Twitter)</a>
            </div>
            <div class="footer-links">
                <a href="#">Términos de Servicio</a>
                <a href="#">Política de Privacidad</a>
                <a href="#">Contacto</a>
            </div>
            <div class="copyright">
                &copy; ${new Date().getFullYear()} LVS² Shop. Todos los derechos reservados.
            </div>
        </div>
    `;
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
        
        // Recalcular precios del carrito (por si entró un socio o cambiaron reglas)
        recalculateCartPrices();

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

function recalculateCartPrices() {
    let updated = false;
    cart.forEach(item => {
        const product = products.find(p => p.id == item.id);
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
        updateCartUI();
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

    // --- FILTRADO DINÁMICO ---
    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm);
        let matchesFilter = true;
        if (currentFilter === 'offers') matchesFilter = (p.discount && p.discount > 0) || (globalSettings.promo_product_id == p.id);
        return matchesSearch && matchesFilter;
    });

    if(filteredProducts.length === 0) grid.innerHTML = '<p style="text-align:center; width:100%; color:#666;">No se encontraron productos.</p>';

    filteredProducts.forEach((product, index) => {
    // Determinar si mostrar imagen o placeholder
    const imgContent = product.image 
        ? `<img src="${product.image}" alt="${product.name}">` 
        : `<span>${product.name}</span>`;

    // --- LÓGICA DE PRECIOS (Solo visualización estándar) ---
    const isPromoProduct = product.id == globalSettings.promo_product_id;
    
    // Mostramos el precio de lista (o con descuento fijo si tiene), sin calcular progresivos ni socio aquí
    let displayPrice = product.price;
    let originalPriceHtml = '';
    let promoMsg = '';

    if (product.discount && product.discount > 0) {
        displayPrice = product.price * (1 - product.discount / 100);
        originalPriceHtml = `<span class="original-price" style="text-decoration:line-through; color:#999; margin-right:5px; font-size: 0.9rem;">$${product.price.toFixed(2)}</span>`;
    }
    
    // Aplicar descuento de socio (3%) para visualización si está activo
    if (isPromoActive) {
        displayPrice = displayPrice * 0.97;
        if (!originalPriceHtml && displayPrice < product.price) {
            originalPriceHtml = `<span class="original-price" style="text-decoration:line-through; color:#999; margin-right:5px; font-size: 0.9rem;">$${product.price.toFixed(2)}</span>`;
        }
        promoMsg = `<small style="color:green; display:block; font-size:0.7rem; margin-top:2px;">+ 3% Descuento Socio</small>`;
    }
    
    const priceHtml = `<div class="price-container">${originalPriceHtml}<span class="product-price">$${displayPrice.toFixed(2)}</span>${promoMsg}</div>`;

    // Añadir insignia si es el producto con promoción progresiva
    const promoBadge = isPromoProduct
        ? `<div class="promo-badge" style="position: absolute; top: 10px; right: 10px; background: #000; color: white; padding: 4px 10px; font-size: 0.7rem; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">Destacado</div>`
        : '';

    const card = document.createElement('div');
    card.className = 'product-card';
    card.style.position = 'relative'; // Necesario para la insignia
    card.style.animation = `fadeInUp 0.5s ease forwards ${index * 0.05}s`; // Animación mejorada
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
    let priceAfterPrimaryDiscount;

    // 1. Lógica de descuento primario (Progresivo o Fijo)
    if (globalSettings.promo_product_id && product.id == globalSettings.promo_product_id) {
        // Lógica especial para el producto en promoción
        const basePrice = product.price;
        
        // Nueva lógica: El precio de TODAS las unidades se basa en el nivel alcanzado por la cantidad TOTAL
        const totalQuantity = pastPromoPurchases + quantity;
        let discount = 0;
        if (totalQuantity >= 2) {
            discount = Math.min(totalQuantity, 5);
        }
        priceAfterPrimaryDiscount = Math.max(0, basePrice - discount);
    } else {
        // Lógica normal (Descuento fijo)
        priceAfterPrimaryDiscount = product.discount ? product.price * (1 - product.discount / 100) : product.price;
    }

    // 2. Aplicar descuento de socio (3%) SOBRE el precio ya rebajado, si aplica.
    const isMemberPromoActive = globalSettings.promo_login_5 === true && window.currentUser;
    if (isMemberPromoActive) {
        return priceAfterPrimaryDiscount * 0.97;
    }

    return priceAfterPrimaryDiscount;
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
                    ${ (globalSettings.promo_product_id && item.id == globalSettings.promo_product_id && item.price < item.originalPrice) 
                        ? `<small style="color: #d97706; font-weight: 600; display: block; margin-top: 2px;">🔥 ¡Descuento progresivo aplicado!</small>` 
                        : '' 
                    }
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