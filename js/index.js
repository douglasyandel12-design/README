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
                guestLink = `<a href="rastreo.html?id=${guestOrders[guestOrders.length-1]}" style="margin-right:10px; text-decoration:none; font-size:0.9rem; color:#2563eb;">📦 Mis Pedidos</a>`;
            }

            userMenu.innerHTML = `${guestLink}<a href="login.html" style="text-decoration: none; color: var(--primary); font-weight: 600; font-size: 0.9rem; border: 1px solid #000; padding: 5px 10px; border-radius: 4px;">Iniciar Sesión</a>`;
        }
    } catch (error) {
        console.error('Error al verificar sesión:', error);
        userMenu.innerHTML = `<a href="login.html" style="text-decoration: none; color: var(--primary); font-weight: 600; font-size: 0.9rem; border: 1px solid #000; padding: 5px 10px; border-radius: 4px;">Iniciar Sesión</a>`;
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

    // Calcular precio con descuento si existe
    const hasDiscount = product.discount && product.discount > 0;
    let finalPrice = hasDiscount ? product.price * (1 - product.discount / 100) : product.price;
    
    // Aplicar 5% extra si es socio
    if (isPromoActive) {
        finalPrice = finalPrice * 0.95;
    }

    let priceHtml = '';
    if (hasDiscount || isPromoActive) {
        priceHtml = `<div class="price-container"><span class="original-price">$${product.price.toFixed(2)}</span><span class="sale-price">$${finalPrice.toFixed(2)}</span> ${isPromoActive ? '<small style="color:green; display:block; font-size:0.7rem;">¡Precio Socio!</small>' : ''}</div>`;
    } else {
        priceHtml = `<div class="price-container"><span class="product-price">$${product.price.toFixed(2)}</span></div>`;
    }

    const card = document.createElement('div');
    card.className = 'product-card';
    card.style.animationDelay = `${index * 0.1}s`; // Animación escalonada
    card.innerHTML = `
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

function addToCart(id) {
    // Usamos '==' para asegurar compatibilidad si el ID viene como texto o número
    const product = products.find(p => p.id == id);
    
    // Si no encuentra el producto, detenemos la función para no romper el carrito
    if (!product) return;

    // Calcular precio final para el carrito
    let finalPrice = product.discount ? product.price * (1 - product.discount / 100) : product.price;

    // Aplicar promo socio al añadir al carrito
    const isPromoActive = globalSettings.promo_login_5 === true && window.currentUser;
    if (isPromoActive) {
        finalPrice = finalPrice * 0.95;
    }

    // Lógica de agrupación
    const existingItem = cart.find(item => item.id == id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id: product.id, name: product.name, price: finalPrice, quantity: 1 });
    }

    saveCart();
    updateCartUI();
    
    // Mostrar notificación animada en lugar del modal
    showToast(`¡${product.name} agregado al carrito!`);
}

function orderNow(id) {
    const product = products.find(p => p.id == id);
    
    if (!product) return;

    // Calcular precio final para el pedido
    let finalPrice = product.discount ? product.price * (1 - product.discount / 100) : product.price;

    // Aplicar promo socio
    const isPromoActive = globalSettings.promo_login_5 === true && window.currentUser;
    if (isPromoActive) {
        finalPrice = finalPrice * 0.95;
    }

    // Lógica de agrupación para pedido directo
    const existingItem = cart.find(item => item.id == id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id: product.id, name: product.name, price: finalPrice, quantity: 1 });
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
                    <span style="font-size:0.8rem; color:#666;">Cant: ${item.quantity} x $${item.price.toFixed(2)}</span>
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
    if (cart[index].quantity > 1) {
        cart[index].quantity -= 1;
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