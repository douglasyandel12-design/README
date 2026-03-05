// Variable global
let products = [];
let allOrders = []; // Variable para guardar los pedidos cargados
let globalPromoProductId = ''; // Variable para saber cuál es el producto en promo

// Cargar productos desde la nube al iniciar
async function initAdmin() {
    try {
        const res = await fetch('/api/products');
        if (res.ok) {
            products = await res.json();
            
            // --- INYECCIÓN DE UI PARA STOCK ---
            // NOTA DE REVISIÓN: La inyección dinámica de HTML como esta es frágil.
            // Si la estructura del HTML en admin.html cambia, este código podría romperse.
            // Sería más robusto tener los elementos ya en el HTML (quizás ocultos)
            // y usar JS solo para mostrarlos o manipularlos.
            // 1. Header de la tabla
            const tableHead = document.querySelector('thead tr');
            if (tableHead && !tableHead.querySelector('.th-stock')) {
                const th = document.createElement('th');
                th.className = 'th-stock';
                th.innerText = 'Stock';
                tableHead.insertBefore(th, tableHead.lastElementChild); // Insertar antes de Acciones
            }
            // 2. Input en el formulario de agregar (si existe el de precio)
            const priceInput = document.getElementById('prod-price');
            if (priceInput && !document.getElementById('prod-stock')) {
                const stockInput = document.createElement('input');
                stockInput.type = 'number';
                stockInput.id = 'prod-stock';
                stockInput.placeholder = 'Stock (Opcional)';
                stockInput.style.cssText = "padding: 10px; border: 1px solid #ddd; border-radius: 4px; width: 120px; margin-left: 0.5rem;";
                priceInput.parentNode.insertBefore(stockInput, priceInput.nextSibling);
            }
            // ----------------------------------

            renderTable();
            checkStockAlerts(); // Verificar alertas de stock
            renderSettingsPanel(); // Cargar panel de configuración
            await renderOrders(); // Cargar pedidos y esperar
            renderDashboardStats(); // Renderizar tarjetas de estadísticas
            renderSalesChart(); // Renderizar gráfico de ventas
        }
    } catch (e) {
        console.error("Error cargando productos", e);
    }
}
initAdmin();

// Inyectar estilos para los botones de estado
const adminStyle = document.createElement('style');
adminStyle.innerHTML = `
    .status-btn-group { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 5px; }
    .status-btn {
        border: 1px solid #ddd; background: #fff; padding: 5px 10px; border-radius: 20px;
        font-size: 0.75rem; cursor: pointer; transition: all 0.2s; color: #555;
    }
    .status-btn:hover { background: #f9f9f9; transform: translateY(-1px); }
    
    /* Estados Activos */
    .status-btn.active { color: white; border-color: transparent; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
    .status-btn.active[data-status="En progreso"] { background-color: #3b82f6; } /* Azul */
    .status-btn.active[data-status="Aceptado"] { background-color: #8b5cf6; } /* Violeta */
    .status-btn.active[data-status="Enviado"] { background-color: #f59e0b; } /* Naranja */
    .status-btn.active[data-status="Entregado"] { background-color: #10b981; } /* Verde */
`;
document.head.appendChild(adminStyle);

// --- LÓGICA DE CONFIGURACIÓN (PROMOCIONES) ---
async function renderSettingsPanel() {
    const container = document.querySelector('main.container') || document.body;
    // Insertar panel antes de la tabla si no existe
    if (!document.getElementById('settings-panel')) {
        const panel = document.createElement('div');
        panel.id = 'settings-panel';
        panel.style.cssText = "background: #f3f4f6; padding: 1rem; margin-bottom: 1rem; border-radius: 8px; border: 1px solid #ddd;";
        
        // Obtener estado actual
        let isPromoActive = false;
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            isPromoActive = data.promo_login_5 === true;
            globalPromoProductId = data.promo_product_id || '';
        } catch(e) { console.error(e); }

        panel.innerHTML = `
            <h3>⚙️ Configuración Global</h3>
            <div>
                <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                    <input type="checkbox" id="promo-toggle" ${isPromoActive ? 'checked' : ''} style="transform: scale(1.5);">
                    <span>Activar <strong>5% de Descuento</strong> automático para usuarios logueados.</span>
                </label>
            </div>
        `;
        
        // Insertar al principio del contenedor principal
        container.insertBefore(panel, container.firstChild);

        // Evento de cambio
        document.getElementById('promo-toggle').addEventListener('change', async (e) => {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'promo_login_5', value: e.target.checked })
            });
            alert('Configuración de descuento para socios actualizada.');
        });
    }
}

