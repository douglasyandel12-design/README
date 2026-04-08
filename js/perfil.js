// --- SISTEMA DE MODO OSCURO GLOBAL ---
(function applyDarkMode(){const isDark=localStorage.getItem('lvs_dark_mode')==='true';if(isDark)document.documentElement.classList.add('dark-mode');if(!document.getElementById('dark-mode-styles')){const style=document.createElement('style');style.id='dark-mode-styles';style.innerHTML=`html.dark-mode body{background-color:#000 !important;color:#fff !important;}html.dark-mode header,html.dark-mode footer,html.dark-mode nav,html.dark-mode .settings-sidebar,html.dark-mode .settings-content,html.dark-mode .order-card,html.dark-mode .product-card,html.dark-mode .sp-media,html.dark-mode form,html.dark-mode .order-summary,html.dark-mode .product-modal-content,html.dark-mode .cart-content,html.dark-mode .pm-details,html.dark-mode .pm-image-container,html.dark-mode .accordion-header,html.dark-mode .hero{background-color:#0a0a0a !important;color:#fff !important;border-color:#222 !important;}html.dark-mode input,html.dark-mode select,html.dark-mode textarea{background-color:#111 !important;color:#fff !important;border-color:#333 !important;}html.dark-mode h1,html.dark-mode h2,html.dark-mode h3,html.dark-mode h4,html.dark-mode strong,html.dark-mode .product-title,html.dark-mode .pm-title,html.dark-mode .item-price,html.dark-mode .total-amount,html.dark-mode .order-value,html.dark-mode .sp-details h1{color:#fff !important;}html.dark-mode .logo{color:#fff !important;}html.dark-mode .btn-outline{color:#fff !important;border-color:#fff !important;background:transparent !important;}html.dark-mode .btn-outline:hover{background:#fff !important;color:#000 !important;}html.dark-mode .btn{background-color:#fff !important;color:#000 !important;border-color:#fff !important;}html.dark-mode .btn:hover{background-color:#ccc !important;border-color:#ccc !important;}html.dark-mode .settings-menu-btn{color:#aaa !important;border-color:#222 !important;background:transparent !important;}html.dark-mode .settings-menu-btn:hover,html.dark-mode .settings-menu-btn.active{background-color:#111 !important;color:#fff !important;border-left-color:#fff !important;}html.dark-mode .empty-state,html.dark-mode .order-header,html.dark-mode .accordion-content,html.dark-mode .cart-table th{background-color:#111 !important;border-color:#222 !important;color:#ccc !important;}html.dark-mode .track-line-bg{background:#333 !important;}html.dark-mode .step-counter{background:#111 !important;border-color:#333 !important;color:#666 !important;}html.dark-mode .stepper-item.active .step-counter{border-color:#fff !important;color:#fff !important;background:#000 !important;}html.dark-mode .stepper-item.completed .step-counter{background:#fff !important;border-color:#fff !important;color:#000 !important;}html.dark-mode .filter-btn{background-color:#111 !important;color:#aaa !important;border-color:#333 !important;}html.dark-mode .filter-btn:hover,html.dark-mode .filter-btn.active{background-color:#fff !important;color:#000 !important;border-color:#fff !important;}html.dark-mode .header-search-container input{background:#111 !important;border-color:#333 !important;color:#fff !important;}html.dark-mode .filter-chip{background:#111 !important;color:#aaa !important;border-color:#333 !important;}html.dark-mode .filter-chip.active{background:#fff !important;color:#000 !important;}html.dark-mode .dropdown-menu{background:#111 !important;border-color:#333 !important;}html.dark-mode .dropdown-menu a{color:#ccc !important;}html.dark-mode .dropdown-menu a:hover{background:#222 !important;color:#fff !important;}html.dark-mode .cart-table td,html.dark-mode .total-row,html.dark-mode .summary-row,html.dark-mode .item-row{border-color:#222 !important;}html.dark-mode .sp-media{background:transparent !important;}html.dark-mode .profile-info h2,html.dark-mode .profile-info p{color:#fff !important;}html.dark-mode .sp-description,html.dark-mode .pm-description{color:#ccc !important;}html.dark-mode div:where(.swal2-container) div:where(.swal2-popup){background-color:#111 !important;color:#fff !important;border:1px solid #333 !important;}html.dark-mode div:where(.swal2-title){color:#fff !important;}html.dark-mode div:where(.swal2-html-container){color:#ccc !important;}`;document.head.appendChild(style);}})();

