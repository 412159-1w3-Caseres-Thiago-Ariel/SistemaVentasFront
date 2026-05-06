// 1. Carga inicial
document.addEventListener('DOMContentLoaded', () => {
    cargarClientes();
    cargarProductos();
});

// 2. Cargar combos
async function cargarClientes() {
    try {
        const respuesta = await fetch('https://apisistemaventas.azurewebsites.net/clientes');
        const clientes = await respuesta.json();
        const combo = document.getElementById('combo-clientes');
        
        combo.innerHTML = '<option value="">-- Seleccione un cliente --</option>';
        clientes.forEach(cliente => {
            combo.innerHTML += `<option value="${cliente.Id}">${cliente.Nombre} ${cliente.Apellido}</option>`;
        });
    } catch (error) {
        console.error('Error al cargar clientes:', error);
    }
}

let listaProductosGlobal = []; // Variable para guardar los precios

async function cargarProductos() {
    try {
        const respuesta = await fetch('https://apisistemaventas.azurewebsites.net/productos');
        listaProductosGlobal = await respuesta.json(); // Guardamos todo acá
        const combo = document.getElementById('combo-productos');
        
        combo.innerHTML = '<option value="">-- Seleccione un producto --</option>';

        listaProductosGlobal.forEach(prod => {
            combo.innerHTML += `<option value="${prod.Id}">${prod.Nombre}</option>`;
        });

        // Agregamos un "oído" al combo para que cuando cambie, ejecute una función
        combo.addEventListener('change', autocompletarPrecio);
    } catch (error) {
        console.error('Error al cargar productos:', error);
    }
}

