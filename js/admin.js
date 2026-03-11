// Variable global
let products = [];
let allOrders = []; // Variable para guardar los pedidos cargados
let globalPromoProductId = ''; // Variable para saber cuál es el producto en promo
let quillEdit; // Editor para editar
let tempImages = []; // Array temporal para gestionar imágenes antes de guardar
let tempVideo = ''; // Variable temporal para el video

// Cargar productos desde la nube al iniciar
async function initAdmin() {
    try {
        const res = await fetch('/api/products');
        if (res.ok) {
            products = await res.json();
            
            // --- CARGAR EDITOR TIPO WORD (Quill.js) ---
            if (!document.getElementById('quill-css')) {
                const link = document.createElement('link'); link.id = 'quill-css'; link.rel = 'stylesheet'; link.href = 'https://cdn.quilljs.com/1.3.6/quill.snow.css'; document.head.appendChild(link);
                const script = document.createElement('script'); script.src = 'https://cdn.quilljs.com/1.3.6/quill.js'; 
                script.onload = initEditors; // Iniciar editores cuando cargue el script
                document.head.appendChild(script);
            }
            
            // Nueva estructura con pestañas
            renderAdminLayout();

            checkStockAlerts(); // Verificar alertas de stock (se mostrará arriba de las pestañas)
            
            // Cargar datos principales
            await renderOrders(); // Cargar pedidos y esperar

            // Poblar las pestañas con su contenido
            renderDashboardView();
            renderProductsView();
            renderOrdersView();
            renderSettingsView();
        }
    } catch (e) {
        console.error("Error cargando productos", e);
    }
}
initAdmin();

// --- LÓGICA DE PESTAÑAS ---
window.switchAdminTab = function(tabName) {
    // Botones
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    // Paneles
    document.querySelectorAll('.admin-tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === `${tabName}-view`);
    });
}

function renderAdminLayout() {
    const container = document.querySelector('main.container') || document.body;
    container.innerHTML = `
        <h1>Panel de Control</h1>
        <div id="stock-alert-container"></div>
        
        <div class="admin-tabs">
            <button class="admin-tab-btn active" data-tab="dashboard" onclick="switchAdminTab('dashboard')">📈 Dashboard</button>
            <button class="admin-tab-btn" data-tab="products" onclick="switchAdminTab('products')">📦 Productos</button>
            <button class="admin-tab-btn" data-tab="orders" onclick="switchAdminTab('orders')">🛒 Pedidos</button>
            <button class="admin-tab-btn" data-tab="settings" onclick="switchAdminTab('settings')">⚙️ Configuración</button>
        </div>

        <div id="admin-tab-content">
            <div id="dashboard-view" class="admin-tab-pane active"></div>
            <div id="products-view" class="admin-tab-pane"></div>
            <div id="orders-view" class="admin-tab-pane"></div>
            <div id="settings-view" class="admin-tab-pane"></div>
        </div>
    `;
}

// Función para iniciar los editores de texto
function initEditors() {
    // Editor para el modal de EDITAR. Se inicializa una vez que el script de Quill ha cargado.
    if (document.getElementById('edit-editor-container') && !quillEdit) {
        quillEdit = new Quill('#edit-editor-container', { 
            theme: 'snow',
            placeholder: 'Detalles del producto, características, etc.'
        });
    }
}

