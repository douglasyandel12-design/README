// Variable global
let products = [];
let allOrders = []; // Variable para guardar los pedidos cargados
let quillEdit; // Editor para editar
let tempImages = []; // Array temporal para gestionar imágenes antes de guardar
let tempVideo = ''; // Variable temporal para el video
let cropInstance = null;
let cropResolve = null;

// Helper function for debouncing, add at the top of the file
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

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

    /* --- Estilos Tabla de Productos --- */
    .table-container { overflow-x: auto; }
    .product-table { width: 100%; border-collapse: collapse; min-width: 600px; }
    .product-table th, .product-table td {
        padding: 1rem;
        text-align: left;
        border-bottom: 1px solid #e5e7eb;
        vertical-align: middle;
    }
    .product-table th {
        background-color: #f9fafb;
        font-weight: 600;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #6b7280;
    }
    .preview-img {
        width: 60px;
        height: 60px;
        object-fit: cover;
        border-radius: 6px;
        background: #f3f4f6;
        color: #9ca3af;
    }
    .product-table .btn {
        padding: 0.5rem 1rem;
        font-size: 0.8rem;
        width: auto;
    }
    .product-table .btn-danger {
        background-color: #ef4444;
        color: white;
        border: none;
    }

    /* --- Responsive para Tabla de Productos --- */
    @media screen and (max-width: 768px) {
        .product-table thead {
            display: none; /* Ocultar encabezados en móvil */
        }
        .product-table, .product-table tbody, .product-table tr, .product-table td {
            display: block;
            width: 100%;
        }
        .product-table tr {
            margin-bottom: 1rem;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .product-table td {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #f3f4f6;
            text-align: right; /* Alinear contenido a la derecha */
        }
        .product-table td:last-child { border-bottom: none; background-color: #f9fafb; }
        .product-table td::before { content: attr(data-label); font-weight: 600; text-align: left; margin-right: 1rem; color: #374151; }
        .product-table td:first-child { background-color: #f9fafb; justify-content: center; padding: 1rem; }
        .product-table td:first-child::before { display: none; }
    }

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

    /* --- Estilos para Toast/Notificación --- */
    .admin-toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: #111827; /* gray-900 */
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        display: flex;
        align-items: center;
        gap: 0.75rem;
        z-index: 9999;
        transform: translateY(100px);
        opacity: 0;
        transition: transform 0.5s cubic-bezier(0.215, 0.610, 0.355, 1), opacity 0.5s ease;
        font-weight: 500;
    }
    .admin-toast.show { transform: translateY(0); opacity: 1; }
    .admin-toast .toast-icon { font-size: 1.2rem; animation: popIn 0.5s cubic-bezier(0.215, 0.610, 0.355, 1) 0.2s forwards; transform: scale(0); }
    @keyframes popIn { 0% { transform: scale(0); } 80% { transform: scale(1.2); } 100% { transform: scale(1); } }

    /* --- SWEETALERT2 ADMIN THEME --- */
    div:where(.swal2-container) div:where(.swal2-popup) {
        border-radius: 12px !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    }
    div:where(.swal2-confirm) {
        background-color: #111827 !important; /* gray-900 */
    }
    div:where(.swal2-cancel) {
        background-color: #ef4444 !important;
        color: #ffffff !important;
    }

    /* --- Estilos para Acordeón de Configuración --- */
    .setting-accordion {
        border: 1px solid #ddd;
        border-radius: 6px;
        margin-bottom: 1.5rem;
        overflow: hidden;
    }
    .accordion-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        cursor: pointer;
        background: #fff;
    }
    .accordion-arrow { font-size: 1.2rem; transition: transform 0.3s; }
    .setting-accordion.open .accordion-arrow { transform: rotate(180deg); }
    .accordion-content { padding: 0 1rem 1rem 1rem; max-height: 0; overflow: hidden; transition: max-height 0.3s ease, padding 0.3s ease; }
    .setting-accordion.open .accordion-content { max-height: 200px; }
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
            <div id="order-search-container" style="flex-grow: 1;">
                <input type="text" id="order-search" placeholder="🔍 Buscar pedido por ID, Nombre o Email..." 
                style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
            </div>
            <div style="display: flex; gap: 0.5rem;">
                <button class="btn" onclick="forceRefreshOrders()" title="Recargar la lista de pedidos desde el servidor" style="padding: 10px 15px; font-size: 0.9rem; background-color: #f3f4f6; color: #374151; border-color: #d1d5db;">🔄 Refrescar</button>
                <button class="btn" onclick="exportOrdersToCSV()" style="padding: 10px 15px; font-size: 0.9rem;">Exportar a CSV</button>
            </div>
        </div>
        <div id="orders-list"></div>
    `;
    
    // Attach listener ONCE with debounce
    const debouncedRender = debounce((value) => renderOrders(value), 300);
    document.getElementById('order-search').addEventListener('input', (e) => {
        debouncedRender(e.target.value);
    });

    // Initial render
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
        let settings = {};
        try {
            const res = await fetch('/api/settings');
            settings = await res.json();
        } catch(e) { console.error(e); }

        const isLoginPromoActive = settings.promo_login_5 === true;
        const isProgressivePromoActive = settings.promo_progressive_active === true;
        const isProgressivePromoPublic = settings.promo_progressive_public === true;

        panel.innerHTML = `
            <h3>⚙️ Configuración Global de Promociones</h3>
            
            <div class="setting-accordion" style="background: #fff;">
                <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-weight: bold;">
                    <input type="checkbox" id="promo-toggle" ${isLoginPromoActive ? 'checked' : ''} style="width: 20px; height: 20px;">
                    <span>Activar <strong>Descuento para Socios</strong></span>
                </label>
            </div>

            <div class="setting-accordion">
                <div class="accordion-header" onclick="this.parentElement.classList.toggle('open')">
                    <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-weight: bold;" onclick="event.stopPropagation()">
                        <input type="checkbox" id="progressive-promo-toggle" ${isProgressivePromoActive ? 'checked' : ''} style="width: 20px; height: 20px;">
                        <span>🌟 Activar promoción "Más compras, más barato"</span>
                    </label>
                    <span class="accordion-arrow">▼</span>
                </div>
                <div class="accordion-content">
                    <p style="font-size: 0.9rem; color: #666; margin: 0.5rem 0 1rem 0;">Si activas esto, <strong>cualquier producto</strong> bajará de precio según la cantidad que se añada al carrito (ej: 2 items = $2 menos, 3 items = $3 menos, etc.).</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin-bottom: 1rem;">
                    <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                        <input type="checkbox" id="promo-progressive-public-toggle" ${isProgressivePromoPublic ? 'checked' : ''} style="width: 20px; height: 20px;">
                        <span>Permitir acceso a usuarios no registrados</span>
                    </label>
                    <small style="color: #666; display: block; margin-left: 30px;">Por defecto, esta promoción es solo para usuarios que han iniciado sesión.</small>
                </div>
            </div>
        `;

        // Evento de cambio
        document.getElementById('promo-toggle').addEventListener('change', async (e) => {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'promo_login_5', value: e.target.checked })
            });
            showAdminToast('Descuento para socios actualizado.');
        });

        const progressiveToggle = document.getElementById('progressive-promo-toggle');

        progressiveToggle.addEventListener('change', async (e) => {
            const isActive = e.target.checked;
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'promo_progressive_active', value: isActive })
            });
            // También limpiamos la configuración antigua del producto individual para mantener la base de datos limpia.
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'promo_product_id', value: '' })
            });
            showAdminToast('Promoción progresiva actualizada.');
        });

        document.getElementById('promo-progressive-public-toggle').addEventListener('change', async (e) => {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'promo_progressive_public', value: e.target.checked })
            });
            showAdminToast('Visibilidad de la promoción actualizada.');
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
                <td data-label="Imagen">${imgDisplay}</td>
                <td data-label="Nombre">
                    <strong style="font-size: 1rem;">${p.name}</strong>
                </td>
                <td data-label="Precio">
                    $${p.price.toFixed(2)}
                    ${p.discount > 0 ? `<br><small style="color:#ef4444; font-weight:bold;">-${p.discount}% OFF</small>` : ''}
                </td>
                <td data-label="Stock">${(p.stock !== undefined && p.stock !== null && p.stock !== "") ? p.stock : '∞'}</td>
                <td data-label="Acciones">
                    <div style="display: flex; gap: 0.5rem; justify-content: flex-end; flex-wrap: wrap;">
                        <button class="btn" style="background-color: #2563eb;" onclick="openProductModal('${p.id}')">Editar</button>
                        <button class="btn btn-danger" onclick="deleteProduct('${p.id}')">Borrar</button>
                    </div>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

async function deleteProduct(id) {
    Swal.fire({
        title: '¿Eliminar producto?',
        text: "Esta acción no se puede deshacer.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#ef4444', // Rojo para peligro
        cancelButtonColor: '#fff',
        reverseButtons: true
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('El servidor no pudo eliminar el producto.');
                products = products.filter(p => p.id != id);
                renderTable();
                checkStockAlerts();
                showAdminToast('Producto eliminado correctamente.');
            } catch (e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
    });
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
    if(!filterText && listContainer) listContainer.innerHTML = '<p>Cargando pedidos...</p>';

    try {
        // Si ya tenemos pedidos cargados y solo estamos filtrando, no hacemos fetch de nuevo
        if (allOrders.length === 0) {
            const response = await fetch('/api/orders');
            if (!response.ok) {
                if (response.status === 403 || response.status === 401) {
                    throw new Error('No tienes permisos de administrador.');
                }
                throw new Error('No se pudieron cargar los pedidos del servidor.');
            }
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

        if (filteredOrders.length === 0 && listContainer) {
            listContainer.innerHTML = '<p style="color: #666; text-align: center; padding: 2rem;">No se encontraron pedidos.</p>';
            return;
        }

        // La API ya los devuelve ordenados (más recientes primero)
        if (listContainer) listContainer.innerHTML = filteredOrders.map(order => `
            <div class="order-card" id="order-card-${order.id}">
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
                                    onclick="updateOrderStatus(this, '${order.id}', '${status}')">
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

async function updateOrderStatus(button, id, newStatus) {
    const buttonGroup = button.parentElement;
    const buttons = buttonGroup.querySelectorAll('.status-btn');
    const originalText = button.innerHTML;

    buttons.forEach(btn => btn.disabled = true);
    button.innerHTML = '...';

    try {
        const res = await fetch(`/api/orders/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (!res.ok) throw new Error('El servidor no pudo actualizar el estado.');

        const order = allOrders.find(o => o.id === id);
        if (order) order.status = newStatus;

        buttons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        showAdminToast('Estado del pedido actualizado.');

    } catch (error) {
        console.error('Error al actualizar el estado:', error);
        showAdminToast('❌ Error al actualizar.');
        button.innerHTML = originalText; // Restore original text on failure
    } finally {
        buttons.forEach(btn => {
            btn.disabled = false;
            // Restore all button texts in case they were changed
            const status = btn.dataset.status;
            btn.innerHTML = `${status === 'Entregado' ? '✅' : ''} ${status}`;
        });
    }
}

async function deleteOrder(id) {
    Swal.fire({
        title: '¿Eliminar este pedido?',
        text: "Esta acción es permanente y no se puede deshacer.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#fff',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('El servidor no pudo eliminar el pedido.');

                allOrders = allOrders.filter(o => o.id !== id);
                
                const orderCard = document.getElementById(`order-card-${id}`);
                if (orderCard) {
                    orderCard.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    orderCard.style.opacity = '0';
                    orderCard.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        orderCard.remove();
                        renderDashboardStats(); // Update stats after removing
                    }, 300);
                }

                showAdminToast('Pedido eliminado con éxito.');

            } catch (error) {
                Swal.fire('Error', 'No se pudo eliminar el pedido: ' + error.message, 'error');
            }
        }
    });
}

async function forceRefreshOrders() {
    const listContainer = document.getElementById('orders-list');
    const searchInput = document.getElementById('order-search');
    
    if(listContainer) listContainer.innerHTML = '<p>Refrescando pedidos...</p>';
    
    allOrders = []; // Clear local cache
    await renderOrders(searchInput ? searchInput.value : ''); // Re-fetch and render
    showAdminToast('Lista de pedidos actualizada.');
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

// --- FUNCIÓN DE NOTIFICACIÓN (TOAST) ---
function showAdminToast(message) {
    // Eliminar toast anterior si existe para evitar acumulación
    const existingToast = document.querySelector('.admin-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'admin-toast';
    toast.innerHTML = `<span class="toast-icon">✅</span> <span>${message}</span>`;
    document.body.appendChild(toast);

    // Pequeño delay para permitir que el DOM se actualice antes de la animación
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Ocultar y eliminar después de 3 segundos
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 500); // Esperar que la transición de salida termine
    }, 3000);
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

    // Ocultar el toggle de promoción individual que ya no se usa, ahora es global.
    // Esto es un parche porque el elemento HTML sigue existiendo en el archivo estático.
    const promoToggleEl = document.getElementById('edit-is-promo');
    if (promoToggleEl && promoToggleEl.parentElement) {
        // Ocultamos el elemento padre para ocultar también la etiqueta (label).
        promoToggleEl.parentElement.style.display = 'none';
    }
    
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

    let descriptionContent = quillEdit ? quillEdit.root.innerHTML : '';

    // SANITIZACIÓN CRÍTICA: Eliminar imágenes en base64 pegadas en el editor de texto.
    const base64ImageRegex = /<img src="data:image\/[^;]+;base64[^"]*">/g;
    if (descriptionContent.match(base64ImageRegex)) {
        descriptionContent = descriptionContent.replace(base64ImageRegex, '');
    }

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
            description: descriptionContent,
            images: [...tempImages],
            image: tempImages.length > 0 ? tempImages[0] : '',
            video: tempVideo
        };
    } else {
        // --- CREAR NUEVO ---
        productPayload = {
            id: Date.now(),
            name: document.getElementById('edit-name').value,
            price: parseFloat(document.getElementById('edit-price').value),
            discount: parseFloat(document.getElementById('edit-discount').value) || 0,
            stock: (document.getElementById('edit-stock').value === "" || document.getElementById('edit-stock').value === undefined) ? null : parseInt(document.getElementById('edit-stock').value),
            description: descriptionContent,
            images: [...tempImages],
            image: tempImages.length > 0 ? tempImages[0] : '',
            video: tempVideo
        };
    }

    const payloadString = JSON.stringify(productPayload);
    const payloadSizeMB = new Blob([payloadString]).size / 1024 / 1024;
    console.log(`DEBUG: Tamaño del payload a enviar: ${payloadSizeMB.toFixed(2)} MB`);

    // Vercel's limit is 4.5MB. Usamos un umbral de seguridad muy estricto de 2.5MB.
    if (payloadSizeMB > 2.5) {
        Swal.fire({
            icon: 'error',
            title: 'Contenido Demasiado Grande',
            text: `El tamaño total de los datos del producto (${payloadSizeMB.toFixed(2)} MB) supera el límite de 2.5 MB. Esto suele ocurrir por tener demasiadas imágenes. Por favor, reduce la cantidad o el peso de las imágenes e intenta de nuevo.`,
            confirmButtonColor: '#000',
            confirmButtonText: 'Entendido'
        });
        return; // Detener el envío
    }

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: payloadString
        });

        if (!res.ok) {
            let errorMessage = `El servidor respondió con un error ${res.status}`;
            try {
                const errorData = await res.json();
                errorMessage = errorData.message || errorMessage;
            } catch (jsonError) {
                // La respuesta no es JSON, no hacemos nada y nos quedamos con el mensaje de error original.
            }
            throw new Error(errorMessage);
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
        Swal.fire({
            icon: 'error',
            title: 'Error al Guardar',
            text: 'No se pudo guardar el producto: ' + error.message,
            confirmButtonColor: '#000',
            confirmButtonText: 'Cerrar'
        });
    }
}

// --- FUNCIÓN PARA COMPRIMIR IMÁGENES ---
function compressImage(file, options = {}) {
    return new Promise((resolve, reject) => {
        // Hacemos la compresión más agresiva para asegurar que quepa en el plan gratuito de Vercel.
        const { initialQuality = 0.8, maxWidth = 1024, maxHeight = 1024, targetSizeMB = 0.15 } = options; // 150KB por imagen como objetivo
        const targetSizeBytes = targetSizeMB * 1024 * 1024;

        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;
 
                // Redimensionar si es necesario
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }
 
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
 
                let quality = initialQuality;
                let dataUrl = canvas.toDataURL('image/jpeg', quality);
 
                // Bucle para reducir la calidad si la imagen supera el umbral
                while (dataUrl.length > targetSizeBytes && quality > 0.1) {
                    quality -= 0.1;
                    dataUrl = canvas.toDataURL('image/jpeg', quality);
                }
 
                // Si después de la compresión máxima sigue siendo muy grande, rechazamos.
                if (dataUrl.length > targetSizeBytes) {
                    return reject(new Error(`La imagen es muy pesada. Para reducir su tamaño, es recomendable tomarle una captura de pantalla a la imagen y subir la captura.`));
                }

                resolve(dataUrl);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
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
        if (tempImages.length >= 5) {
            Swal.fire('Límite alcanzado', 'Máximo 5 imágenes permitidas por producto.', 'info');
            return;
        }
        tempImages.length > 0 ? tempImages[0] = input.value : tempImages.unshift(input.value);
        input.value = '';
        renderMainImagePreview();
    }
}

window.setMainImageFromFile = async function(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        // VALIDACIÓN DE TIPO
        if (!file.type.startsWith('image/')) {
            Swal.fire('Archivo incorrecto', 'El archivo seleccionado no es una imagen válida (JPG/PNG).', 'error');
            input.value = '';
            return;
        }

        // VALIDACIÓN DE TAMAÑO (2MB)
        if (file.size > 2 * 1024 * 1024) {
            Swal.fire('Archivo muy pesado', 'La imagen no puede superar los 2MB.', 'warning');
            input.value = '';
            return;
        }

        if (tempImages.length >= 5) {
            Swal.fire('Límite alcanzado', 'Máximo 5 imágenes permitidas por producto.', 'info');
            input.value = '';
            return;
        }
        try {
            // RECORTE: Usamos promptCrop (NaN permite recorte libre)
            const croppedImage = await promptCrop(file, NaN);
            if (croppedImage) {
                tempImages.length > 0 ? tempImages[0] = croppedImage : tempImages.unshift(croppedImage);
                renderMainImagePreview();
            } else {
                // Si cancela, limpiamos el input para que pueda seleccionar de nuevo
                input.value = '';
            }
        } catch (error) {
            console.error("Error comprimiendo la imagen:", error);
            Swal.fire({
                icon: 'warning',
                title: 'Imagen muy pesada',
                text: error.message,
                confirmButtonColor: '#000',
                confirmButtonText: 'Ok'
            });
        } finally {
            input.value = '';
        }
    }
}

window.addGalleryImageFromUrl = function() {
    const input = document.getElementById('gallery-img-url-edit');
    if (input && input.value) {
        if (tempImages.length >= 5) {
            Swal.fire('Límite alcanzado', 'Máximo 5 imágenes permitidas por producto.', 'info');
            return;
        }
        tempImages.push(input.value);
        input.value = '';
        renderGalleryImagePreview();
    }
}

window.addGalleryImageFromFile = function(input) {
    if (input.files && input.files.length > 0) {
        // Filtrar solo imágenes válidas
        const allFiles = Array.from(input.files);
        // Validar Tipo y Tamaño (2MB)
        const validFiles = allFiles.filter(f => f.type.startsWith('image/') && f.size <= 2 * 1024 * 1024);

        if (validFiles.length < allFiles.length) {
            Swal.fire('Atención', 'Algunos archivos fueron ignorados por no ser imágenes o exceder los 2MB.', 'warning');
        }

        const filesToAdd = validFiles.slice(0, 5 - tempImages.length);
        if (filesToAdd.length === 0) {
            Swal.fire('Límite alcanzado', 'Máximo 5 imágenes permitidas por producto.', 'info');
            input.value = '';
            return;
        }
        filesToAdd.forEach(async file => {
            try {
                const compressedImage = await compressImage(file);
                tempImages.push(compressedImage);
                renderGalleryImagePreview();
            } catch (error) {
                console.error("Error comprimiendo la imagen de galería:", error);
                Swal.fire({
                    icon: 'warning',
                    title: 'Problema con una imagen',
                    text: error.message,
                    confirmButtonColor: '#000',
                    confirmButtonText: 'Ok'
                });
            }
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
    // Deshabilitamos la subida de videos locales para evitar superar el límite de Vercel.
    Swal.fire('Opción no disponible', 'Por favor, suba su video a un servicio como YouTube o Vimeo y pegue el enlace. Los videos locales pesan demasiado.', 'info');
    if (input) {
        input.value = ''; // Limpiar el input para que el usuario pueda volver a intentarlo si quiere
    }
}

// --- SISTEMA DE RECORTE (Admin Copy) ---
async function promptCrop(file, aspectRatio = NaN) {
    // Cargar librería dinámicamente
    if (!document.getElementById('cropper-css')) {
        const link = document.createElement('link'); link.id = 'cropper-css'; link.rel = 'stylesheet'; link.href = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css'; document.head.appendChild(link);
    }
    if (typeof Cropper === 'undefined') {
        await new Promise(resolve => {
            const script = document.createElement('script'); script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js'; 
            script.onload = resolve; document.head.appendChild(script);
        });
    }

    // Crear Modal
    if (!document.getElementById('crop-modal')) {
        const modal = document.createElement('div');
        modal.id = 'crop-modal';
        modal.style.cssText = "display:none; position:fixed; z-index:11000; left:0; top:0; width:100%; height:100%; background:rgba(0,0,0,0.9); flex-direction:column; align-items:center; justify-content:center;";
        modal.innerHTML = `
            <div style="position:relative; width:90%; height:80%; max-width:1000px; background:#111; display:flex; justify-content:center; align-items:center; border-radius:4px; overflow:hidden;">
                <img id="crop-image-target" style="max-width:100%; max-height:100%; display:block;">
            </div>
            <div style="margin-top:20px; display:flex; gap:15px; z-index:11001;">
                <button onclick="closeCropModal(false)" style="background:#4b5563; color:white; padding:10px 20px; border:none; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.9rem;">Cancelar</button>
                <button onclick="closeCropModal(true)" style="background:#2563eb; color:white; padding:10px 20px; border:none; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.9rem;">Recortar Imagen</button>
            </div>
            <div style="position:absolute; top:20px; right:20px; color:white; background:rgba(0,0,0,0.5); padding:5px 10px; border-radius:4px; font-size:0.8rem;">
                Usa la rueda del ratón para hacer zoom
            </div>
        `;
        document.body.appendChild(modal);
    }

    return new Promise((resolve) => {
        cropResolve = resolve;
        const modal = document.getElementById('crop-modal');
        const img = document.getElementById('crop-image-target');
        const reader = new FileReader();
        
        reader.onload = (e) => {
            img.src = e.target.result;
            modal.style.display = 'flex';
            if (cropInstance) cropInstance.destroy();
            cropInstance = new Cropper(img, { aspectRatio: aspectRatio, viewMode: 1, autoCropArea: 0.9, background: false });
        };
        reader.readAsDataURL(file);
    });
}

window.closeCropModal = function(save) {
    document.getElementById('crop-modal').style.display = 'none';
    if (save && cropInstance) {
        // Para productos usamos mayor resolución
        const canvas = cropInstance.getCroppedCanvas({ width: 1000, height: 1000, imageSmoothingQuality: 'high' });
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        if (cropResolve) cropResolve(base64);
    } else {
        if (cropResolve) cropResolve(null);
    }
    if (cropInstance) { cropInstance.destroy(); cropInstance = null; }
}