function renderTable() {
    const tbody = document.getElementById('product-table-body');
    tbody.innerHTML = '';
    
    products.forEach(p => {
        // Si no hay imagen, usar un placeholder de color
        const imgDisplay = p.image 
            ? `<img src="${p.image}" class="preview-img">` 
            : `<div class="preview-img" style="display:flex;align-items:center;justify-content:center;font-size:0.7rem;">Sin Foto</div>`;

        const row = `
            <tr>
                <td>${imgDisplay}</td>
                <td>
                    ${p.name}
                </td>
                <td>
                    $${p.price.toFixed(2)}
                    ${p.discount > 0 ? `<br><small style="color:#ef4444; font-weight:bold;">-${p.discount}% OFF</small>` : ''}
                </td>
                <td>${(p.stock !== undefined && p.stock !== null && p.stock !== "") ? p.stock : '∞'}</td>
                <td>
                    <button class="btn" style="width: auto; padding: 0.5rem 1rem; font-size: 0.8rem; margin-right: 0.5rem; background-color: #2563eb;" onclick="openEditModal('${p.id}')">Editar</button>
                    <button class="btn btn-danger" onclick="deleteProduct('${p.id}')">Borrar</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

async function addProduct(e) {
    e.preventDefault();
    const name = document.getElementById('prod-name').value;
    const price = parseFloat(document.getElementById('prod-price').value);
    const discount = parseFloat(document.getElementById('prod-discount').value) || 0;
    const stockVal = document.getElementById('prod-stock')?.value;
    const stock = (stockVal === "" || stockVal === undefined) ? null : parseInt(stockVal);
    const fileInput = document.getElementById('prod-img-file');
    const urlInput = document.getElementById('prod-img-url');

    let imageSrc = urlInput.value;

    // Si hay archivo, convertir a Base64
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onloadend = function() {
            saveProductToStorage(name, price, reader.result, discount, stock);
        }
        reader.readAsDataURL(file);
    } else {
        saveProductToStorage(name, price, imageSrc, discount, stock);
    }
}

async function saveProductToStorage(name, price, image, discount, stock) {
    const newProduct = {
        id: Date.now(), // ID único basado en tiempo (Revertido para estabilidad)
        name: name,
        price: price,
        image: image,
        discount: discount,
        stock: stock
    };
    
    products.push(newProduct);
    
    // Guardar en la nube
    await saveToCloud();
    
    // Reset form
    document.getElementById('prod-name').value = '';
    document.getElementById('prod-price').value = '';
    document.getElementById('prod-discount').value = '';
    document.getElementById('prod-img-file').value = '';
    document.getElementById('prod-img-url').value = '';
    if(document.getElementById('prod-stock')) document.getElementById('prod-stock').value = '';
    
    renderTable();
    checkStockAlerts();
    alert('Producto agregado correctamente');
}

// Función auxiliar para enviar todo a la nube
async function saveToCloud() {
    // NOTA DE REVISIÓN: Esta función envía la lista COMPLETA de productos al servidor
    // cada vez que se agrega, edita o elimina uno. Esto es muy ineficiente y puede
    // causar problemas de concurrencia si varios administradores trabajan a la vez.
    // Lo ideal es que el backend ofrezca endpoints para manejar un solo producto, por ejemplo:
    // - POST /api/products (para crear uno nuevo)
    // - PUT /api/products/{id} (para actualizar uno existente)
    try {
        const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(products)
        });
        if (!res.ok) {
            let errorMsg = 'No se pudo guardar';
            try {
                // Intenta obtener un error más detallado del cuerpo de la respuesta
                const errorBody = await res.json();
                // Busca propiedades comunes de error
                errorMsg = errorBody.details || errorBody.message || JSON.stringify(errorBody);
            } catch (e) {
                // Si el cuerpo no es JSON o está vacío, usa el texto de estado del HTTP
                errorMsg = `El servidor respondió con el código ${res.status} (${res.statusText})`;
            }
            alert('Error: ' + errorMsg);
        }
    } catch (e) {
        alert('Error de conexión. No se pudo contactar al servidor para guardar los cambios.');
    }
}
async function deleteProduct(id) {
    if(confirm('¿Estás seguro de eliminar este producto?')) {
        // NOTA DE REVISIÓN: Se usa '!=' porque los IDs pueden ser números (generados por Date.now()) o texto (de la DB).
        // Esto es una señal de datos inconsistentes. Todos los IDs deberían tener un tipo uniforme, preferiblemente string.
        products = products.filter(p => p.id != id);
        await saveToCloud();
        renderTable();
        checkStockAlerts();
    }
}

function renderDashboardStats() {
    const container = document.querySelector('main.container') || document.body;
    // Crear contenedor de stats si no existe
    if (!document.getElementById('kpi-dashboard')) {
        const dashboard = document.createElement('div');
        dashboard.id = 'kpi-dashboard';
        dashboard.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;";
        
        // Insertar después del título o al principio
        const title = container.querySelector('h1');
        if (title) title.insertAdjacentElement('afterend', dashboard);
        else container.insertBefore(dashboard, container.firstChild);
    }

    const dashboard = document.getElementById('kpi-dashboard');
    
    // Cálculos
    const totalIncome = allOrders.reduce((sum, o) => sum + (o.status !== 'Cancelado' ? o.total : 0), 0);
    const pendingOrders = allOrders.filter(o => o.status === 'En progreso' || o.status === 'Pendiente').length;
    const completedOrders = allOrders.filter(o => o.status === 'Entregado').length;
    const avgTicket = allOrders.length ? (totalIncome / allOrders.length) : 0;

    // Función helper para tarjetas
    const createCard = (title, value, color, icon) => `
        <div style="background: white; padding: 1.5rem; border-radius: 8px; border-left: 5px solid ${color}; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <div style="font-size: 0.9rem; color: #666; margin-bottom: 0.5rem;">${title}</div>
            <div style="font-size: 1.8rem; font-weight: bold; color: #333;">${value}</div>
        </div>
    `;

    dashboard.innerHTML = `
        ${createCard('💰 Ingresos Totales', `$${totalIncome.toFixed(2)}`, '#10b981')}
        ${createCard('⏳ Pedidos Pendientes', pendingOrders, '#f59e0b')}
        ${createCard('✅ Entregados', completedOrders, '#3b82f6')}
        ${createCard('📊 Ticket Promedio', `$${avgTicket.toFixed(2)}`, '#6366f1')}
    `;
}

async function renderOrders(filterText = '') {
    const container = document.getElementById('orders-list');
    if(!filterText) container.innerHTML = '<p>Cargando pedidos...</p>';

    try {
        // Si ya tenemos pedidos cargados y solo estamos filtrando, no hacemos fetch de nuevo
        if (allOrders.length === 0) {
            const response = await fetch('/api/orders');
            if (!response.ok) throw new Error('No se pudieron cargar los pedidos del servidor.');
            allOrders = await response.json();
        }

        // Filtrar pedidos
        const filteredOrders = allOrders.filter(order => {
            const search = filterText.toLowerCase();
            return (
                order.id.toLowerCase().includes(search) ||
                order.customer.name.toLowerCase().includes(search) ||
                order.customer.email.toLowerCase().includes(search)
            );
        });

        // Inyectar buscador si no existe
        if (!document.getElementById('order-search')) {
            const searchContainer = document.createElement('div');
            searchContainer.style.marginBottom = '1rem';
            searchContainer.innerHTML = `
                <input type="text" id="order-search" placeholder="🔍 Buscar pedido por ID, Nombre o Email..." 
                style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
            `;
            container.parentNode.insertBefore(searchContainer, container);
            
            // Evento de búsqueda
            document.getElementById('order-search').addEventListener('input', (e) => {
                renderOrders(e.target.value);
            });
        }

        if (filteredOrders.length === 0) {
            container.innerHTML = '<p style="color: #666;">No hay pedidos registrados aún.</p>';
            return;
        }

        // La API ya los devuelve ordenados (más recientes primero)
        container.innerHTML = filteredOrders.map(order => `
            <div class="order-card">
                <div class="order-header">
                    <span>📅 ${order.date}</span>
                    <span>Total: $${order.total.toFixed(2)}</span>
                </div>
                <div style="margin-bottom: 0.5rem; padding: 0.5rem; background: #eef2ff; border-radius: 4px;">
                    <strong style="display:block; margin-bottom:5px; font-size:0.85rem; color:#4b5563;">Cambiar Estado:</strong>
                    <div class="status-btn-group">
                        ${['En progreso', 'Aceptado', 'Enviado', 'Entregado'].map(status => `
                            <button class="status-btn ${order.status === status ? 'active' : ''}" 
                                    data-status="${status}"
                                    onclick="updateOrderStatus('${order.id}', '${status}')">
                                ${status === 'Entregado' ? '✅' : ''} ${status}
                            </button>
                        `).join('')}
                    </div>
                </div>
                <div style="font-size: 0.9rem; line-height: 1.6;">
                    <p><strong>Cliente:</strong> ${order.customer.name}</p>
                    <p><strong>Teléfono:</strong> ${order.customer.phone}</p>
                    <p><strong>Dirección:</strong> ${order.customer.address}</p>
                    <p><strong>Pago:</strong> ${order.customer.payment}</p>
                    <div style="margin-top: 0.5rem; background: white; padding: 0.5rem; border: 1px solid #eee;">
                        <strong>Productos:</strong>
                        <ul style="padding-left: 1.5rem; margin-top: 0.25rem;">
                            ${order.items.map(item => `<li>${item.quantity}x ${item.name}</li>`).join('')}
                        </ul>
                    </div>
                    <button class="btn btn-danger" style="margin-top: 1rem; width: auto;" onclick="deleteOrder('${order.id}')">Eliminar Pedido</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error al cargar pedidos:', error);
        container.innerHTML = `<p style="color: #ef4444;">${error.message}</p>`;
    }
}

async function updateOrderStatus(id, newStatus) {
    try {
        await fetch(`/api/orders/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        // Actualizar el estado en allOrders localmente
        const order = allOrders.find(o => o.id === id);
        if (order) {
            order.status = newStatus;
        }
        // Recargar para ver el cambio visual en los botones
        renderOrders(document.getElementById('order-search')?.value || '');
    } catch (error) {
        alert('Error al actualizar el estado en la base de datos.');
    }
}

async function deleteOrder(id) {
    if(confirm('¿Estás seguro de eliminar este pedido de la base de datos?')) {
        try {
            await fetch(`/api/orders/${id}`, { method: 'DELETE' });
            // Remover el pedido de allOrders localmente
            allOrders = allOrders.filter(o => o.id !== id);
            renderOrders(); // Recargar la lista
        } catch (error) {
            alert('Error al eliminar el pedido.');
        }
    }
}

function exportOrdersToCSV() {
    if (allOrders.length === 0) {
        return alert("No hay pedidos para exportar.");
    }

    const headers = [
        "OrderID", "Date", "Status", "CustomerName", "CustomerEmail", "CustomerPhone", "CustomerAddress",
        "PaymentMethod", "Total", "Products"
    ];

    const csvRows = allOrders.map(order => {
        const customer = order.customer;
        const productsStr = order.items.map(item => `${item.quantity}x ${item.name}`).join('; ');

        // Escapar comas y comillas para evitar errores en el CSV
        const escape = (str) => `"${String(str || '').replace(/"/g, '""')}"`;

        const row = [
            order.id, order.date, order.status, customer.name, customer.email, customer.phone,
            escape(customer.address), customer.payment, order.total.toFixed(2), escape(productsStr)
        ];
        return row.join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `pedidos_lvs_shop_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- FUNCIÓN DE ALERTA DE STOCK ---
function checkStockAlerts() {
    const outOfStock = products.filter(p => p.stock !== null && p.stock !== undefined && p.stock !== "" && parseInt(p.stock) <= 0);
    const alertBox = document.getElementById('stock-alert');
    
    if (outOfStock.length > 0) {
        const msg = `<strong>⚠️ Alerta de Stock:</strong> Hay ${outOfStock.length} producto(s) agotado(s) que no se muestran en la tienda.`;
        if (!alertBox) {
            const div = document.createElement('div');
            div.id = 'stock-alert';
            div.style.cssText = "background: #fee2e2; color: #991b1b; padding: 1rem; margin-bottom: 1rem; border-radius: 8px; border: 1px solid #fca5a5; display: flex; align-items: center; gap: 10px;";
            div.innerHTML = msg;
            const container = document.querySelector('main.container') || document.body;
            container.insertBefore(div, container.firstChild);
        } else {
            alertBox.innerHTML = msg;
        }
    } else if (alertBox) {
        alertBox.remove();
    }
}

// Funciones del Modal de Edición
const editModal = document.getElementById('edit-modal');

function openEditModal(id) {
    // Usamos == para encontrarlo ya sea texto o número
    const product = products.find(p => p.id == id);
    if (!product) return;

    document.getElementById('edit-id').value = product.id;
    document.getElementById('edit-name').value = product.name;
    document.getElementById('edit-price').value = product.price;
    document.getElementById('edit-discount').value = product.discount || 0;

    // --- Inyectar campo STOCK en Modal ---
    const form = document.querySelector('#edit-modal form');
    let stockContainer = document.getElementById('edit-stock-container');
    if (!stockContainer) {
        stockContainer = document.createElement('div');
        stockContainer.id = 'edit-stock-container';
        stockContainer.innerHTML = `<label for="edit-stock">Stock (Dejar vacío para infinito)</label><input type="number" id="edit-stock" class="input-field" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">`;
        form.insertBefore(stockContainer, form.querySelector('#edit-promo-container') || form.lastElementChild);
    }
    document.getElementById('edit-stock').value = (product.stock !== undefined && product.stock !== null) ? product.stock : '';

    // --- Inyectar Checkbox de Promoción ---
    let promoContainer = document.getElementById('edit-promo-container');
    
    if (!promoContainer) {
        promoContainer = document.createElement('div');
        promoContainer.id = 'edit-promo-container';
        promoContainer.style.cssText = "margin-top: 1rem; padding: 0.5rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px;";
        // Insertar antes de los botones (asumiendo que los botones son el último elemento del form)
        form.insertBefore(promoContainer, form.lastElementChild);
    }

    const isPromo = product.id == globalPromoProductId;
    
    promoContainer.innerHTML = `
        <label style="display:flex; align-items:center; gap:10px; cursor:pointer; color: #166534; font-weight: 500;">
            <input type="checkbox" id="edit-is-promo" ${isPromo ? 'checked' : ''}>
            <span>🌟 Activar promoción "Más compras, más barato"</span>
        </label>
        <small style="display:block; margin-top:4px; color:#166534;">
            Si activas esto, este producto bajará de precio según la cantidad (2 items = $2 menos, etc).
        </small>
    `;
    
    editModal.classList.add('active');
}