// Inyectar estilos para los botones de estado
const adminStyle = document.createElement('style');
adminStyle.innerHTML = `
    /* --- Estilos para Pestañas del Admin --- */
    .admin-tabs {
        display: flex;
        gap: 0.5rem;
        border-bottom: 2px solid #e5e7eb;
        margin-bottom: 2rem;
    }
    .admin-tab-btn {
        padding: 1rem 1.5rem;
        border: none;
        background: none;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 600;
        color: #6b7280;
        position: relative;
        transition: color 0.2s;
    }
    .admin-tab-btn:hover { color: #111827; }
    .admin-tab-btn.active { color: #111827; }
    .admin-tab-btn.active::after {
        content: '';
        position: absolute;
        bottom: -2px;
        left: 0;
        width: 100%;
        height: 2px;
        background-color: #111827;
    }
    .admin-tab-pane { display: none; }
    .admin-tab-pane.active { display: block; animation: fadeIn 0.5s; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

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

    /* Hacer el modal de edición más grande y con scroll */
    #edit-modal .modal-content {
        max-width: 800px; /* Más ancho */
        max-height: 90vh; /* Altura máxima */
        overflow-y: auto; /* Scroll si es necesario */
        padding: 2rem;
    }
    #edit-modal form {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
        grid-template-areas: 
            "col1 col2"
            "actions actions";
    }
    .form-columns { display: contents; } /* Permite que los hijos directos se unan al grid del form */
    .form-column { display: flex; flex-direction: column; gap: 1rem; }
    .form-row { display: flex; gap: 1rem; }
    .form-row > .form-group { flex: 1; }
    .form-actions {
        grid-area: actions;
        display: flex;
        gap: 1rem;
        margin-top: 1.5rem;
    }
    @media (max-width: 900px) {
        #edit-modal form {
            grid-template-columns: 1fr;
            grid-template-areas: 
                "col1"
                "col2"
                "actions";
        }
    }

    /* --- ESTILOS DEL EDITOR MEJORADO Y GALERÍA --- */
    .admin-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    @media (max-width: 768px) { .admin-form-grid { grid-template-columns: 1fr; } }
    
    .image-manager { border: 2px dashed #ddd; padding: 15px; border-radius: 8px; background: #fafafa; margin-top: 10px; }
    .image-manager h4 { margin-top: 0; font-size: 0.9rem; color: #666; }
    .img-input-group { display: flex; gap: 10px; margin-bottom: 10px; }
    .img-preview-list { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 5px; }
    .img-preview-item { position: relative; width: 80px; height: 80px; border-radius: 6px; overflow: hidden; border: 1px solid #eee; flex-shrink: 0; }
    .img-preview-item img { width: 100%; height: 100%; object-fit: cover; }
    .img-remove-btn { 
        position: absolute; top: 2px; right: 2px; background: rgba(255,0,0,0.8); color: white; 
        border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 12px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
    }
    
    /* Estilo para el input de archivo personalizado */
    .custom-file-upload {
        border: 1px solid #ccc;
        display: inline-block;
        padding: 8px 12px;
        cursor: pointer;
        background-color: #f9f9f9;
        border-radius: 6px;
        text-align: center;
        width: 100%;
        font-weight: 500;
        color: #333;
    }
    .custom-file-upload:hover { background-color: #f0f0f0; }
    
    /* Mejoras visuales generales para inputs */
    input[type="text"], input[type="number"], select {
        width: 100%; padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 10px; box-sizing: border-box;
    }
    label { font-weight: 600; font-size: 0.9rem; color: #374151; margin-bottom: 4px; display: block; }
    
    /* Ocultar inputs viejos de imagen para usar el nuevo gestor */
    #edit-img-url, input[type="file"] { display: none; }
`;
document.head.appendChild(adminStyle);

// --- FUNCIONES PARA POBLAR PESTAÑAS ---
function renderDashboardView() {
    const container = document.getElementById('dashboard-view');
    container.innerHTML = `
        <div id="kpi-dashboard"></div>
        <div id="sales-chart-container" style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-top: 2rem;">
            <canvas id="salesChart"></canvas>
        </div>
    `;
    renderDashboardStats();
    renderSalesChart();
}

function renderProductsView() {
    const container = document.getElementById('products-view');
    container.innerHTML = `
        <div id="header-actions"></div>
        <div class="table-container">
            <table class="product-table">
                <thead>
                    <tr>
                        <th>Imagen</th>
                        <th>Nombre</th>
                        <th>Precio</th>
                        <th>Stock</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="product-table-body"></tbody>
            </table>
        </div>
    `;
    renderHeaderActions();
    renderTable();
}

