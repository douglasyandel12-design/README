// Variable global
let products = [];

// Cargar productos desde la nube al iniciar
async function initAdmin() {
    try {
        const res = await fetch('/.netlify/functions/api/products');
        if (res.ok) {
            products = await res.json();
            renderTable();
        }
    } catch (e) {
        console.error("Error cargando productos", e);
    }
}
initAdmin();

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
                <td>${p.name}</td>
                <td>
                    $${p.price.toFixed(2)}
                    ${p.discount > 0 ? `<br><small style="color:#ef4444; font-weight:bold;">-${p.discount}% OFF</small>` : ''}
                </td>
                <td>
                    <button class="btn" style="width: auto; padding: 0.5rem 1rem; font-size: 0.8rem; margin-right: 0.5rem; background-color: #2563eb;" onclick="openEditModal(${p.id})">Editar</button>
                    <button class="btn btn-danger" onclick="deleteProduct(${p.id})">Borrar</button>
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
    const fileInput = document.getElementById('prod-img-file');
    const urlInput = document.getElementById('prod-img-url');
    
    let imageSrc = urlInput.value;

    // Si hay archivo, convertir a Base64
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onloadend = function() {
            saveProductToStorage(name, price, reader.result, discount);
        }
        reader.readAsDataURL(file);
    } else {
        saveProductToStorage(name, price, imageSrc, discount);
    }
}

async function saveProductToStorage(name, price, image, discount) {
    const newProduct = {
        id: Date.now(), // ID único basado en tiempo
        name: name,
        price: price,
        image: image,
        discount: discount
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
    
    renderTable();
    alert('Producto agregado correctamente');
}

// Función auxiliar para enviar todo a la nube
async function saveToCloud() {
    try {
        const res = await fetch('/.netlify/functions/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(products)
        });
        if (!res.ok) alert('Error al guardar en la nube');
    } catch (e) {
        alert('Error de conexión');
    }
}

async function deleteProduct(id) {
    if(confirm('¿Estás seguro de eliminar este producto?')) {
        products = products.filter(p => p.id !== id);
        await saveToCloud();
        renderTable();
    }
}

function renderOrders() {
    const orders = JSON.parse(localStorage.getItem('lvs_orders')) || [];
    const container = document.getElementById('orders-list');
    
    if (orders.length === 0) {
        container.innerHTML = '<p style="color: #666;">No hay pedidos registrados aún.</p>';
        return;
    }

    // Mostrar pedidos (del más reciente al más antiguo)
    container.innerHTML = orders.map(order => `
        <div class="order-card">
            <div class="order-header">
                <span>📅 ${order.date}</span>
                <span>Total: $${order.total.toFixed(2)}</span>
            </div>
            <div style="margin-bottom: 0.5rem; padding: 0.5rem; background: #eef2ff; border-radius: 4px;">
                <strong>Estado:</strong>
                <select onchange="updateOrderStatus('${order.id}', this.value)" style="padding: 0.25rem; border-radius: 4px; border: 1px solid #ccc;">
                    <option value="Pendiente" ${order.status === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                    <option value="Aceptado" ${order.status === 'Aceptado' ? 'selected' : ''}>Aceptado</option>
                    <option value="Enviado" ${order.status === 'Enviado' ? 'selected' : ''}>Enviado</option>
                    <option value="Entregado" ${order.status === 'Entregado' ? 'selected' : ''}>Entregado</option>
                </select>
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
    `).reverse().join('');
}

function updateOrderStatus(id, newStatus) {
    let orders = JSON.parse(localStorage.getItem('lvs_orders')) || [];
    const orderIndex = orders.findIndex(o => o.id === id);
    if (orderIndex > -1) {
        orders[orderIndex].status = newStatus;
        localStorage.setItem('lvs_orders', JSON.stringify(orders));
    }
}

function deleteOrder(id) {
    if(confirm('¿Ya procesaste este pedido? Se eliminará de la lista.')) {
        let orders = JSON.parse(localStorage.getItem('lvs_orders')) || [];
        orders = orders.filter(o => o.id !== id);
        localStorage.setItem('lvs_orders', JSON.stringify(orders));
        renderOrders();
    }
}

function exportOrdersToCSV() {
    const orders = JSON.parse(localStorage.getItem('lvs_orders')) || [];
    if (orders.length === 0) {
        return alert("No hay pedidos para exportar.");
    }

    const headers = [
        "OrderID", "Date", "Status", "CustomerName", "CustomerEmail", "CustomerPhone", "CustomerAddress",
        "PaymentMethod", "Total", "Products"
    ];

    const csvRows = orders.map(order => {
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

// Funciones del Modal de Edición
const editModal = document.getElementById('edit-modal');

function openEditModal(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    document.getElementById('edit-id').value = product.id;
    document.getElementById('edit-name').value = product.name;
    document.getElementById('edit-price').value = product.price;
    document.getElementById('edit-discount').value = product.discount || 0;
    
    editModal.classList.add('active');
}

function closeEditModal() {
    editModal.classList.remove('active');
}

async function saveEdit(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('edit-id').value);
    const productIndex = products.findIndex(p => p.id === id);
    
    if (productIndex > -1) {
        products[productIndex].name = document.getElementById('edit-name').value;
        products[productIndex].price = parseFloat(document.getElementById('edit-price').value);
        products[productIndex].discount = parseFloat(document.getElementById('edit-discount').value) || 0;
        
        await saveToCloud();
        renderTable();
        closeEditModal();
    }
}

renderTable();
renderOrders();
renderSalesChart();

function renderSalesChart() {
    const orders = JSON.parse(localStorage.getItem('lvs_orders')) || [];
    if (orders.length === 0) return;

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