document.addEventListener('DOMContentLoaded', async () => {
    // --- ESTILOS PARA LA NUEVA BARRA DE PROGRESO DE PEDIDOS ---
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

    const style = document.createElement('style');
    style.innerHTML = `
        /* --- LAYOUT GENERAL --- */
        #order-history {
            display: flex;
            flex-direction: column;
            gap: 2rem;
            max-width: 800px;
            margin: 0 auto;
        }

        /* --- TARJETA DE PEDIDO --- */
        .order-card {
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
            border: 1px solid #f3f4f6;
            overflow: hidden;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .order-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
        }

        /* --- CABECERA DE LA TARJETA --- */
        .order-header {
            background: #f9fafb;
            padding: 1.25rem 2rem;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
        }
        .order-info-group { display: flex; flex-direction: column; gap: 4px; }
        .order-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; font-weight: 700; }
        .order-value { font-weight: 700; color: #111827; font-size: 1rem; font-family: monospace; }
        .order-date-val { font-weight: 500; color: #374151; font-size: 0.95rem; }

        /* --- TRACKER (BARRA DE PROGRESO) --- */
        .tracker-container { padding: 2.5rem 2rem 2rem 2rem; }
        .stepper-wrapper {
            display: flex;
            justify-content: space-between;
            position: relative;
        }
        /* Línea de fondo (gris) */
        .track-line-bg {
            position: absolute;
            top: 15px;
            left: 5%;
            width: 90%;
            height: 4px;
            background: #e5e7eb;
            z-index: 0;
            border-radius: 10px;
        }
        /* Línea de progreso (verde) - Ancho dinámico */
        .track-line-fill {
            position: absolute;
            top: 15px;
            left: 5%;
            height: 4px;
            background: #10b981;
            z-index: 0;
            border-radius: 10px;
            transition: width 0.5s ease;
        }

        .stepper-item {
            position: relative;
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            z-index: 1;
        }
        .step-counter {
            width: 34px; height: 34px;
            border-radius: 50%;
            background: #fff;
            border: 3px solid #e5e7eb;
            display: flex; justify-content: center; align-items: center;
            font-weight: bold; font-size: 0.8rem; color: #e5e7eb;
            margin-bottom: 0.75rem;
            transition: all 0.3s ease;
        }
        /* Estados del Stepper */
        .stepper-item.completed .step-counter {
            background: #10b981; border-color: #10b981; color: #fff; transform: scale(1.1);
        }
        .stepper-item.active .step-counter {
            border-color: #2563eb; color: #2563eb; background: #fff; box-shadow: 0 0 0 4px rgba(37,99,235,0.1);
        }
        
        .step-name { font-size: 0.8rem; color: #9ca3af; font-weight: 600; text-transform: uppercase; transition: color 0.3s; }
        .stepper-item.completed .step-name { color: #10b981; }
        .stepper-item.active .step-name { color: #111827; }

        /* --- CONTENIDO Y LISTA DE ITEMS --- */
        .order-body { padding: 0 2rem 2rem 2rem; }
        .order-item-list { list-style: none; padding: 0; margin: 0; }
        .order-item {
            display: flex; justify-content: space-between; align-items: center;
            padding: 1rem 0; border-bottom: 1px dashed #e5e7eb;
        }
        .order-item:last-child { border-bottom: none; }
        
        .item-name { color: #374151; font-weight: 500; font-size: 0.95rem; }
        .item-qty { background: #f3f4f6; color: #374151; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; margin-right: 8px; font-weight: bold; }
        .item-price { font-weight: 600; color: #111827; font-family: 'Inter', sans-serif; }
        
        /* --- FOOTER TOTAL --- */
        .order-total {
            background: #fdfdfd; padding: 1.5rem 2rem;
            display: flex; justify-content: flex-end; align-items: center; gap: 1.5rem;
            border-top: 1px solid #f3f4f6;
        }
        .total-label { color: #6b7280; font-size: 0.9rem; font-weight: 500; }
        .total-amount { font-size: 1.5rem; font-weight: 800; color: #111827; letter-spacing: -0.5px; }

        /* --- ESTADO VACÍO --- */
        .empty-state {
            text-align: center; padding: 3rem 1rem; background: #f9fafb;
            border-radius: 16px; border: 2px dashed #e5e7eb; margin-top: 2rem;
        }
        .empty-state h3 { font-size: 1.25rem; color: #1f2937; margin-bottom: 0.5rem; font-weight: 700; }
        .empty-state p { color: #6b7280; margin-bottom: 1.5rem; }
        .btn-shop {
            display: inline-block; background: #000; color: #fff; padding: 12px 24px;
            border-radius: 50px; text-decoration: none; font-weight: 600; transition: all 0.2s;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .btn-shop:hover { background-color: #222; transform: translateY(-1px); box-shadow: 0 6px 12px rgba(0,0,0,0.15); }

        @media (max-width: 600px) {
            .order-header { padding: 1rem; flex-direction: column; align-items: flex-start; }
            .order-info-group { width: 100%; flex-direction: row; justify-content: space-between; align-items: center; }
            .order-total { padding: 1rem; flex-direction: column; gap: 0.5rem; align-items: flex-end; }
            .tracker-container { padding: 1rem 0.5rem; overflow-x: auto; }
            .step-name { font-size: 0.6rem; margin-top: 4px; }
            .step-counter { width: 28px; height: 28px; font-size: 0.7rem; }
        }
    `;
    document.head.appendChild(style);

    const historyContainer = document.getElementById('order-history');
    historyContainer.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem 0;">Cargando tu historial de pedidos...</p>';

    (function() {
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
    })();

    try {
        // Iniciar carga de moneda en segundo plano
        const currencyPromise = currencyManager.init();

        const response = await fetch('/api/auth/status');
        const data = await response.json();
        const user = data.user;

        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        // Renderizar tarjeta de perfil
        const profileCard = document.getElementById('profile-card');
        if (profileCard) {
            profileCard.innerHTML = `
                <div class="profile-pic"><img src="${user.picture}" alt="Foto de perfil"></div>
                <div class="profile-info">
                    <h2>${user.name}</h2>
                    <p>${user.email}</p>
                </div>
            `;
        }

        // MEJORA: Se pide al nuevo endpoint seguro que solo devuelve los pedidos del usuario actual.
        // Esto es más rápido y seguro que traer todos los pedidos y filtrarlos en el cliente.
        const ordersResponse = await fetch('/api/my-orders');
        if (!ordersResponse.ok) {
            if (ordersResponse.status === 401) {
                // Si el servidor dice que no estamos autorizados, es un error de sesión.
                window.location.href = 'login.html';
                return;
            }
            throw new Error('No se pudieron cargar los pedidos desde el servidor.');
        }
        const myOrders = await ordersResponse.json();

        if (myOrders.length === 0) {
            // MEJORA: "Estado vacío" más amigable y con una llamada a la acción.
            historyContainer.innerHTML = `
                <div class="empty-state">
                    <h3>Aún no has realizado ningún pedido</h3>
                    <p>¡Explora nuestros productos y encuentra algo que te encante!</p>
                    <a href="index.html" class="btn-shop">Ir a la Tienda</a>
                </div>
            `;
            return;
        }

        const renderHistory = (orders) => {
            return orders.map(order => {
                // MEJORA: Formateo de fecha más legible para el usuario.
                const formattedDate = new Date(order.date).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
    
                // Lógica para mostrar la bandera y el país
                let countryHtml = '';
                if (order.customer.countryCode && order.customer.country) {
                    countryHtml = `
                        <div class="order-info-group">
                            <span class="order-label">País</span>
                            <span class="order-value" style="display: flex; align-items: center; gap: 8px;">
                                <img src="https://flagcdn.com/w20/${order.customer.countryCode.toLowerCase()}.png"
                                     srcset="https://flagcdn.com/w40/${order.customer.countryCode.toLowerCase()}.png 2x"
                                     width="20"
                                     alt="Bandera de ${order.customer.country}">
                                ${order.customer.country}
                            </span>
                        </div>
                    `;
                } else if (order.customer.address) {
                    // Fallback para pedidos antiguos: intentar mostrar el país desde la dirección
                    const addressParts = order.customer.address.split(',');
                    const countryName = addressParts.length > 1 ? addressParts[addressParts.length - 1].trim() : '';
                    if (countryName) {
                        countryHtml = `
                            <div class="order-info-group">
                                <span class="order-label">País</span>
                                <span class="order-value">${countryName}</span>
                            </div>
                        `;
                    }
                }
    
                return `
                    <div class="order-card">
                        <div class="order-header">
                            <div class="order-info-group">
                                <span class="order-label">Nº Pedido</span>
                                <span class="order-value">#${order.id}</span>
                            </div>
                            ${countryHtml}
                            <div class="order-info-group" style="align-items: flex-end;">
                                 <span class="order-label" style="text-align:right;">Fecha</span>
                                 <span class="order-date-val">${formattedDate}</span>
                            </div>
                        </div>
                        
                        <div class="tracker-container">
                            ${getOrderStatusTracker(order.status)}
                        </div>
            
                        <div class="order-body">
                            <ul class="order-item-list">
                                ${order.items.map(item => `
                                    <li class="order-item">
                                        <div style="display: flex; align-items: center; gap: 10px;">
                                            <img src="${item.image || 'https://placehold.co/64x64?text=Foto'}" alt="${item.name}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid #eee;">
                                            <span class="item-name"><span class="item-qty">${item.quantity}x</span> ${item.name}</span>
                                        </div>
                                        <span class="item-price">${currencyManager.format(item.price * item.quantity)}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                        <div class="order-total">
                            <span class="total-label">Total del Pedido</span>
                            <span class="total-amount">${currencyManager.format(order.total)}</span>
                        </div>
                    </div>
                `;
            }).join('');
        };

        // Renderizar inmediatamente con precios base (USD)
        historyContainer.innerHTML = renderHistory(myOrders);

        // Cuando la moneda esté lista, volver a renderizar para actualizar precios
        await currencyPromise;
        historyContainer.innerHTML = renderHistory(myOrders);

    } catch (error) {
        console.error('Error al cargar el perfil:', error);
        historyContainer.innerHTML = '<p style="text-align: center; color: #ef4444;">No se pudo cargar tu historial. Por favor, intenta recargar la página.</p>';
    }
});

// Helper function para crear la barra de progreso del estado del pedido
function getOrderStatusTracker(currentStatus) {
    const statuses = ['En progreso', 'Aceptado', 'Enviado', 'Entregado'];
    const normalizedStatus = currentStatus === 'Pendiente' ? 'En progreso' : currentStatus;
    const currentIndex = statuses.indexOf(normalizedStatus);
    
    // Calcular porcentaje de progreso para la línea verde
    // 4 pasos = 3 intervalos. Cada intervalo es ~33.33%
    const progressPercent = Math.min((currentIndex / (statuses.length - 1)) * 90, 90); // Máximo 90% para estética

    const items = statuses.map((status, index) => {
        let className = '';
        let content = index + 1;
        
        if (index < currentIndex) {
            className = 'completed';
            content = '✓';
        } else if (index === currentIndex) {
            className = 'active';
        }
        
        return `
            <div class="stepper-item ${className}">
                <div class="step-counter">${content}</div>
                <div class="step-name">${status}</div>
            </div>
        `;
    }).join('');

    return `
        <div class="stepper-wrapper">
            <div class="track-line-bg"></div>
            <div class="track-line-fill" style="width: ${progressPercent}%"></div>
            ${items}
        </div>
    `;
}