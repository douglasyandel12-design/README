// --- SISTEMA DE MODO OSCURO GLOBAL ---
(function applyDarkMode(){const isDark=localStorage.getItem('lvs_dark_mode')==='true';if(isDark)document.documentElement.classList.add('dark-mode');if(!document.getElementById('dark-mode-styles')){const style=document.createElement('style');style.id='dark-mode-styles';style.innerHTML=`html.dark-mode body{background-color:#000 !important;color:#fff !important;}html.dark-mode header,html.dark-mode footer,html.dark-mode nav,html.dark-mode .settings-sidebar,html.dark-mode .settings-content,html.dark-mode .order-card,html.dark-mode .product-card,html.dark-mode .sp-media,html.dark-mode form,html.dark-mode .order-summary,html.dark-mode .product-modal-content,html.dark-mode .cart-content,html.dark-mode .pm-details,html.dark-mode .pm-image-container,html.dark-mode .accordion-header,html.dark-mode .hero{background-color:#0a0a0a !important;color:#fff !important;border-color:#222 !important;}html.dark-mode input,html.dark-mode select,html.dark-mode textarea{background-color:#111 !important;color:#fff !important;border-color:#333 !important;}html.dark-mode h1,html.dark-mode h2,html.dark-mode h3,html.dark-mode h4,html.dark-mode strong,html.dark-mode .product-title,html.dark-mode .pm-title,html.dark-mode .item-price,html.dark-mode .total-amount,html.dark-mode .order-value,html.dark-mode .sp-details h1{color:#fff !important;}html.dark-mode .logo{color:#fff !important;}html.dark-mode .btn-outline{color:#fff !important;border-color:#fff !important;background:transparent !important;}html.dark-mode .btn-outline:hover{background:#fff !important;color:#000 !important;}html.dark-mode .btn{background-color:#fff !important;color:#000 !important;border-color:#fff !important;}html.dark-mode .btn:hover{background-color:#ccc !important;border-color:#ccc !important;}html.dark-mode .settings-menu-btn{color:#aaa !important;border-color:#222 !important;background:transparent !important;}html.dark-mode .settings-menu-btn:hover,html.dark-mode .settings-menu-btn.active{background-color:#111 !important;color:#fff !important;border-left-color:#fff !important;}html.dark-mode .empty-state,html.dark-mode .order-header,html.dark-mode .accordion-content,html.dark-mode .cart-table th{background-color:#111 !important;border-color:#222 !important;color:#ccc !important;}html.dark-mode .track-line-bg{background:#333 !important;}html.dark-mode .step-counter{background:#111 !important;border-color:#333 !important;color:#666 !important;}html.dark-mode .stepper-item.active .step-counter{border-color:#fff !important;color:#fff !important;background:#000 !important;}html.dark-mode .stepper-item.completed .step-counter{background:#fff !important;border-color:#fff !important;color:#000 !important;}html.dark-mode .filter-btn{background-color:#111 !important;color:#aaa !important;border-color:#333 !important;}html.dark-mode .filter-btn:hover,html.dark-mode .filter-btn.active{background-color:#fff !important;color:#000 !important;border-color:#fff !important;}html.dark-mode .header-search-container input{background:#111 !important;border-color:#333 !important;color:#fff !important;}html.dark-mode .filter-chip{background:#111 !important;color:#aaa !important;border-color:#333 !important;}html.dark-mode .filter-chip.active{background:#fff !important;color:#000 !important;}html.dark-mode .dropdown-menu{background:#111 !important;border-color:#333 !important;}html.dark-mode .dropdown-menu a{color:#ccc !important;}html.dark-mode .dropdown-menu a:hover{background:#222 !important;color:#fff !important;}html.dark-mode .cart-table td,html.dark-mode .total-row,html.dark-mode .summary-row,html.dark-mode .item-row{border-color:#222 !important;}html.dark-mode .sp-media{background:transparent !important;}html.dark-mode .profile-info h2,html.dark-mode .profile-info p{color:#fff !important;}html.dark-mode .sp-description,html.dark-mode .pm-description{color:#ccc !important;}html.dark-mode div:where(.swal2-container) div:where(.swal2-popup){background-color:#111 !important;color:#fff !important;border:1px solid #333 !important;}html.dark-mode div:where(.swal2-title){color:#fff !important;}html.dark-mode div:where(.swal2-html-container){color:#ccc !important;}`;document.head.appendChild(style);}})();

let cart = JSON.parse(localStorage.getItem('lvs_cart')) || [];
const container = document.getElementById('cart-container');
const summary = document.getElementById('cart-summary');
const totalEl = document.getElementById('total-amount');
let globalSettings = {};

