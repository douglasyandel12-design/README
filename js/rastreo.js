// Al cargar la página, verificamos URL y Sesión
document.addEventListener('DOMContentLoaded', async () => {
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
    
    const listContainer = document.getElementById('orders-list-container');
    let allMyOrders = []; // Variable para guardar todos los pedidos del usuario

    // Función para renderizar una lista de pedidos
    const renderOrderList = (orders) => {
        if (orders.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                    <p style="color: #4b5563; margin-bottom: 1rem;">No se encontraron pedidos con este filtro.</p>
                    <a href="index.html" class="btn" style="text-decoration: none; display: inline-block;">Ir a la tienda</a>
                </div>
            `;
            return;
        }

        // Ordenar: Más recientes primero
        orders.sort((a, b) => new Date(b.date) - new Date(a.date));

        listContainer.innerHTML = orders.map(order => {
            // Determinar color del estado
            let statusColor = '#666'; // Gris oscuro (Neutro/Elegante)
            if (order.status === 'Entregado') statusColor = '#000'; // Negro (Completado)
            if (order.status === 'Cancelado') statusColor = '#999'; // Gris claro

            return `
                <div class="order-card" onclick="toggleDetails('${order.id}')">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid #f3f4f6;">
                        <div>
                            <span style="font-weight: 700; color: #111827; font-size: 1.1rem;">${order.id}</span>
                            <div style="font-size: 0.8rem; color: #6b7280; margin-top: 2px;">${order.date}</div>
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
                                    <span style="font-weight: 500;">$${(item.price * item.quantity).toFixed(2)}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.75rem; border-top: 1px dashed #d1d5db;">
                        <span style="font-size: 0.9rem; color: #4b5563;">Total</span>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 1.2rem; font-weight: 800; color: #111827;">$${order.total.toFixed(2)}</span>
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
        // 1. Obtener usuario actual (si existe)
        const authRes = await fetch('/api/auth/status');
        const authData = await authRes.json();
        const currentUser = authData.user;

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

        if (currentUser) {
            // 2a. Si es usuario registrado: Usamos el endpoint seguro de "mis pedidos"
            const ordersRes = await fetch('/api/my-orders');
            if (ordersRes.ok) {
                myOrders = await ordersRes.json();
            }
        } else {
            // 2b. Si es INVITADO: Buscamos UNO por UNO los pedidos guardados localmente
            // Esto es mucho más seguro que descargar toda la base de datos
            const localIds = JSON.parse(localStorage.getItem('lvs_guest_orders')) || [];
            
            if (localIds.length > 0) {
                // Hacemos fetch en paralelo para cada ID guardado
                const fetchPromises = localIds.map(id => 
                    fetch(`/api/orders/${id}`).then(res => res.ok ? res.json() : null)
                );
                
                const results = await Promise.all(fetchPromises);
                // Filtramos los nulos (pedidos no encontrados)
                myOrders = results.filter(order => order !== null);
            }

            // Nota: La búsqueda por email para invitados se elimina por seguridad, 
            // ya que requeriría un endpoint inseguro de búsqueda masiva. 
            // Los invitados solo ven lo que guardaron en su localStorage.
        }

        allMyOrders = myOrders; // Guardar la lista completa
        renderOrderList(allMyOrders); // Renderizar todos los pedidos inicialmente

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