function renderOrdersView() {
    const container = document.getElementById('orders-view');
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">
            <div id="order-search-container" style="flex-grow: 1;"></div>
            <button class="btn" onclick="exportOrdersToCSV()" style="padding: 10px 15px; font-size: 0.9rem;">Exportar a CSV</button>
        </div>
        <div id="orders-list"></div>
    `;
    renderOrders();
}

function renderSettingsView() {
    const container = document.getElementById('settings-view');
    container.innerHTML = `<div id="settings-panel"></div>`;
    renderSettingsPanel();
}

// --- LÓGICA DE CONFIGURACIÓN (PROMOCIONES) ---
async function renderSettingsPanel() {
    const panel = document.getElementById('settings-panel');
    if (panel) {
        panel.style.cssText = "background: #f9fafb; padding: 2rem; border-radius: 8px; border: 1px solid #e5e7eb;";
        
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
                    <input type="checkbox" id="promo-toggle" ${isPromoActive ? 'checked' : ''} style="width: 20px; height: 20px;">
                    <span>Activar <strong>5% de Descuento</strong> automático para usuarios logueados.</span>
                </label>
            </div>
        `;

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

function renderHeaderActions() {
    const container = document.getElementById('header-actions');
    if (container && !container.querySelector('#add-product-btn')) {
        const btn = document.createElement('button');
        btn.id = 'add-product-btn';
        btn.className = 'btn';
        btn.innerHTML = '＋ Agregar Nuevo Producto';
        btn.style.cssText = "margin-bottom: 1.5rem; background-color: #000; color: #fff; padding: 12px 24px; font-size: 1rem;";
        btn.onclick = () => openProductModal(); // Abrir modal vacío
        container.appendChild(btn);
    }
}

function renderTable() {
    const tbody = document.getElementById('product-table-body');
    tbody.innerHTML = '';
    
    products.forEach(p => {
        // Si no hay imagen, usar un placeholder de color
        // Soporte para array de imágenes o string antiguo
        const mainImage = (p.images && p.images.length > 0) ? p.images[0] : (p.image || '');
        
        const imgDisplay = mainImage 
            ? `<img src="${mainImage}" class="preview-img">` 
            : `<div class="preview-img" style="display:flex;align-items:center;justify-content:center;font-size:0.7rem;">Sin Foto</div>`;

        const row = `
            <tr>
                <td>${imgDisplay}</td>
                <td>
                    <strong style="font-size: 1rem;">${p.name}</strong>
                </td>
                <td>
                    $${p.price.toFixed(2)}
                    ${p.discount > 0 ? `<br><small style="color:#ef4444; font-weight:bold;">-${p.discount}% OFF</small>` : ''}
                </td>
                <td>${(p.stock !== undefined && p.stock !== null && p.stock !== "") ? p.stock : '∞'}</td>
                <td>
                    <button class="btn" style="width: auto; padding: 0.5rem 1rem; font-size: 0.8rem; margin-right: 0.5rem; background-color: #2563eb;" onclick="openProductModal('${p.id}')">Editar</button>
                    <button class="btn btn-danger" onclick="deleteProduct('${p.id}')">Borrar</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

async function deleteProduct(id) {
    if(confirm('¿Estás seguro de eliminar este producto?')) {
        try {
            const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('El servidor no pudo eliminar el producto.');
            products = products.filter(p => p.id != id);
            renderTable();
            checkStockAlerts();
        } catch (e) {
            alert('Error al eliminar el producto: ' + e.message);
        }
    }
}

function renderDashboardStats() {
    const dashboard = document.getElementById('kpi-dashboard');
    if (!dashboard) return;

    dashboard.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;";
    
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
    const listContainer = document.getElementById('orders-list');
    const searchContainer = document.getElementById('order-search-container');
    if(!filterText && listContainer) listContainer.innerHTML = '<p>Cargando pedidos...</p>';

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
        if (searchContainer && !searchContainer.querySelector('#order-search')) {
            searchContainer.innerHTML = `
                <input type="text" id="order-search" placeholder="🔍 Buscar pedido por ID, Nombre o Email..." 
                style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
            `;
            
            // Evento de búsqueda
            document.getElementById('order-search').addEventListener('input', (e) => {
                renderOrders(e.target.value);
            });
        }

        if (filteredOrders.length === 0 && listContainer) {
            listContainer.innerHTML = '<p style="color: #666; text-align: center; padding: 2rem;">No se encontraron pedidos.</p>';
            return;
        }

        // La API ya los devuelve ordenados (más recientes primero)
        if (listContainer) listContainer.innerHTML = filteredOrders.map(order => `
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
        if (listContainer) listContainer.innerHTML = `<p style="color: #ef4444;">${error.message}</p>`;
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
    const alertContainer = document.getElementById('stock-alert-container');
    if (!alertContainer) return;
    
    if (outOfStock.length > 0) {
        const msg = `<strong>⚠️ Alerta de Stock:</strong> Hay ${outOfStock.length} producto(s) agotado(s) que no se muestran en la tienda.`;
        alertContainer.innerHTML = `<div id="stock-alert" style="background: #fffbe6; color: #92400e; padding: 1rem; margin-bottom: 1.5rem; border-radius: 8px; border: 1px solid #fde68a; display: flex; align-items: center; gap: 10px;">${msg}</div>`;
    } else {
        alertContainer.innerHTML = '';
    }
}

// Funciones del Modal de Edición
const editModal = document.getElementById('edit-modal');

function openProductModal(id = null) {
    const modalTitle = editModal.querySelector('h2') || editModal.querySelector('h3');
    
    if (id) {
        // MODO EDITAR
        const product = products.find(p => p.id == id);
        if (!product) return;
        
        if(modalTitle) modalTitle.innerText = 'Editar Producto';
        document.getElementById('edit-id').value = product.id;
        document.getElementById('edit-name').value = product.name;
        document.getElementById('edit-price').value = product.price;
        document.getElementById('edit-discount').value = product.discount || 0;
        
        tempImages = product.images || (product.image ? [product.image] : []);
        if (quillEdit) quillEdit.root.innerHTML = product.description || '';
        
        // Video
        tempVideo = product.video || '';
        
        // Stock
        if(document.getElementById('edit-stock')) document.getElementById('edit-stock').value = (product.stock !== undefined && product.stock !== null) ? product.stock : '';
        
        // Promo
        if(document.getElementById('edit-is-promo')) document.getElementById('edit-is-promo').checked = (product.id == globalPromoProductId);

    } else {
        // MODO AGREGAR
        if(modalTitle) modalTitle.innerText = 'Nuevo Producto';
        document.getElementById('edit-id').value = ''; // ID vacío indica nuevo
        document.getElementById('edit-name').value = '';
        document.getElementById('edit-price').value = '';
        document.getElementById('edit-discount').value = '';
        
        tempImages = [];
        if (quillEdit) quillEdit.setContents([]);
        
        tempVideo = '';
        if(document.getElementById('edit-stock')) document.getElementById('edit-stock').value = '';
        if(document.getElementById('edit-is-promo')) document.getElementById('edit-is-promo').checked = false;
    }
    
    // Renderizar gestores de imagen separados
    renderSeparatedImageUIs();
    updateVideoUI(); // Actualizar UI del video

    editModal.classList.add('active');
}

function closeEditModal() {
    editModal.classList.remove('active');
}

async function saveProductModal(e) {
    e.preventDefault();
    const idInput = document.getElementById('edit-id').value;
    
    let productPayload;
    let url = '/api/products';
    let method = 'POST';

    if (idInput) {
        // --- ACTUALIZAR EXISTENTE ---
        url = `/api/products/${idInput}`;
        method = 'PUT';
        productPayload = {
            id: idInput,
            name: document.getElementById('edit-name').value,
            price: parseFloat(document.getElementById('edit-price').value),
            discount: parseFloat(document.getElementById('edit-discount').value) || 0,
            stock: (document.getElementById('edit-stock').value === "" || document.getElementById('edit-stock').value === undefined) ? null : parseInt(document.getElementById('edit-stock').value),
            description: quillEdit ? quillEdit.root.innerHTML : '',
            images: [...tempImages],
            image: tempImages.length > 0 ? tempImages[0] : '',
            video: tempVideo
        };
        
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
    } else {
        // --- CREAR NUEVO ---
        productPayload = {
            id: Date.now(),
            name: document.getElementById('edit-name').value,
            price: parseFloat(document.getElementById('edit-price').value),
            discount: parseFloat(document.getElementById('edit-discount').value) || 0,
            stock: (document.getElementById('edit-stock').value === "" || document.getElementById('edit-stock').value === undefined) ? null : parseInt(document.getElementById('edit-stock').value),
            description: quillEdit ? quillEdit.root.innerHTML : '',
            images: [...tempImages],
            image: tempImages.length > 0 ? tempImages[0] : '',
            video: tempVideo
        };
    }

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productPayload)
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || `El servidor respondió con un error ${res.status}`);
        }

        const savedProduct = await res.json();

        if (idInput) { // Si fue una actualización, reemplazamos el producto en el array local
            const index = products.findIndex(p => p.id == idInput);
            if (index !== -1) products[index] = savedProduct;
        } else { // Si fue una creación, lo añadimos
            products.push(savedProduct);
        }

        renderTable();
        checkStockAlerts();
        closeEditModal();

    } catch (error) {
        console.error('Error al guardar el producto:', error);
        alert('No se pudo guardar el producto: ' + error.message);
    }
}