const currencyManager = {
    rates: null,
    userCurrency: 'USD',

    async init() {
        const storedRates = sessionStorage.getItem('currencyRates_v4');
        const storedCurrency = sessionStorage.getItem('userCurrency_v4');

        if (storedRates && storedCurrency) {
            this.rates = JSON.parse(storedRates);
            this.userCurrency = storedCurrency;
            return;
        }

        try {
            let currencyCode = null;
            try {
                const res1 = await fetch('https://ipapi.co/json/');
                if (res1.ok) { const data1 = await res1.json(); if (data1.currency) currencyCode = data1.currency; }
            } catch(e) {}

            if (!currencyCode) {
                try {
                    const res2 = await fetch('https://ipwho.is/');
                    if (res2.ok) { const data2 = await res2.json(); if (data2.success && data2.currency && data2.currency.code) currencyCode = data2.currency.code; }
                } catch(e) {}
            }
            
            if (!currencyCode) {
                try {
                    const res3 = await fetch('https://freeipapi.com/api/json');
                    if (res3.ok) { const data3 = await res3.json(); if (data3.currency && data3.currency.code) currencyCode = data3.currency.code; }
                } catch(e) {}
            }

            if (!currencyCode) {
                const navLang = navigator.language || 'es-US';
                const countryMatch = navLang.split('-')[1]; 
                const fallbackMap = {
                    "AR":"ARS", "BO":"BOB", "BR":"BRL", "CL":"CLP", "CO":"COP", "CR":"CRC", "CU":"CUP",
                    "DO":"DOP", "EC":"USD", "SV":"USD", "GT":"GTQ", "HN":"HNL", "MX":"MXN", "NI":"NIO",
                    "PA":"PAB", "PY":"PYG", "PE":"PEN", "UY":"UYU", "VE":"VES", "US":"USD", "ES":"EUR"
                };
                currencyCode = fallbackMap[countryMatch];
            }

            this.userCurrency = currencyCode || 'USD';
        } catch (e) {
            this.userCurrency = 'USD';
        }
        
        try {
            const ratesRes = await fetch('https://open.er-api.com/v6/latest/USD');
            if (ratesRes.ok) {
                const ratesData = await ratesRes.json();
                this.rates = ratesData.rates;
                sessionStorage.setItem('currencyRates_v4', JSON.stringify(this.rates));
                sessionStorage.setItem('userCurrency_v4', this.userCurrency);
            }
        } catch (e) {
            this.rates = { 'USD': 1 };
        }
    },

    format(amountInUSD) {
        try {
            let target = this.userCurrency;
            let amount = amountInUSD;
            if (this.rates && this.rates[target]) amount *= this.rates[target];
            else target = 'USD';

            // Monedas con números grandes: sin decimales para simplificar la vista
            const isBigCurrency = ['CLP', 'COP', 'PYG', 'ARS', 'MXN', 'VES', 'UYU', 'BOB', 'CRC'].includes(target);

            const formatted = new Intl.NumberFormat('en-US', { 
                style: 'currency', currency: target, currencyDisplay: 'narrowSymbol',
                minimumFractionDigits: 0, 
                maximumFractionDigits: isBigCurrency ? 0 : 2
            }).format(amount);
            return `${formatted} ${target}`;
        } catch (e) {
            return '$' + amountInUSD.toFixed(2) + ' USD';
        }
    }
};

// Inyectar estilos de alerta si no existen (para página dedicada de carrito)
if (!document.getElementById('swal-custom-style')) {
    const style = document.createElement('style');
    style.id = 'swal-custom-style';
    style.innerHTML = `
        div:where(.swal2-container) {
            z-index: 9999 !important;
        }
        div:where(.swal2-container) div:where(.swal2-popup) {
            border-radius: 12px !important;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
            padding: 2rem !important;
            background: #ffffff !important;
            color: #1f2937 !important;
            border: 1px solid #e5e7eb !important;
            font-family: system-ui, -apple-system, sans-serif !important;
        }
        div:where(.swal2-title) {
            font-size: 1.5rem !important;
            font-weight: 700 !important;
            color: #111827 !important;
        }
        div:where(.swal2-html-container) {
            font-size: 1rem !important;
            color: #4b5563 !important;
        }
        div:where(.swal2-confirm) {
            background-color: #2563eb !important;
            color: #ffffff !important;
            border-radius: 6px !important;
            padding: 0.75rem 1.5rem !important;
            font-weight: 600 !important;
            border: 1px solid transparent !important;
            box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2) !important;
        }
        div:where(.swal2-cancel) {
            background-color: #ef4444 !important;
            color: #ffffff !important;
            border: 1px solid #ef4444 !important;
            border-radius: 6px !important;
            padding: 0.75rem 1.5rem !important;
            font-weight: 600 !important;
        }
        div:where(.swal2-cancel):hover {
            background-color: #dc2626 !important;
            border-color: #dc2626 !important;
        }
        div:where(.swal2-icon) {
            border-color: #e5e7eb !important;
        }
    `;
    document.head.appendChild(style);
}

