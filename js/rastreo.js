// Al cargar la página, verificamos URL y Sesión
document.addEventListener('DOMContentLoaded', async () => {
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

                const localeMap = { "ARS":"es-AR", "BOB":"es-BO", "BRL":"pt-BR", "CLP":"es-CL", "COP":"es-CO", "CRC":"es-CR", "CUP":"es-CU", "DOP":"es-DO", "EUR":"es-ES", "GTQ":"es-GT", "HNL":"es-HN", "MXN":"es-MX", "NIO":"es-NI", "PAB":"es-PA", "PEN":"es-PE", "PYG":"es-PY", "USD":"en-US", "UYU":"es-UY", "VES":"es-VE" };
                const noDecimals = ['CLP', 'COP', 'PYG', 'ARS'].includes(target);
                
                const formatted = new Intl.NumberFormat(localeMap[target] || undefined, { 
                    style: 'currency', currency: target, currencyDisplay: 'narrowSymbol',
                    minimumFractionDigits: noDecimals ? 0 : 2, maximumFractionDigits: noDecimals ? 0 : 2
                }).format(amount);
                return `${formatted} ${target}`;
            } catch (e) {
                return '$' + amountInUSD.toFixed(2) + ' USD';
            }
        }
    };

    const container = document.querySelector('.container') || document.body;

    // Inyectar estilos CSS para la tarjeta y el efecto hover
    const style = document.createElement('style');
    style.innerHTML = `
        .order-card {
            cursor: pointer;
            background: white;
            border: 1px solid #f0f0f0;
            border-radius: 8px;
            padding: 1.25rem;
            margin-bottom: 1rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .order-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(0,0,0,0.08);
            border-color: #000;
        }
        /* Estilos para los botones de filtro */
        .filter-btn {
            background-color: #fff;
            border: 1px solid #e5e5e5;
            color: #666;
            padding: 0.5rem 1.2rem;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            transition: background-color 0.2s, color 0.2s;
            margin: 0 4px;
        }
        .filter-btn:hover {
            border-color: #000;
            color: #000;
        }
        .filter-btn.active {
            background-color: #000;
            color: white;
            border-color: #000;
        }
    `;
    document.head.appendChild(style);
    
    // Reemplazamos la interfaz de búsqueda por el título, filtros y contenedor de la lista
    container.innerHTML = `
        <h2 style="text-align: center; margin-bottom: 1rem;">📦 Mis Pedidos</h2>
        <div id="filter-container" style="text-align: center; margin-bottom: 1.5rem;">
            <button class="filter-btn active" data-status="all">Todos</button>
            <button class="filter-btn" data-status="En progreso">En Progreso</button>
            <button class="filter-btn" data-status="Entregado">Entregados</button>
        </div>
        <div id="orders-list-container" style="max-width: 600px; margin: 0 auto;">
            <p style="text-align: center; color: #666;">Cargando historial...</p>
        </div>
    `;
    
    // FIX FAVICON
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
    
    const listContainer = document.getElementById('orders-list-container');
    let allMyOrders = []; // Variable para guardar todos los pedidos del usuario

    // Función para renderizar una lista de pedidos
    const renderOrderList = (orders, forceRender = false) => {
        if (orders.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                    <p style="color: #4b5563; margin-bottom: 1rem;">No se encontraron pedidos con este filtro.</p>
                    <a href="index.html" class="btn" style="text-decoration: none; display: inline-block;">Ir a la tienda</a>
                </div>
            `;
            return;
        }

        // Si no forzamos el render y ya hay contenido, no hacemos nada (para la actualización de moneda)
        if (!forceRender && listContainer.querySelector('.order-card')) {
             // No es la primera vez, solo actualizamos los precios
        }

        // Ordenar: Más recientes primero
        orders.sort((a, b) => new Date(b.date) - new Date(a.date));

        listContainer.innerHTML = orders.map(order => {
            // Determinar color del estado
            let statusColor = '#666'; // Gris oscuro (Neutro/Elegante)
            if (order.status === 'Entregado') statusColor = '#000'; // Negro (Completado)
            if (order.status === 'Cancelado') statusColor = '#999'; // Gris claro

            // Lógica para país y bandera
            let countryHtml = '';
            if (order.customer.countryCode && order.customer.country) {
                countryHtml = `
                    <div style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #6b7280; margin-top: 4px;">
                        <img src="https://flagcdn.com/w20/${order.customer.countryCode.toLowerCase()}.png" width="16" alt="Bandera de ${order.customer.country}">
                        <span>${order.customer.country}</span>
                    </div>
                `;
            }

            return `
                <div class="order-card" onclick="toggleDetails('${order.id}')">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid #f3f4f6;">
                        <div>
                            <span style="font-weight: 700; color: #111827; font-size: 1.1rem;">${order.id}</span>
                            <div style="font-size: 0.8rem; color: #6b7280; margin-top: 2px;">${order.date}</div>
                            ${countryHtml}
                        </div>
                        <span style="background-color: ${statusColor}; color: white; padding: 4px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">
                            ${order.status || 'En progreso'}
                        </span>
                    </div>
                    
                    <div style="margin-bottom: 1rem;">
                        <ul style="list-style: none; padding: 0; margin: 0;">
                            ${order.items.map(item => `
                                <li style="display: flex; justify-content: space-between; font-size: 0.95rem; color: #374151; margin-bottom: 4px;">
                                    <span>${item.quantity}x ${item.name}</span>
                                    <span style="font-weight: 500;">${currencyManager.format(item.price * item.quantity)}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.75rem; border-top: 1px dashed #d1d5db;">
                        <span style="font-size: 0.9rem; color: #4b5563;">Total</span>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 1.2rem; font-weight: 800; color: #111827;">${currencyManager.format(order.total)}</span>
                            <span id="icon-${order.id}" style="font-size: 0.8rem; color: #9ca3af;">▼</span>
                        </div>
                    </div>

                    <div id="details-${order.id}" style="display: none; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #f3f4f6; background-color: #f9fafb; padding: 1rem; border-radius: 8px;">
                        <h4 style="margin: 0 0 0.5rem 0; font-size: 0.95rem; color: #111827;">📍 Datos de Envío</h4>
                        <p style="margin: 0 0 0.5rem 0; font-size: 0.9rem; color: #4b5563;">
                            ${order.customer.address || 'Dirección no disponible'}
                        </p>
                        <p style="margin: 0; font-size: 0.9rem; color: #4b5563;">
                            <strong>Tel:</strong> ${order.customer.phone || 'No disponible'}
                        </p>
                    </div>
                </div>
            `;
        }).join('');
    };

    try {
        // Iniciar carga de moneda en segundo plano
        const currencyPromise = currencyManager.init();
        // 1. Obtener usuario actual (si existe)
        const authRes = await fetch('/api/auth/status');
        const authData = await authRes.json();
        const currentUser = authData.user;

        const urlParams = new URLSearchParams(window.location.search);
        const trackedId = urlParams.get('id');

        // Si es invitado, mostrar el aviso
        if (!currentUser) {
            const warningMsg = document.createElement('div');
            warningMsg.style.cssText = "background-color: #eef2ff; color: #4338ca; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid #c7d2fe; text-align: center; max-width: 600px; margin-left: auto; margin-right: auto;";
            warningMsg.innerHTML = `
                <strong>Aviso para invitados:</strong> Estás viendo los pedidos guardados en este dispositivo.
                <br>
                <a href="login.html" style="font-weight: 600; color: #3730a3; text-decoration: underline; margin-top: 0.5rem; display: inline-block;">Inicia sesión</a> para ver tu historial completo en cualquier lugar.
            `;
            // Insertar el aviso al principio del contenedor, antes del título
            const h2Title = container.querySelector('h2');
            container.insertBefore(warningMsg, h2Title);
        }

        let myOrders = [];
        const loadedIds = new Set();

        // 1. Si hay un ID en la URL, siempre lo intentamos cargar primero
        if (trackedId) {
            try {
                const res = await fetch(`/api/orders/${trackedId}`);
                if (res.ok) {
                    const order = await res.json();
                    myOrders.push(order);
                    loadedIds.add(order.id);
                    
                    // Si es invitado y no lo tenía guardado, lo agregamos para el futuro
                    if (!currentUser) {
                        const guestOrders = JSON.parse(localStorage.getItem('lvs_guest_orders')) || [];
                        if (!guestOrders.includes(trackedId)) {
                            guestOrders.push(trackedId);
                            localStorage.setItem('lvs_guest_orders', JSON.stringify(guestOrders));
                        }
                    }
                }
            } catch (e) {
                console.error('Error al cargar el pedido rastreado:', e);
            }
        }

        // 2. Cargar el resto del historial
        if (currentUser) {
            // 2a. Si es usuario registrado: Usamos el endpoint seguro
            try {
                const ordersRes = await fetch('/api/my-orders');
                if (ordersRes.ok) {
                    const userOrders = await ordersRes.json();
                    userOrders.forEach(o => {
                        if (!loadedIds.has(o.id)) {
                            myOrders.push(o);
                            loadedIds.add(o.id);
                        }
                    });
                }
            } catch (e) {
                console.error('Error al cargar historial:', e);
            }
        } else {
            // 2b. Si es INVITADO: Buscamos los pedidos locales restantes
            const localIds = JSON.parse(localStorage.getItem('lvs_guest_orders')) || [];
            const idsToFetch = localIds.filter(id => id !== trackedId);
            
            if (idsToFetch.length > 0) {
                const fetchPromises = idsToFetch.map(id => 
                    fetch(`/api/orders/${id}`).then(res => res.ok ? res.json() : null)
                );
                
                const results = await Promise.all(fetchPromises);
                const validOrders = results.filter(order => order !== null);
                
                validOrders.forEach(o => {
                    if (!loadedIds.has(o.id)) {
                        myOrders.push(o);
                        loadedIds.add(o.id);
                    }
                });
            }
        }

        allMyOrders = myOrders; // Guardar la lista completa
        renderOrderList(allMyOrders, true); // Renderizar todos los pedidos inicialmente (con precios base)

        // Cuando la moneda esté lista, volver a renderizar para actualizar precios
        await currencyPromise;
        renderOrderList(allMyOrders, true);

        // 3. Añadir listeners a los botones de filtro
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Manejar clase 'active'
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                const status = button.getAttribute('data-status');
                if (status === 'all') {
                    renderOrderList(allMyOrders);
                } else {
                    const filteredOrders = allMyOrders.filter(order => order.status === status);
                    renderOrderList(filteredOrders);
                }
            });
        });

    } catch (error) {
        console.error("Error cargando lista de pedidos:", error);
        listContainer.innerHTML = `
            <div style="text-align: center; color: #ef4444; padding: 1rem;">
                <p>Ocurrió un error al cargar la información.</p>
                <button onclick="location.reload()" style="margin-top: 0.5rem; padding: 4px 8px; cursor: pointer;">Reintentar</button>
            </div>
        `;
    }
});

window.toggleDetails = function(id) {
    const details = document.getElementById(`details-${id}`);
    const icon = document.getElementById(`icon-${id}`);
    if (details.style.display === 'none') {
        details.style.display = 'block';
        if(icon) icon.textContent = '▲';
    } else {
        details.style.display = 'none';
        if(icon) icon.textContent = '▼';
    }
};