function closeEditModal() {
    editModal.classList.remove('active');
}

async function saveEdit(e) {
    e.preventDefault();
    const idInput = document.getElementById('edit-id').value;
    // Buscar producto (puede ser ID numérico viejo o texto nuevo)
    const productIndex = products.findIndex(p => p.id == idInput);
    
    if (productIndex > -1) {
        const p = products[productIndex];
        
        p.name = document.getElementById('edit-name').value;
        p.price = parseFloat(document.getElementById('edit-price').value);
        p.discount = parseFloat(document.getElementById('edit-discount').value) || 0;
        const stockVal = document.getElementById('edit-stock').value;
        p.stock = (stockVal === "" || stockVal === undefined) ? null : parseInt(stockVal);
        
        // --- Lógica de Promoción ---
        const isPromoChecked = document.getElementById('edit-is-promo').checked;
        
        if (isPromoChecked) {
            // Si se marca, este producto es el nuevo "Producto Estrella"
            globalPromoProductId = p.id;
            await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'promo_product_id', value: p.id }) });
        } else if (globalPromoProductId == p.id) {
            // Si se desmarca Y era el producto estrella, quitamos la promo
            globalPromoProductId = '';
            await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'promo_product_id', value: '' }) });
        }
        
        await saveToCloud();
        renderTable();
        checkStockAlerts();
        closeEditModal();
    }
}