// Cargar configuración para saber cuál es el producto en promo
async function loadSettings() {
    await currencyManager.init();

    try {
        const res = await fetch('/api/settings');
        if (res.ok) {
            globalSettings = await res.json();
            renderCart();
        }
        
        // Verificar sesión y sincronizar carrito
        const authRes = await fetch('/api/auth/status');
        if (authRes.ok) {
            const authData = await authRes.json();
            window.currentUser = authData.user;

            // Sincronizar Modo Oscuro con la cuenta
            if (window.currentUser && window.currentUser.darkMode !== undefined) {
                const isDark = window.currentUser.darkMode;
                localStorage.setItem('lvs_dark_mode', isDark ? 'true' : 'false');
                if (isDark) document.documentElement.classList.add('dark-mode');
                else document.documentElement.classList.remove('dark-mode');
            }
            
            if (window.currentUser) {
                const cartRes = await fetch('/api/cart');
                if (cartRes.ok) {
                    const serverCart = await cartRes.json();
                    // Sincronizar: Si servidor tiene datos, ganan. Si no, subimos lo local.
                    if (serverCart && serverCart.length > 0) {
                        cart = serverCart;
                        localStorage.setItem('lvs_cart', JSON.stringify(cart));
                        renderCart();
                    } else if (cart.length > 0) {
                        saveCart(); // Subir local a nube
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error cargando configuración:', error);
    }
}

function renderCart() {
    if (cart.length === 0) {
        container.innerHTML = '<p>No hay productos en el carrito.</p>';
        summary.style.display = 'none';
        return;
    }
    
    // Asegurar compatibilidad
    cart = cart.map(item => item.quantity ? item : { ...item, quantity: 1 });

    let html = `
        <table class="cart-table">
            <thead>
                <tr>
                    <th>Producto</th>
                    <th>Precio</th>
                    <th>Cantidad</th>
                    <th>Acción</th>
                </tr>
            </thead>
            <tbody>
    `;

    let total = 0;
    cart.forEach((item, index) => {
        // Lógica para mostrar precio original vs. rebajado
        const priceDisplay = (item.originalPrice && item.price < item.originalPrice)
            ? `<span style="text-decoration: line-through; color: #ef4444; margin-right: 4px;">${currencyManager.format(item.originalPrice)}</span> <strong style="color: #000;">${currencyManager.format(item.price)}</strong>`
            : `${currencyManager.format(item.price)}`;

        const isPromo = globalSettings.promo_product_id && item.id == globalSettings.promo_product_id;
        const promoMsg = (isPromo && item.price < item.originalPrice) 
            ? `<br><small style="color: #d97706; font-weight: bold;">🔥 ¡Descuento progresivo aplicado!</small>` 
            : '';

        total += item.price * item.quantity;
        html += `
            <tr>
                <td>
                    ${item.name}
                    ${promoMsg}
                </td>
                <td>${priceDisplay}</td>
                <td>${item.quantity}</td>
                <td><button class="btn btn-danger" onclick="removeItem(${index})">Eliminar</button></td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
    totalEl.textContent = currencyManager.format(total);
    summary.style.display = 'block';
}

function removeItem(index) {
    cart.splice(index, 1);
    saveCart();
    renderCart();
}

function clearCart() {
    Swal.fire({
        title: '¿Vaciar carrito?',
        text: "Se eliminarán todos los productos seleccionados.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, vaciar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            cart = [];
            saveCart();
            renderCart();
            Swal.fire({ title: '¡Listo!', text: 'Tu carrito ha sido vaciado.', icon: 'success', confirmButtonText: 'Ok' });
        }
    });
}

function saveCart() {
    localStorage.setItem('lvs_cart', JSON.stringify(cart));
    if (window.currentUser) {
        fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cart })
        }).catch(console.error);
    }
}

renderCart();
loadSettings();

// Manejar clic en "Proceder al Pago"
document.addEventListener('click', async (e) => {
    const btn = e.target.closest('#checkout-btn');
    if (btn) {
        e.preventDefault();
        // Ya no obligamos a iniciar sesión, cualquiera puede comprar
        window.location.href = 'pedido.html';
    }
});

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