function renderSalesChart() {
    const orders = allOrders;
    const chartContainer = document.getElementById('sales-chart-container');
    if (orders.length === 0 || !chartContainer) {
        if(chartContainer) chartContainer.innerHTML = '<p style="text-align:center; color:#666;">No hay datos de ventas para mostrar el gráfico.</p>';
        return;
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

// --- GESTOR DE IMÁGENES (Lógica Nueva con separación) ---

function renderSeparatedImageUIs() {
    const container = document.querySelector('#edit-modal .image-manager');
    if (!container) return;

    container.innerHTML = `
        <div class="main-image-manager">
            <h4>Foto del Producto (Principal)</h4>
            <div class="img-input-group">
                <input type="text" id="main-img-url-edit" placeholder="Añadir URL de imagen">
                <button type="button" class="btn" style="padding: 8px 12px; font-size: 0.8rem;" onclick="setMainImageFromUrl()">Añadir</button>
            </div>
            <div class="img-input-group" style="margin-top: 10px;">
                <label for="main-img-file-edit" class="custom-file-upload">Subir desde archivo</label>
                <input type="file" id="main-img-file-edit" onchange="setMainImageFromFile(this)">
            </div>
            <div id="main-img-preview-container" class="img-preview-list" style="margin-top: 10px; justify-content: flex-start;"></div>
        </div>
        <hr style="margin: 2rem 0; border: none; border-top: 1px solid #e5e7eb;">
        <div class="gallery-image-manager">
            <h4>Fotos para la Galería (Adicionales)</h4>
            <div class="img-input-group">
                <input type="text" id="gallery-img-url-edit" placeholder="Añadir URL de imagen">
                <button type="button" class="btn" style="padding: 8px 12px; font-size: 0.8rem;" onclick="addGalleryImageFromUrl()">Añadir</button>
            </div>
            <div class="img-input-group" style="margin-top: 10px;">
                <label for="gallery-img-file-edit" class="custom-file-upload">Subir desde archivo (múltiples)</label>
                <input type="file" id="gallery-img-file-edit" onchange="addGalleryImageFromFile(this)" multiple>
            </div>
            <div id="gallery-img-preview-list" class="img-preview-list" style="margin-top: 10px;"></div>
        </div>
    `;

    renderMainImagePreview();
    renderGalleryImagePreview();
}

function renderMainImagePreview() {
    const container = document.getElementById('main-img-preview-container');
    if (!container) return;
    const mainImage = tempImages[0];
    if (mainImage) {
        container.innerHTML = `
            <div class="img-preview-item">
                <img src="${mainImage}">
                <button type="button" class="img-remove-btn" onclick="removeMainImage()">&times;</button>
            </div>
        `;
    } else {
        container.innerHTML = '<p style="font-size: 0.8rem; color: #888;">No hay imagen principal.</p>';
    }
}

function renderGalleryImagePreview() {
    const container = document.getElementById('gallery-img-preview-list');
    if (!container) return;
    const galleryImages = tempImages.slice(1);
    container.innerHTML = galleryImages.map((img, index) => `
        <div class="img-preview-item">
            <img src="${img}">
            <button type="button" class="img-remove-btn" onclick="removeGalleryImage(${index})">&times;</button>
        </div>
    `).join('');
}

window.setMainImageFromUrl = function() {
    const input = document.getElementById('main-img-url-edit');
    if (input && input.value) {
        tempImages.length > 0 ? tempImages[0] = input.value : tempImages.unshift(input.value);
        input.value = '';
        renderMainImagePreview();
    }
}

window.setMainImageFromFile = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            tempImages.length > 0 ? tempImages[0] = e.target.result : tempImages.unshift(e.target.result);
            renderMainImagePreview();
        };
        reader.readAsDataURL(input.files[0]);
        input.value = '';
    }
}