function renderSalesChart() {
    const orders = allOrders;
    if (orders.length === 0) return;

    // Crear contenedor del gráfico si no existe para evitar errores
    if (!document.getElementById('sales-chart-container')) {
        const container = document.querySelector('main.container') || document.body;
        const chartDiv = document.createElement('div');
        chartDiv.id = 'sales-chart-container';
        chartDiv.style.cssText = "background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-top: 2rem;";
        chartDiv.innerHTML = '<canvas id="salesChart"></canvas>';
        
        // Insertar después del dashboard de KPIs
        const kpi = document.getElementById('kpi-dashboard');
        if (kpi) kpi.parentNode.insertBefore(chartDiv, kpi.nextSibling);
        else container.appendChild(chartDiv);
    }

    const salesByDate = orders.reduce((acc, order) => {
        // Normalizamos la fecha para agrupar correctamente
        const date = new Date(order.date).toLocaleDateString('es-ES');
        acc[date] = (acc[date] || 0) + order.total;
        return acc;
    }, {});

    const chartLabels = Object.keys(salesByDate);
    const chartData = Object.values(salesByDate);

    const ctx = document.getElementById('salesChart').getContext('2d');
    if (window.mySalesChart) {
        window.mySalesChart.destroy();
    }
    window.mySalesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Ventas por Día ($)',
                data: chartData,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                borderRadius: 4,
            }]
        },
        options: { scales: { y: { beginAtZero: true } } }
    });
}