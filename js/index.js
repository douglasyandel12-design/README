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
function init() {
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
        .product-card { border: 1px solid #1c1c1c; box-shadow: none; transition: transform 0.3s, box-shadow 0.3s; border-radius: 0; }
        .product-card:hover { transform: translateY(-5px); box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
        
        /* Overlay negro para productos */
        .product-image { position: relative; overflow: hidden; }
        .product-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        .product-card:hover .product-overlay { opacity: 1; }
        .overlay-text { font-weight: 600; padding: 8px 16px; border: 2px solid white; border-radius: 4px; }
        
        /* --- SWEETALERT2 PERSONALIZADO (Estilo Premium LVS²) --- */
        div:where(.swal2-container) div:where(.swal2-popup) {
            border-radius: 16px !important;
            box-shadow: 0 15px 50px rgba(0,0,0,0.15) !important;
            padding: 2rem !important;
            border: 1px solid rgba(0,0,0,0.05);
        }
        div:where(.swal2-title) { font-size: 1.5rem !important; color: #111 !important; font-weight: 700 !important; }
        div:where(.swal2-html-container) { color: #555 !important; font-size: 1rem !important; }
        
        /* Iconos con colores naturales */
        div:where(.swal2-icon.swal2-success) { border-color: #10b981 !important; color: #10b981 !important; }
        div:where(.swal2-icon.swal2-error) { border-color: #ef4444 !important; color: #ef4444 !important; }
        div:where(.swal2-icon.swal2-warning) { border-color: #f59e0b !important; color: #f59e0b !important; }

        div:where(.swal2-confirm) {
            background-color: #2563eb !important; /* Azul Principal */
            color: #fff !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3) !important;
            padding: 12px 24px !important;
        }
        div:where(.swal2-cancel) {
            background-color: #ef4444 !important;
            color: #ffffff !important;
            border: 1px solid #ef4444 !important;
            border-radius: 8px !important;
            padding: 12px 24px !important;
        }
        div:where(.swal2-footer) { border-top: 1px solid #eee !important; }

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

        /* --- ESTILOS CARRITO MEJORADOS --- */
        .cart-content {
            width: 100%;
            max-width: 500px; /* Modal más ancho */
            margin: 0 0 0 auto; /* Empujar a la derecha */
        }

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
            display: flex;
            align-items: flex-start; /* Clave para que funcione sticky */
            border-radius: 8px; 
            overflow-y: auto; /* Scroll GLOBAL del modal (más fiable) */
            position: relative;
            box-shadow: 0 20px 50px rgba(0,0,0,0.2);
            scrollbar-width: thin;
        }
        .pm-image-container { flex: 1; background: #f9f9f9; display: flex; align-items: center; justify-content: center; padding: 2rem; position: sticky; top: 0; }
        .pm-image-container img { max-width: 100%; max-height: 500px; object-fit: contain; mix-blend-mode: multiply; }
        .pm-details { flex: 1; padding: 3rem 2rem; } /* Sin scroll interno */
        .product-modal-content::-webkit-scrollbar { width: 6px; }
        .product-modal-content::-webkit-scrollbar-thumb { background-color: #ccc; border-radius: 3px; }
        
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

        .pm-actions { margin-bottom: 1.5rem; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .qty-selector { display: flex; border: 1px solid #ddd; border-radius: 4px; }
        .qty-btn { background: none; border: none; padding: 10px 15px; cursor: pointer; font-size: 1.2rem; }
        .qty-input { width: 40px; text-align: center; border: none; font-weight: bold; font-size: 1rem; -moz-appearance: textfield; }
        
        @media (max-width: 768px) {
            .product-modal-content { flex-direction: column; max-height: 95vh; }
            .pm-image-container { padding: 1rem; height: 300px; position: static; }
            .pm-details { padding: 1.5rem; } 
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        /* --- VIEWER DE IMAGEN (ZOOM) --- */
        .image-modal-overlay {
            display: none; position: fixed; z-index: 10000; left: 0; top: 0; width: 100%; height: 100%;
            overflow: auto; background-color: rgba(0,0,0,0.9); backdrop-filter: blur(5px);
            justify-content: center; align-items: center; flex-direction: column; animation: fadeIn 0.3s;
        }
        .image-modal-content {
            margin: auto; display: block; width: auto; max-width: 95%; max-height: 90vh;
            object-fit: contain; border-radius: 4px; box-shadow: 0 5px 25px rgba(0,0,0,0.5);
            animation: zoomIn 0.3s;
        }
        .image-modal-close {
            position: absolute; top: 20px; right: 30px; color: #fff; font-size: 40px;
            font-weight: bold; transition: 0.3s; cursor: pointer; z-index: 10001; text-shadow: 0 2px 5px rgba(0,0,0,0.5);
        }
        .image-modal-close:hover { color: #ccc; }
        @keyframes zoomIn { from {transform:scale(0.9); opacity:0} to {transform:scale(1); opacity:1} }
    `;
    document.head.appendChild(style);

    // Cargar todos los datos críticos en paralelo para mejorar el tiempo de carga inicial.
    fixPageFavicon();
    loadAndRender();
}
init();

// Nueva función para centralizar la carga y el renderizado inicial
async function loadAndRender() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '<p style="text-align:center; width:100%; color:#666;">Cargando catálogo...</p>'; // Mostrar un estado de carga

    try {
        // 1. Cargar todos los datos necesarios en paralelo
        const [settingsResponse, productsResponse, sessionResponse] = await Promise.all([
            fetch('/api/settings'),
            fetch('/api/products'),
            fetch('/api/auth/status')
        ]);

        // 2. Procesar las respuestas
        // Usamos try-catch individuales para evitar que un fallo en settings rompa los productos
        try {
            globalSettings = settingsResponse.ok ? await settingsResponse.json() : {};
        } catch(e) { console.warn('Error cargando configuración:', e); }

        try {
            products = productsResponse.ok ? await productsResponse.json() : [];
        } catch(e) { console.error('Error crítico cargando productos:', e); products = []; }

        let sessionData = { user: null };
        try { sessionData = sessionResponse.ok ? await sessionResponse.json() : { user: null }; } catch(e) {}
        
        window.currentUser = sessionData.user;

        // 3. Renderizar la UI una vez que todos los datos están listos
        renderToolbar();
        renderProducts(); // Renderiza los productos una sola vez
        updateCartUI();
        renderUserMenu(sessionData); // Nueva función para manejar el menú de usuario
        renderFooter();
        createProductModal();
        recalculateCartPrices(); // Recalcula precios del carrito con los datos de promos y usuario ya cargados

    } catch (error) {
        console.error('Error en la carga inicial:', error);
        grid.innerHTML = '<div style="text-align:center; width:100%; padding: 2rem;"><p style="color:#ef4444; font-weight:bold;">⚠️ Error de conexión con el servidor.</p><p style="color:#666; font-size:0.9rem;">Si eres el administrador, verifica las Variables de Entorno en Vercel (MONGODB_URI).</p></div>';
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
                
                <div class="pm-actions">
                    <div class="qty-selector">
                        <button class="qty-btn" onclick="updateModalQty(-1)">-</button>
                        <input type="number" id="pm-qty" class="qty-input" value="1" readonly>
                        <button class="qty-btn" onclick="updateModalQty(1)">+</button>
                    </div>
                    <button class="btn" id="pm-add-btn" style="flex:1; padding: 15px;">Añadir al Carrito</button>
                    <button class="btn" id="pm-buy-now-btn" style="flex:1; padding: 15px; background: #fff; color: #000; border: 1px solid #000;">Pagar Ahora</button>
                </div>

                <div class="pm-description" id="pm-desc"></div>
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

// Función auxiliar para actualizar el precio en el modal según cantidad y promos
function updateModalPriceDisplay(product, quantity) {
    const priceEl = document.getElementById('pm-price');
    if (!priceEl || !product) return;

    const unitPrice = calculateItemPrice(product, quantity);
    const totalPrice = unitPrice * quantity;
    
    let html = `$${unitPrice.toFixed(2)}`;
    
    if (unitPrice < product.price) {
        html = `<span style="text-decoration:line-through; color:#999; margin-right:5px; font-size: 0.9rem;">$${product.price.toFixed(2)}</span> <span style="font-weight:bold; color:#000;">$${unitPrice.toFixed(2)}</span>`;
    }

    if (product.discount > 0) {
        html += ` <small style="color:#ef4444; font-size:0.8rem">(-${product.discount}%)</small>`;
    }

    const canSeeProgressivePromo = globalSettings.promo_progressive_active === true && (window.currentUser || globalSettings.promo_progressive_public === true);
    if (canSeeProgressivePromo && quantity >= 2) {
         const discount = Math.min(quantity, 5);
         html += `<small style="color: #d97706; display:block; font-size:0.8rem; margin-top:5px;">🔥 ¡Ahorras $${discount} por unidad!</small>`;
    }
    
    const canSeeMemberPromo = globalSettings.promo_login_5 === true && window.currentUser;
    if (canSeeMemberPromo) {
         html += `<small style="color:green; display:block; font-size:0.8rem; margin-top:2px;">+ 5% Descuento Socio</small>`;
    }

    // Añadir el precio total si la cantidad es mayor a 1
    if (quantity > 1) {
        html += `<div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #eee; font-size: 1.2rem; font-weight: 700;">
                    <span>Total:</span>
                    <span style="float: right;">$${totalPrice.toFixed(2)}</span>
                 </div>`;
    }
    priceEl.innerHTML = html;
}

window.viewProductDetails = function(id) {
    const product = products.find(p => p.id == id);
    if (!product) return;

    window.currentModalProductId = id;
    document.getElementById('pm-title').textContent = product.name;
    
    // Precio
    // Usamos la nueva función para mostrar el precio inicial (cantidad 1)
    updateModalPriceDisplay(product, 1);
    
    // Descripción (HTML seguro)
    document.getElementById('pm-desc').innerHTML = product.description || 'Sin descripción detallada.';
    
    // Imagen
    // Soporte para array de imágenes o string antiguo
    const images = (product.images && product.images.length > 0) ? product.images : (product.image ? [product.image] : []);
    
    const videos = (product.videos && product.videos.length > 0) ? product.videos : (product.video ? [product.video] : []);

    // Renderizar la vista de galería por defecto
    renderProductGallery(images, videos);
    
    // Reset cantidad
    document.getElementById('pm-qty').value = 1;
    
    // Configurar botón
    document.getElementById('pm-add-btn').onclick = () => {
        const qty = parseInt(document.getElementById('pm-qty').value);
        addToCart(id, qty);
        closeProductModal();
    };

    // Configurar botón Pagar Ahora (Nuevo)
    document.getElementById('pm-buy-now-btn').onclick = () => {
        const qty = parseInt(document.getElementById('pm-qty').value);
        const product = products.find(p => p.id == id);
        
        if (product) {
            const existingItem = cart.find(item => item.id == id);
            const image = (product.images && product.images.length > 0) ? product.images[0] : (product.image || '');
            const finalPrice = calculateItemPrice(product, existingItem ? existingItem.quantity + qty : qty);
            
            if (existingItem) {
                existingItem.quantity += qty;
                existingItem.price = finalPrice;
                existingItem.image = image;
            } else {
                cart.push({ id: product.id, name: product.name, price: finalPrice, quantity: qty, originalPrice: product.price, image: image });
            }
            saveCart();
            window.location.href = 'pedido.html';
        }
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

function renderProductGallery(images, videos) {
    const mediaContainer = document.getElementById('pm-media-display');
    let galleryHtml = '';
    let togglesHtml = '';

    if (images.length > 0) {
        galleryHtml = `<div id="pm-gallery-wrapper" class="pm-gallery-wrapper">`;
        galleryHtml += `<img id="pm-main-img" src="${images[0]}" style="width:100%; height:auto; max-height:400px; object-fit:contain; cursor: zoom-in;" onclick="openImageModal(this.src, 'Vista Previa')">`;
        if (images.length > 1) {
            galleryHtml += `<div class="pm-thumbnails">${images.map((img, idx) => `<img src="${img}" class="pm-thumb ${idx===0?'active':''}" onclick="changeModalImage('${img}', this)">`).join('')}</div>`;
        }
        galleryHtml += `</div>`;
        togglesHtml += `<button id="photo-toggle" class="active" onclick="toggleMediaView('photo')">Fotos</button>`;
    }

    if (videos && videos.length > 0) {
        videos.forEach((vid, index) => {
            const label = videos.length > 1 ? `Video ${index + 1}` : 'Video';
            // Escapar comillas simples para el onclick
            const safeVid = vid.replace(/'/g, "\\'");
            togglesHtml += `<button class="video-toggle-btn" onclick="toggleMediaView('video', '${safeVid}', this)">${label}</button>`;
        });
    }

    mediaContainer.innerHTML = `${galleryHtml}<div class="pm-media-toggle">${togglesHtml}</div><div id="pm-video-player" style="display:none;"></div>`;
}

window.toggleMediaView = function(view, videoUrl = '', btnElement = null) {
    const gallery = document.getElementById('pm-gallery-wrapper');
    const videoPlayer = document.getElementById('pm-video-player');
    const photoToggle = document.getElementById('photo-toggle');
    
    // Gestionar clases active
    const allButtons = document.querySelectorAll('.pm-media-toggle button');
    allButtons.forEach(b => b.classList.remove('active'));

    if (view === 'video') {
        if (gallery) gallery.style.display = 'none';
        videoPlayer.style.display = 'block'; 
        
        if (btnElement) btnElement.classList.add('active');

        // Si el video no está cargado, lo cargamos
        // Siempre recargamos el contenido si cambiamos de video
        // if (!videoPlayer.innerHTML) { <--- Eliminado para permitir cambio de videos
            if (videoUrl.startsWith('data:video')) {
                videoPlayer.innerHTML = `<video controls autoplay class="pm-video-container" src="${videoUrl}"></video>`;
            } else if (videoUrl.startsWith('data:image')) {
                videoPlayer.innerHTML = `<img src="${videoUrl}" style="width:100%; height:100%; object-fit:contain;">`;
            } else { // Asumimos URL de YouTube/Facebook/TikTok/Vimeo
                let embedUrl = videoUrl;
                
                // YouTube (Formatos: youtube.com y youtu.be)
                if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
                    let videoId = '';
                    if (videoUrl.includes('youtu.be')) videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
                    else if (videoUrl.includes('v=')) videoId = videoUrl.split('v=')[1].split('&')[0];
                    
                    if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
                }
                // Facebook (Requiere plugin oficial)
                else if (videoUrl.includes('facebook.com') || videoUrl.includes('fb.watch')) {
                    embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(videoUrl)}&show_text=false&t=0`;
                }
                // TikTok (Extraer ID y usar embed v2)
                else if (videoUrl.includes('tiktok.com')) {
                    const match = videoUrl.match(/\/video\/(\d+)/);
                    if (match && match[1]) {
                        embedUrl = `https://www.tiktok.com/embed/v2/${match[1]}`;
                    }
                }

                videoPlayer.innerHTML = `<iframe class="pm-video-container" src="${embedUrl}" frameborder="0" allow="autoplay; encrypted-media; picture-in-picture; web-share" allowfullscreen></iframe>`;
            }
    } else { // view === 'photo'
        if (gallery) gallery.style.display = 'flex';
        videoPlayer.style.display = 'none';
        videoPlayer.innerHTML = ''; // Detener video al cambiar
        if (photoToggle) photoToggle.classList.add('active');
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
    
    // Actualizar precio dinámicamente
    const product = products.find(p => p.id == window.currentModalProductId);
    if (product) {
        updateModalPriceDisplay(product, val);
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

// La función checkUserSession se reemplaza por renderUserMenu y la carga en init.
// Esta nueva función es SÍNCRONA y solo se encarga de renderizar la UI.
function renderUserMenu(sessionData) {
    const user = sessionData.user;
    if (user) {
        // Misma lógica que estaba en checkUserSession para usuario logueado
        let iconHtml = '';
        let adminOption = '';

        // Icono de Google SVG
        const googleIcon = user.provider === 'google' ? `<svg width="14" height="14" viewBox="0 0 24 24" style="vertical-align: -2px; margin-left: 4px;"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>` : '';

        if (user.isAdmin) {
            iconHtml = `<div class="profile-icon" onclick="toggleDropdown()" style="background: #000; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem;">A</div>`;
            adminOption = `<a href="admin.html" style="color: #2563eb; font-weight: bold; border-bottom: 1px solid #eee;">Entrar al panel de control</a>`;
        } else {
            iconHtml = `<div class="profile-icon" onclick="toggleDropdown()"><img src="${user.picture}" alt="Foto"></div>`;
        }

        userMenu.innerHTML = `
            ${iconHtml}
            <div class="dropdown-menu" id="profile-dropdown">
                <div class="user-info">
                    <p>${user.name} ${googleIcon}</p>
                    <small>${user.email}</small>
                </div>
                ${adminOption}
                <a href="perfil.html" style="font-weight: 600; color: #2563eb;">📦 Mis Pedidos</a>
                <a href="perfil.html">Mi Perfil</a>
                <a href="configuracion.html">Configuración</a>
                <a href="/api/auth/logout" class="logout">Cerrar Sesión</a>
            </div>
        `;
    } else {
        // Misma lógica para invitado
        const guestOrders = JSON.parse(localStorage.getItem('lvs_guest_orders')) || [];
        let guestLink = '';
        
        if (guestOrders.length > 0) {
            guestLink = `<a href="rastreo.html?id=${guestOrders[guestOrders.length-1]}" style="margin-right:10px; text-decoration:none; font-size:0.9rem; color:#2563eb;">📦 Mis Pedidos</a>`;
        }

        userMenu.innerHTML = `${guestLink}<a href="login.html" style="text-decoration: none; color: var(--primary); font-weight: 600; font-size: 0.9rem; border: 1px solid #000; padding: 5px 10px; border-radius: 4px;">Iniciar Sesión</a>`;
    
        handleGuestData();
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
    const fragment = document.createDocumentFragment(); // Usar un fragmento para mejorar rendimiento

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

    if(filteredProducts.length === 0) {
        grid.innerHTML = '<p style="text-align:center; width:100%; color:#666;">No se encontraron productos.</p>';
        return; // Salir si no hay productos
    }

    filteredProducts.forEach((product, index) => {
    // Obtener imagen principal (array o string legacy)
    const mainImage = (product.images && product.images.length > 0) ? product.images[0] : (product.image || '');
        
    // Determinar si mostrar imagen o placeholder
    // MEJORA: Añadimos loading="lazy" para que las imágenes solo se carguen cuando sean visibles.
    const imgContent = mainImage 
        ? `<img src="${mainImage}" alt="${product.name}" loading="lazy" decoding="async">` 
        : `<span>${product.name}</span>`;

    // --- LÓGICA DE PRECIOS (Solo visualización estándar) ---
    let displayPrice = product.price;
    let originalPriceHtml = '';
    let promoMsg = '';

    const canSeeProgressivePromo = globalSettings.promo_progressive_active === true && (window.currentUser || globalSettings.promo_progressive_public === true);

    if (product.discount && product.discount > 0) {
        displayPrice = product.price * (1 - product.discount / 100);
        originalPriceHtml = `<span class="original-price" style="text-decoration:line-through; color:#999; margin-right:5px; font-size: 0.9rem;">$${product.price.toFixed(2)}</span>`;
    }
    
    // Si la promoción progresiva está activa, lo indicamos en la tarjeta.
    // El precio real se calcula al añadir al carrito.
    if (canSeeProgressivePromo) {
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
        <div class="product-image" onclick="viewProductDetails(${product.id})" style="cursor:pointer;">
            ${imgContent}
            <div class="product-overlay">
                <span class="overlay-text">Ver Detalles</span>
            </div>
        </div>
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            ${priceHtml}
            <div class="btn-container">
                <button class="btn btn-outline" onclick="addToCart(${product.id})">Añadir</button>
                <button class="btn" onclick="orderNow(${product.id})">Pedir ahora</button>
            </div>
        </div>
    `;
        fragment.appendChild(card); // Añadir al fragmento en lugar de al DOM directamente
    });

    grid.innerHTML = ''; // Limpiar grid justo antes de añadir el contenido nuevo
    grid.appendChild(fragment); // Añadir el fragmento al DOM una sola vez
}

// Función auxiliar para calcular precio (incluye la nueva lógica progresiva)
function calculateItemPrice(product, quantity) {
    let priceAfterPrimaryDiscount;
    const isProgressivePromoActive = globalSettings.promo_progressive_active === true && (window.currentUser || globalSettings.promo_progressive_public === true);

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

    // Obtener imagen para guardarla en el carrito
    const image = (product.images && product.images.length > 0) ? product.images[0] : (product.image || '');

    // Lógica de agrupación
    const existingItem = cart.find(item => item.id == id);
    const newQuantity = existingItem ? existingItem.quantity + quantityToAdd : quantityToAdd;

    // Calcular precio dinámicamente
    const finalPrice = calculateItemPrice(product, newQuantity);
    
    if (existingItem) {
        existingItem.quantity = newQuantity;
        existingItem.price = finalPrice; // Actualizar el precio unitario
        existingItem.image = image; // Actualizar imagen
    } else {
        // Guardamos el precio original por si necesitamos recalcular y el producto ya no está en la lista `products`
        cart.push({ id: product.id, name: product.name, price: finalPrice, quantity: quantityToAdd, originalPrice: product.price, image: image });
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

    // Obtener imagen
    const image = (product.images && product.images.length > 0) ? product.images[0] : (product.image || '');

    // Calcular precio dinámicamente
    const finalPrice = calculateItemPrice(product, newQuantity);

    if (existingItem) {
        existingItem.quantity = newQuantity;
        existingItem.price = finalPrice;
        existingItem.image = image;
    } else {
        cart.push({ id: product.id, name: product.name, price: finalPrice, quantity: 1, originalPrice: product.price, image: image });
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
    let htmlContent = '';
    if (cart.length === 0) {
        htmlContent = '<p style="padding: 1rem 0; color: #666;">Tu carrito está vacío.</p>';
    } else {
        htmlContent = cart.map((item, index) => `
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
                        // Solo mostrar si el usuario puede ver la promo
                        && (window.currentUser || globalSettings.promo_progressive_public === true) ? `<small style="color: #d97706; font-weight: 600; display: block; margin-top: 2px;">🔥 ¡Descuento progresivo aplicado!</small>` 
                        : ''
                    }
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight:bold;">$${(item.price * item.quantity).toFixed(2)}</span>
                    <button onclick="removeFromCart(${index})" style="color: #ef4444; border: none; background: none; cursor: pointer; font-size: 1.2rem; padding: 0; line-height: 1;">&times;</button>
                </div>
            </div>
        `).join('');
    }

    modalItems.innerHTML = htmlContent;
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Actualizar el footer del modal (Total y Botones)
    // Buscamos el contenedor del footer. En el HTML está justo después de modalItems.
    const modalFooter = modalItems.nextElementSibling;
    
    if (modalFooter) {
        modalFooter.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <span style="font-weight: bold; font-size: 1.1rem;">Total: <span id="modal-total">$${total.toFixed(2)}</span></span>
                ${cart.length > 0 ? `<button onclick="clearCart()" style="background:none; border:none; color:#ef4444; font-size:0.85rem; cursor:pointer; text-decoration:underline; padding:0;">Vaciar Todo</button>` : ''}
            </div>
            <div style="display: flex; gap: 10px;">
                <button onclick="window.location.href='carrito.html'" class="btn btn-outline" style="flex: 1; text-align: center;">Ver Carrito</button>
                ${cart.length > 0 ? `<button onclick="window.location.href='pedido.html'" class="btn" style="flex: 1; text-align: center;">Pagar Ahora</button>` : ''}
            </div>
        `;
    } else {
        // Fallback por si la estructura HTML cambia, actualizamos solo el texto del total si existe la referencia antigua
        if(modalTotal) modalTotal.textContent = '$' + total.toFixed(2);
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

function clearCart() {
    Swal.fire({
        title: '¿Vaciar carrito?',
        text: "¿Estás seguro de que quieres eliminar todos los productos?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#000',
        cancelButtonColor: '#fff',
        confirmButtonText: 'Sí, vaciar todo',
        cancelButtonText: 'Cancelar',
        focusCancel: true,
        reverseButtons: true, // Invierte orden para UX moderna (Cancelar izq, Confirmar der)
        backdrop: `rgba(0,0,0,0.4) backdrop-filter: blur(4px)`
    }).then((result) => {
        if (result.isConfirmed) {
            cart = [];
            saveCart();
            updateCartUI();
            Swal.fire('¡Listo!', 'El carrito ha sido vaciado.', 'success');
        }
    });
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
    // Diseño Toast tipo "Píldora Flotante"
    toast.style.cssText = "display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.9); backdrop-filter: blur(10px); color: white; padding: 12px 20px; border-radius: 50px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); font-weight: 500; font-size: 0.95rem; min-width: 250px; justify-content: center;";
    
    toast.innerHTML = `<span style="font-size: 1.2rem;">✨</span> ${message}`;
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

// Función Global para abrir el modal de imagen (Zoom)
window.openImageModal = function(src, alt) {
    let modal = document.getElementById('image-viewer-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'image-viewer-modal';
        modal.className = 'image-modal-overlay';
        modal.innerHTML = `<span class="image-modal-close">&times;</span><img class="image-modal-content" id="img-modal-target">`;
        document.body.appendChild(modal);
        modal.querySelector('.image-modal-close').onclick = () => modal.style.display = "none";
        modal.onclick = (e) => { if (e.target === modal || e.target.tagName === 'IMG') modal.style.display = "none"; };
    }
    document.getElementById('img-modal-target').src = src;
    modal.style.display = "flex";
}

function fixPageFavicon() {
    const link = document.querySelector("link[rel*='icon']");
    if (!link || link.href.startsWith('data:')) return;
    const img = new Image();
    img.onload = () => {
        const size = 32; const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const aspect = img.width / img.height;
        let w=size, h=size, x=0, y=0;
        if(aspect > 1) { h=size/aspect; y=(size-h)/2; } else { w=size*aspect; x=(size-w)/2; }
        ctx.drawImage(img, x, y, w, h); link.href = canvas.toDataURL('image/png');
    }; img.src = link.href;
}