window.addGalleryImageFromUrl = function() {
    const input = document.getElementById('gallery-img-url-edit');
    if (input && input.value) {
        tempImages.push(input.value);
        input.value = '';
        renderGalleryImagePreview();
    }
}

window.addGalleryImageFromFile = function(input) {
    if (input.files && input.files.length > 0) {
        Array.from(input.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                tempImages.push(e.target.result);
                renderGalleryImagePreview();
            };
            reader.readAsDataURL(file);
        });
        input.value = '';
    }
}

window.removeMainImage = function() {
    tempImages.shift();
    renderMainImagePreview();
    renderGalleryImagePreview();
}

window.removeGalleryImage = function(galleryIndex) {
    // El índice de la galería es relativo a las imágenes después de la principal
    tempImages.splice(galleryIndex + 1, 1);
    renderGalleryImagePreview();
}

// --- FUNCIONES AUXILIARES VIDEO ---
function updateVideoUI() {
    const input = document.getElementById('edit-video');
    const msg = document.getElementById('video-preview-msg');
    if(input) input.value = tempVideo.startsWith('data:') ? '' : tempVideo;
    if(msg) {
        if (tempVideo.startsWith('data:video')) {
            msg.innerText = '✅ Video cargado desde archivo.';
        } else if (tempVideo.startsWith('data:image')) {
            msg.innerText = '✅ Imagen cargada desde archivo.';
        } else if (tempVideo) {
            msg.innerText = '🔗 Video vinculado por URL.';
        } else {
            msg.innerText = '';
        }
    }
}

window.handleVideoUpload = function(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        const msg = document.getElementById('video-preview-msg');
        if(msg) msg.innerText = "Cargando video...";
        
        reader.onload = function(e) {
            tempVideo = e.target.result;
            updateVideoUI();
        };
        reader.readAsDataURL(file);
    }
}