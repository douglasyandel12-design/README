// Variable global para productos
let products = [];
let globalSettings = {}; // Para guardar config de promociones

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
        .header-search-container { flex: 1; margin: 0 2rem; max-width: 600px; }
        .search-input { width: 100%; padding: 12px 20px; border: 1px solid #eaeaea; border-radius: 50px; background: #f9f9f9; outline: none; transition: all 0.3s; font-size: 0.95rem; }
        .search-input:focus { background: #fff; border-color: #000; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        
        .filter-container { display: flex; justify-content: center; gap: 0.5rem; margin-bottom: 2rem; }
        @media (max-width: 768px) { .header-search-container { order: 3; margin: 1rem 0 0 0; min-width: 100%; } nav { flex-wrap: wrap; } }

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

        /* --- ESTILOS DEL MODAL DE PRODUCTO (TIPO SHOPIFY) --- */
        .product-modal-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.6); z-index: 2000; display: none;
            justify-content: center; align-items: center; padding: 20px;
            backdrop-filter: blur(5px);
        }
        .product-modal-overlay.active { display: flex; animation: fadeIn 0.3s; }
        .product-modal-content {
            background: #fff; width: 100%; max-width: 900px; max-height: 90vh;
            display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;
            border-radius: 8px; overflow: hidden; position: relative;
            box-shadow: 0 20px 50px rgba(0,0,0,0.2);
        }
        .pm-image-container { background: #f9f9f9; display: flex; align-items: center; justify-content: center; padding: 2rem; }
        .pm-image-container img { max-width: 100%; max-height: 500px; object-fit: contain; mix-blend-mode: multiply; }
        .pm-details { padding: 3rem 2rem; overflow-y: auto; display: flex; flex-direction: column; }
        
        /* Estilos de Galería en Modal */
        .pm-gallery-wrapper { width: 100%; display: flex; flex-direction: column; gap: 10px; }
        .pm-thumbnails { display: flex; gap: 10px; overflow-x: auto; padding: 5px 0; justify-content: center; }
        .pm-thumb { width: 60px; height: 60px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; object-fit: cover; opacity: 0.6; transition: all 0.2s; }
        .pm-thumb:hover, .pm-thumb.active { opacity: 1; border-color: #000; transform: scale(1.05); }
        
        .pm-close { position: absolute; top: 15px; right: 20px; font-size: 2rem; cursor: pointer; z-index: 10; line-height: 1; }
        .pm-media-toggle { display: flex; justify-content: center; gap: 1rem; margin-top: 1rem; }
        .pm-media-toggle button { background: #eee; border: none; padding: 5px 15px; border-radius: 4px; cursor: pointer; font-weight: 500; }
        .pm-media-toggle button.active { background: #000; color: #fff; }
        .pm-video-container { width: 100%; aspect-ratio: 16/9; background: #000; }
        .pm-title { font-size: 2rem; font-weight: 800; margin-bottom: 0.5rem; line-height: 1.1; }
        .pm-price { font-size: 1.5rem; font-weight: 500; margin-bottom: 1.5rem; color: #333; }
        .pm-description { color: #555; line-height: 1.6; margin-bottom: 2rem; font-size: 0.95rem; }
        .pm-description ul { padding-left: 20px; margin-bottom: 1rem; }

        .pm-actions { margin-top: auto; display: flex; gap: 10px; align-items: center; }
        .qty-selector { display: flex; border: 1px solid #ddd; border-radius: 4px; }
        .qty-btn { background: none; border: none; padding: 10px 15px; cursor: pointer; font-size: 1.2rem; }
        .qty-input { width: 40px; text-align: center; border: none; font-weight: bold; font-size: 1rem; -moz-appearance: textfield; }
        
        @media (max-width: 768px) {
            .product-modal-content { grid-template-columns: 1fr; max-height: 95vh; overflow-y: auto; }
            .pm-image-container { padding: 1rem; height: 300px; }
            .pm-details { padding: 1.5rem; }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    `;
    document.head.appendChild(style);

    await loadSettings(); // Cargar configuración primero
    await loadProducts();
    updateCartUI();
    checkUserSession();
    renderFooter(); // Renderizar el nuevo footer
    createProductModal(); // Crear estructura del modal
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

let currentCategory = 'all';
let searchTerm = '';

function renderToolbar() {
    // 1. Inyectar Buscador en el Header (Nav)
    const nav = document.querySelector('nav');
    const navRight = document.querySelector('.nav-right'); 
    
    if (nav && !document.getElementById('header-search')) {
        const searchContainer = document.createElement('div');
        searchContainer.className = 'header-search-container';
        searchContainer.innerHTML = `<input type="text" id="header-search" class="search-input" placeholder="🔍 Buscar productos..." oninput="handleSearch(this.value)">`;
        
        if (navRight) nav.insertBefore(searchContainer, navRight);
        else nav.appendChild(searchContainer);
    }

    // 2. Insertar Filtros antes del grid
    if (document.querySelector('.filter-container')) return;

    const filters = document.createElement('div');
    filters.className = 'filter-container';
    filters.innerHTML = `
        <div class="filter-chip active" onclick="setCategory('all', this)">Todos</div>
        <div class="filter-chip" onclick="setCategory('offers', this)">🔥 Ofertas</div>
    `;
    grid.parentNode.insertBefore(filters, grid);
}

window.handleSearch = (val) => { searchTerm = val.toLowerCase(); renderProducts(); }
window.setCategory = (category, el) => {
    currentCategory = category;
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

// --- CREACIÓN Y LÓGICA DEL MODAL DE PRODUCTO ---
function createProductModal() {
    if (document.getElementById('product-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'product-modal';
    modal.className = 'product-modal-overlay';
    modal.innerHTML = `
        <div class="product-modal-content">
            <span class="pm-close" onclick="closeProductModal()">&times;</span>
            <div class="pm-image-container">
                <div id="pm-media-display">
                    <!-- El contenido (galería o video) se inyectará aquí -->
                </div>
            </div>
            <div class="pm-details">
                <h2 class="pm-title" id="pm-title"></h2>
                <div class="pm-price" id="pm-price"></div>
                <div class="pm-description" id="pm-desc"></div>
                
                <div class="pm-actions">
                    <div class="qty-selector">
                        <button class="qty-btn" onclick="updateModalQty(-1)">-</button>
                        <input type="number" id="pm-qty" class="qty-input" value="1" readonly>
                        <button class="qty-btn" onclick="updateModalQty(1)">+</button>
                    </div>
                    <button class="btn" id="pm-add-btn" style="flex:1; padding: 15px;">Añadir al Carrito</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Cerrar al hacer click fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeProductModal();
    });
}

window.currentModalProductId = null;

window.viewProductDetails = function(id) {
    const product = products.find(p => p.id == id);
    if (!product) return;

    window.currentModalProductId = id;
    document.getElementById('pm-title').textContent = product.name;
    
    // Precio
    const price = product.discount ? product.price * (1 - product.discount/100) : product.price;
    document.getElementById('pm-price').innerHTML = `$${price.toFixed(2)} ${product.discount ? `<small style="color:#ef4444; font-size:0.8rem">(-${product.discount}%)</small>` : ''}`;
    
    // Descripción (HTML seguro)
    document.getElementById('pm-desc').innerHTML = product.description || 'Sin descripción detallada.';
    
    // Imagen
    // Soporte para array de imágenes o string antiguo
    const images = (product.images && product.images.length > 0) ? product.images : (product.image ? [product.image] : []);
    
    // Renderizar la vista de galería por defecto
    renderProductGallery(images, product.video);
    
    // Reset cantidad
    document.getElementById('pm-qty').value = 1;
    
    // Configurar botón
    document.getElementById('pm-add-btn').onclick = () => {
        const qty = parseInt(document.getElementById('pm-qty').value);
        addToCart(id, qty);
        closeProductModal();
    };

    document.getElementById('product-modal').classList.add('active');
}

window.closeProductModal = function() {
    // Detener video al cerrar el modal para que no siga sonando
    const videoPlayer = document.getElementById('pm-video-player');
    if (videoPlayer) {
        videoPlayer.innerHTML = '';
    }
    document.getElementById('product-modal').classList.remove('active');
}

function renderProductGallery(images, videoUrl) {
    const mediaContainer = document.getElementById('pm-media-display');
    let galleryHtml = '';
    let togglesHtml = '';

    if (images.length > 0) {
        galleryHtml = `<div id="pm-gallery-wrapper" class="pm-gallery-wrapper">`;
        galleryHtml += `<img id="pm-main-img" src="${images[0]}" style="width:100%; height:auto; max-height:400px; object-fit:contain;">`;
        if (images.length > 1) {
            galleryHtml += `<div class="pm-thumbnails">${images.map((img, idx) => `<img src="${img}" class="pm-thumb ${idx===0?'active':''}" onclick="changeModalImage('${img}', this)">`).join('')}</div>`;
        }
        galleryHtml += `</div>`;
        togglesHtml += `<button id="photo-toggle" class="active" onclick="toggleMediaView('photo')">Fotos</button>`;
    }

    if (videoUrl) {
        const mediaType = videoUrl.startsWith('data:image') ? 'Ver Imagen' : 'Video';
        togglesHtml += `<button id="video-toggle" onclick="toggleMediaView('video', '${videoUrl}')">${mediaType}</button>`;
    }

    mediaContainer.innerHTML = `${galleryHtml}<div class="pm-media-toggle">${togglesHtml}</div><div id="pm-video-player" style="display:none;"></div>`;
}

window.toggleMediaView = function(view, videoUrl = '') {
    const gallery = document.getElementById('pm-gallery-wrapper');
    const videoPlayer = document.getElementById('pm-video-player');
    const photoToggle = document.getElementById('photo-toggle');
    const videoToggle = document.getElementById('video-toggle');

    if (view === 'video') {
        if (gallery) gallery.style.display = 'none';
        videoPlayer.style.display = 'block';
        if (photoToggle) photoToggle.classList.remove('active');
        if (videoToggle) videoToggle.classList.add('active');

        // Si el video no está cargado, lo cargamos
        if (!videoPlayer.innerHTML) {
            if (videoUrl.startsWith('data:video')) {
                videoPlayer.innerHTML = `<video controls autoplay class="pm-video-container" src="${videoUrl}"></video>`;
            } else if (videoUrl.startsWith('data:image')) {
                videoPlayer.innerHTML = `<img src="${videoUrl}" style="width:100%; height:100%; object-fit:contain;">`;
            } else { // Asumimos URL de YouTube/Vimeo
                let embedUrl = videoUrl;
                if (videoUrl.includes('youtube.com/watch?v=')) {
                    const videoId = new URL(videoUrl).searchParams.get('v');
                    embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
                }
                videoPlayer.innerHTML = `<iframe class="pm-video-container" src="${embedUrl}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
            }
        }
    } else { // view === 'photo'
        if (gallery) gallery.style.display = 'flex';
        videoPlayer.style.display = 'none';
        videoPlayer.innerHTML = ''; // Detener video al cambiar
        if (photoToggle) photoToggle.classList.add('active');
        if (videoToggle) videoToggle.classList.remove('active');
    }
}

window.changeModalImage = function(src, thumbEl) {
    const mainImg = document.getElementById('pm-main-img');
    if (!mainImg) {
        console.error('Elemento de imagen principal #pm-main-img no encontrado.');
        return;
    }
    mainImg.src = src;

    // Quitar 'active' de todos los thumbnails
    const thumbnails = document.querySelectorAll('.pm-thumb');
    thumbnails.forEach(t => t.classList.remove('active'));

    // Añadir 'active' al thumbnail seleccionado, si existe
    if (thumbEl) {
        thumbEl.classList.add('active');
    }
}

window.updateModalQty = function(change) {
    const input = document.getElementById('pm-qty');
    let val = parseInt(input.value) + change;
    if (val < 1) val = 1;
    input.value = val;
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

        // Recalcular precios del carrito (por si entró un socio o cambiaron reglas)
        recalculateCartPrices();

    } catch (error) {
        console.error('Error al verificar sesión:', error);
        userMenu.innerHTML = `<a href="login.html" style="text-decoration: none; color: var(--primary); font-weight: 600; font-size: 0.9rem; border: 1px solid #000; padding: 5px 10px; border-radius: 4px;">Iniciar Sesión</a>`;
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
        // Filtro de Stock: Si el stock es 0, el producto no se muestra
        if (p.stock !== undefined && p.stock !== null && p.stock !== "" && parseInt(p.stock) <= 0) return false;

        const matchesSearch = p.name.toLowerCase().includes(searchTerm);
        
        let matchesCategory = true;
        if (currentCategory === 'all') {
            matchesCategory = true;
        } else if (currentCategory === 'offers') {
            matchesCategory = (p.discount && p.discount > 0) || (globalSettings.promo_product_id == p.id);
        }
        
        return matchesSearch && matchesCategory;
    });

    if(filteredProducts.length === 0) grid.innerHTML = '<p style="text-align:center; width:100%; color:#666;">No se encontraron productos.</p>';

    filteredProducts.forEach((product, index) => {
    // Obtener imagen principal (array o string legacy)
    const mainImage = (product.images && product.images.length > 0) ? product.images[0] : (product.image || '');
        
    // Determinar si mostrar imagen o placeholder
    const imgContent = mainImage 
        ? `<img src="${mainImage}" alt="${product.name}">` 
        : `<span>${product.name}</span>`;

    // --- LÓGICA DE PRECIOS (Solo visualización estándar) ---
    let displayPrice = product.price;
    let originalPriceHtml = '';
    let promoMsg = '';

    if (product.discount && product.discount > 0) {
        displayPrice = product.price * (1 - product.discount / 100);
        originalPriceHtml = `<span class="original-price" style="text-decoration:line-through; color:#999; margin-right:5px; font-size: 0.9rem;">$${product.price.toFixed(2)}</span>`;
    }
    
    // Si la promoción progresiva está activa, lo indicamos en la tarjeta.
    // El precio real se calcula al añadir al carrito.
    if (globalSettings.promo_progressive_active === true) {
        promoMsg = `<small style="color: #d97706; display:block; font-size:0.7rem; margin-top:2px;">¡Promo por cantidad activa!</small>`;
    }
    
    // Aplicar descuento de socio (5%) para visualización si está activo
    if (isPromoActive) {
        displayPrice = displayPrice * 0.95;
        if (!originalPriceHtml && displayPrice < product.price) {
            originalPriceHtml = `<span class="original-price" style="text-decoration:line-through; color:#999; margin-right:5px; font-size: 0.9rem;">$${product.price.toFixed(2)}</span>`;
        }
        promoMsg += `<small style="color:green; display:block; font-size:0.7rem; margin-top:2px;">+ 5% Descuento Socio</small>`;
    }
    
    const priceHtml = `<div class="price-container">${originalPriceHtml}<span class="product-price">$${displayPrice.toFixed(2)}</span>${promoMsg}</div>`;

    const card = document.createElement('div');
    card.className = 'product-card';
    card.style.animation = `fadeInUp 0.5s ease forwards ${index * 0.05}s`; // Animación mejorada
    card.innerHTML = `
        <div class="product-image" onclick="viewProductDetails(${product.id})" style="cursor:pointer;">${imgContent}</div>
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
    const isProgressivePromoActive = globalSettings.promo_progressive_active === true;

    // 1. Lógica de descuento primario (Progresivo o Fijo)
    if (isProgressivePromoActive) {
        // Lógica de descuento progresivo para CUALQUIER producto
        const basePrice = product.price;
        let discount = 0;
        // El descuento se basa en la cantidad de este item en el carrito.
        if (quantity >= 2) {
            // Ejemplo: 2 items = $2 off, 3 = $3 off, hasta un máximo de $5.
            discount = Math.min(quantity, 5); 
        }
        priceAfterPrimaryDiscount = Math.max(0, basePrice - discount);
    } else if (product.discount && product.discount > 0) {
        // Lógica de descuento por porcentaje si no hay promo progresiva
        priceAfterPrimaryDiscount = product.price * (1 - product.discount / 100);
    } else {
        // Sin descuento
        priceAfterPrimaryDiscount = product.price;
    }

    // 2. Aplicar descuento de socio (5%) SOBRE el precio ya rebajado, si aplica.
    const isMemberPromoActive = globalSettings.promo_login_5 === true && window.currentUser;
    if (isMemberPromoActive) {
        return priceAfterPrimaryDiscount * 0.95;
    }

    return priceAfterPrimaryDiscount;
}

function addToCart(id, quantityToAdd = 1) {
    // Usamos '==' para asegurar compatibilidad si el ID viene como texto o número
    const product = products.find(p => p.id == id);
    
    // Si no encuentra el producto, detenemos la función para no romper el carrito
    if (!product) return;

    // Lógica de agrupación
    const existingItem = cart.find(item => item.id == id);
    const newQuantity = existingItem ? existingItem.quantity + quantityToAdd : quantityToAdd;

    // Calcular precio dinámicamente
    const finalPrice = calculateItemPrice(product, newQuantity);
    
    if (existingItem) {
        existingItem.quantity = newQuantity;
        existingItem.price = finalPrice; // Actualizar el precio unitario
    } else {
        // Guardamos el precio original por si necesitamos recalcular y el producto ya no está en la lista `products`
        cart.push({ id: product.id, name: product.name, price: finalPrice, quantity: quantityToAdd, originalPrice: product.price });
    }

    saveCart();
    updateCartUI();
    
    // Mostrar notificación animada en lugar del modal
    showToast(`¡${quantityToAdd}x ${product.name} agregado!`);
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
                    ${ (globalSettings.promo_progressive_active === true && item.price < item.originalPrice)
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

        // Si la promo progresiva está activa, siempre hay que recalcular el precio.
        if (globalSettings.promo_progressive_active === true) {
            const product = products.find(p => p.id == item.id) || { id: item.id, price: item.originalPrice, discount: 0 };
            if (product) {
                item.price = calculateItemPrice(product, item.quantity);
            }
        }
        
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