// 3. Cargar Historial y Calcular Deuda
async function cargarHistorial() {
    const idSeleccionado = document.getElementById('combo-clientes').value;

    if (!idSeleccionado) {
        return alert('Por favor, primero seleccione un cliente de la lista.');
    }

    try {
        const respuesta = await fetch(`https://apisistemaventas.azurewebsites.net/clientes/${idSeleccionado}/historial`);
        const registros = await respuesta.json();
        
        const contenedorTarjetas = document.getElementById('resultado-historial');
        const contenedorResumen = document.getElementById('resumen-deuda'); // El div nuevo
        
        contenedorTarjetas.innerHTML = '';
        contenedorResumen.innerHTML = '';

        if (registros.length === 0) {
            contenedorTarjetas.innerHTML = '<p class="text-center text-gray-500 py-4">Este cliente no tiene compras registradas.</p>';
            return;
        }

        // --- CALCULADORA DE DEUDA TOTAL ---
        let deudaTotal = 0;
        registros.forEach(registro => {
            deudaTotal += registro.Saldo;
        });

        // Dibujamos el cartel de resumen según si debe o no
        if (deudaTotal > 0) {
            contenedorResumen.innerHTML = `
                <div class="bg-red-50 border-l-4 border-red-500 p-5 rounded-r-xl shadow-sm flex justify-between items-center">
                    <div>
                        <h3 class="text-red-800 font-extrabold text-lg uppercase tracking-wide">Deuda Total</h3>
                        <p class="text-red-600 text-sm font-medium">Suma de todos los tickets pendientes</p>
                    </div>
                    <div class="text-3xl font-black text-red-600">
                        $${deudaTotal}
                    </div>
                </div>
            `;
        } else {
            contenedorResumen.innerHTML = `
                <div class="bg-green-50 border-l-4 border-green-500 p-5 rounded-r-xl shadow-sm flex justify-between items-center">
                    <div>
                        <h3 class="text-green-800 font-extrabold text-lg uppercase tracking-wide">Cuenta al día</h3>
                        <p class="text-green-600 text-sm font-medium">No registra saldos pendientes</p>
                    </div>
                    <div class="text-3xl font-black text-green-600">
                        $0
                    </div>
                </div>
            `;
        }
        // ----------------------------------

        // Dibujamos las tarjetas una por una
        registros.forEach(registro => {
            const fechaFormateada = new Date(registro.Fecha).toLocaleDateString('es-AR');
            
            let botonCobrar = '';
            if (registro.Saldo > 0) {
                botonCobrar = `<button onclick="abonarTicket(${registro.IdVenta}, ${registro.Saldo})" class="mt-4 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-all">💵 Abonar a esta compra</button>`;
            } else {
                botonCobrar = `<div class="mt-4 text-center bg-gray-100 text-green-700 font-bold py-2 rounded-lg">✓ Ticket saldado</div>`;
            }

            const tarjeta = `
                <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative">
                    
                    <button onclick="eliminarTicket(${registro.IdVenta})" class="absolute top-4 right-4 text-red-400 hover:text-red-600 transition-colors" title="Anular esta venta">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>

                    <div class="flex justify-between items-start mb-3 pr-8">
                        <div>
                            <span class="text-xs font-bold uppercase tracking-wider text-gray-400">Fecha de compra</span>
                            <p class="text-gray-800 font-medium">${fechaFormateada}</p>
                        </div>
                        <div class="text-right">
                            <span class="inline-block bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold">
                                Entregó inicial: $${registro.Entrega}
                            </span>
                        </div>
                    </div>

                    <h3 class="text-xl font-bold text-indigo-700 mb-1">${registro.Producto}</h3>
                    <p class="text-gray-600 text-sm mb-4">Detalle: ${registro.Cant} unidad(es) a $${registro.Precio}</p>
                    
                    <div class="border-t pt-3 flex justify-between items-center">
                        <div class="text-sm">
                            <span class="text-gray-400">Total Ticket:</span>
                            <span class="font-bold text-gray-700 ml-1">$${registro.Total_Ticket}</span>
                        </div>
                        <div class="text-sm">
                            <span class="text-gray-400">Saldo:</span>
                            <span class="ml-1 font-black ${registro.Saldo > 0 ? 'text-red-500' : 'text-gray-400'}">
                                $${registro.Saldo}
                            </span>
                        </div>
                    </div>
                    ${botonCobrar}
                </div>
            `;
            contenedorTarjetas.innerHTML += tarjeta;
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

// 4. Registrar Venta
async function registrarVenta() {
    const idCliente = document.getElementById('combo-clientes').value;
    const idProducto = document.getElementById('combo-productos').value;
    const cantidad = document.getElementById('venta-cantidad').value;
    const precio = document.getElementById('venta-precio').value;
    let entrega = document.getElementById('venta-entrega').value;

    if (!idCliente || !idProducto || !cantidad || !precio) {
        return alert("Por favor completá todos los datos de la venta.");
    }

    const paqueteVenta = {
        IdCliente: parseInt(idCliente),
        IdProducto: parseInt(idProducto),
        Cantidad: parseInt(cantidad),
        Precio: parseFloat(precio),
        Entrega: parseFloat(entrega || 0)
    };

    try {
        const respuesta = await fetch('https://apisistemaventas.azurewebsites.net/ventas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paqueteVenta)
        });

        if (respuesta.ok) {
            alert("¡Venta registrada con éxito!");
            document.getElementById('combo-productos').value = '';
            document.getElementById('venta-cantidad').value = '';
            document.getElementById('venta-precio').value = '';
            document.getElementById('venta-entrega').value = '';
            cargarHistorial(); 
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// 5. Cobrar Ticket
async function abonarTicket(idVenta, saldoActual) {
    const montoStr = prompt(`¿Cuánto va a abonar a esta compra? (Debe: $${saldoActual})`);
    if (!montoStr) return; 
    
    const monto = parseFloat(montoStr);
    
    if (isNaN(monto) || monto <= 0) return alert("Monto inválido.");
    if (monto > saldoActual) return alert("No podés cobrar más de lo que debe.");

    const idCliente = document.getElementById('combo-clientes').value;

    const paquete = {
        IdVenta: parseInt(idVenta),
        IdCliente: parseInt(idCliente),
        Monto: monto
    };

    try {
        const respuesta = await fetch('https://apisistemaventas.azurewebsites.net/pagar-ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paquete)
        });

        if (respuesta.ok) {
            alert("¡Abono registrado! El saldo bajó.");
            cargarHistorial(); 
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// 6. Registrar Nuevo Cliente (¡Acá estaba la fugitiva!)
async function registrarCliente() {
    const nombre = document.getElementById('nuevo-cliente-nombre').value;
    const apellido = document.getElementById('nuevo-cliente-apellido').value;

    if (!nombre || !apellido) {
        return alert("Por favor, ingresá el nombre y el apellido del cliente.");
    }

    const paqueteCliente = {
        Nombre: nombre,
        Apellido: apellido
    };

    try {
        const respuesta = await fetch('https://apisistemaventas.azurewebsites.net/clientes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paqueteCliente)
        });

        if (respuesta.ok) {
            alert(`¡Cliente ${nombre} ${apellido} registrado correctamente!`);
            
            // Limpiamos los campos
            document.getElementById('nuevo-cliente-nombre').value = '';
            document.getElementById('nuevo-cliente-apellido').value = '';
            
            // Recargamos el menú desplegable al instante
            cargarClientes(); 
        } else {
            alert("Hubo un error al guardar el cliente.");
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// 7. Función para anular (eliminar) un ticket
async function eliminarTicket(idVenta) {
    // Usamos confirm() para que valide antes de borrar, así no lo tocan por accidente
    const confirmacion = confirm("⚠️ ¿Estás seguro que querés anular esta venta? Esta acción no se puede deshacer.");
    
    if (!confirmacion) {
        return; // Si el usuario toca "Cancelar", cortamos acá y no borramos nada
    }

    try {
        const respuesta = await fetch(`https://apisistemaventas.azurewebsites.net/${idVenta}`, {
            method: 'DELETE'
        });

        if (respuesta.ok) {
            alert("Venta anulada correctamente.");
            cargarHistorial(); // Refrescamos la pantalla para que la tarjeta desaparezca
        } else {
            alert("Hubo un error al intentar anular la venta.");
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// 8. Función para archivar (Ocultar) un cliente
async function eliminarCliente() {
    const idSeleccionado = document.getElementById('combo-clientes').value;

    if (!idSeleccionado) {
        return alert("Primero seleccioná un cliente de la lista para eliminar.");
    }

    // Le pedimos confirmación por las dudas
    const confirmacion = confirm("⚠️ ¿Estás seguro que querés archivar a este cliente? Ya no aparecerá en la lista.");

    if (!confirmacion) return;

    try {
        const respuesta = await fetch(`https://apisistemaventas.azurewebsites.net/clientes/${idSeleccionado}`, {
            method: 'DELETE'
        });

        if (respuesta.ok) {
            alert("Cliente eliminado de la lista correctamente.");
            
            // Limpiamos el historial de abajo para que quede en blanco
            document.getElementById('resultado-historial').innerHTML = ''; 
            
            // Recargamos los clientes (ahora el que borramos ya no va a venir del backend)
            cargarClientes(); 
        } else {
            alert("Hubo un error al intentar eliminar el cliente.");
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Función para agregar un producto nuevo al catálogo
async function registrarProducto() {
    const nombre = document.getElementById('nuevo-producto-nombre').value;
    const categoria = document.getElementById('nuevo-producto-categoria').value;
    const precio = document.getElementById('nuevo-producto-precio').value;

    if (!nombre || !categoria || !precio) {
        return alert("Por favor, ingresá el nombre, la categoría y el precio inicial del producto.");
    }

    const paqueteProducto = {
        Nombre: nombre,
        Categoria: categoria,
        Precio: parseFloat(precio)
    };

    try {
        const respuesta = await fetch('https://apisistemaventas.azurewebsites.net/productos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paqueteProducto)
        });

        if (respuesta.ok) {
            alert(`¡Producto "${nombre}" registrado en el catálogo!`);
            
            // Limpiamos los campos
            document.getElementById('nuevo-producto-nombre').value = '';
            document.getElementById('nuevo-producto-categoria').value = '';
            document.getElementById('nuevo-producto-precio').value = '';
            
            // Recargamos el menú desplegable de ventas
            cargarProductos(); 
        } else {
            alert("Hubo un error al guardar el producto.");
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function autocompletarPrecio() {
    const idSeleccionado = document.getElementById('combo-productos').value;
    const campoPrecio = document.getElementById('venta-precio');

    // Buscamos el producto en nuestra lista guardada
    const productoEncontrado = listaProductosGlobal.find(p => p.Id == idSeleccionado);

    if (productoEncontrado) {
        // Ponemos el precio del catálogo en el cuadrito
        campoPrecio.value = productoEncontrado.Precio;
    } else {
        campoPrecio.value = '';
    }
}