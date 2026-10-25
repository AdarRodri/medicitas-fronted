/* Funciones del panel del paciente y gestión de sus citas. */

async function obtenerCitas() {
    return apiRequest("/citas", { method: "GET" });
}

async function obtenerCatalogoMedicos() {
    const data = await apiRequest("/medicos", { method: "GET" });
    return data.medicos || [];
}

async function crearCita(datos) {
    return apiRequest("/citas", {
        method: "POST",
        body: JSON.stringify(datos)
    });
}

async function cancelarCita(citaId) {
    return apiRequest(`/citas/${citaId}/cancelar`, { method: "PUT" });
}

async function confirmarCita(citaId) {
    return apiRequest(`/citas/${citaId}/confirmar`, { method: "PUT" });
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function fechaLegible(valor) {
    if (!valor) return "Sin fecha";
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return escaparHTML(valor);
    return fecha.toLocaleString("es-CO", {
        dateStyle: "medium",
        timeStyle: "short"
    });
}

function estadoLegible(estado) {
    const estados = {
        programada: "Pendiente",
        pendiente: "Pendiente",
        confirmada: "Confirmada",
        atendida: "Atendida",
        cancelada: "Cancelada"
    };
    return estados[String(estado || "").toLowerCase()] || estado || "Sin estado";
}

function esActiva(cita) {
    return !["cancelada", "atendida"].includes(String(cita.estado || "").toLowerCase());
}

async function mostrarPanelPaciente() {
    const contenido = document.getElementById("contenido");
    contenido.innerHTML = `<div class="loading-state" role="status">Cargando tu información...</div>`;

    try {
        const [respuestaCitas, medicos] = await Promise.all([
            obtenerCitas(),
            obtenerCatalogoMedicos()
        ]);
        const citas = respuestaCitas.citas || [];
        const ahora = new Date();
        const proximas = citas.filter(c => esActiva(c) && new Date(c.fecha_hora) >= ahora);
        const pendientes = citas.filter(c => ["programada", "pendiente"].includes(String(c.estado).toLowerCase()));
        const atendidas = citas.filter(c => String(c.estado).toLowerCase() === "atendida");
        const medicosPorId = Object.fromEntries(medicos.map(m => [String(m.id), m]));

        contenido.innerHTML = `
            <div class="section-heading">
                <div><span class="eyebrow">TU SALUD, NUESTRA PRIORIDAD</span><h3>Resumen de mis citas</h3>
                <p>Consulta tus próximas consultas o agenda una nueva cita.</p></div>
                <button type="button" class="btn-primary" id="btnNuevaCita">+ Solicitar cita</button>
            </div>
            <div class="stats-grid">
                <article class="stat-card"><span>Próximas citas</span><strong>${proximas.length}</strong><small>Reservas futuras activas</small></article>
                <article class="stat-card"><span>Pendientes</span><strong>${pendientes.length}</strong><small>Por confirmar o atender</small></article>
                <article class="stat-card"><span>Atendidas</span><strong>${atendidas.length}</strong><small>Consultas completadas</small></article>
            </div>
            <div class="panel-subheading"><h3>Próximas citas</h3><button type="button" class="link-button" id="btnVerTodas">Ver todas</button></div>
            <div id="proximasCitasLista"></div>
            <div class="patient-tip"><strong>Consejo:</strong> revisa la fecha y la hora antes de solicitar una cita. Si un horario está ocupado, el sistema te pedirá elegir otro.</div>
        `;

        document.getElementById("btnNuevaCita").addEventListener("click", mostrarFormularioCita);
        document.getElementById("btnVerTodas").addEventListener("click", () => mostrarCitas(citas, medicosPorId));
        const lista = document.getElementById("proximasCitasLista");
        const ordenadas = proximas.sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora)).slice(0, 3);
        if (!ordenadas.length) {
            lista.innerHTML = `<div class="empty-state"><div class="empty-icon">＋</div><h4>Aún no tienes próximas citas</h4><p>Cuando solicites una cita, aparecerá aquí.</p><button type="button" class="btn-primary" id="btnAgendarVacio">Solicitar mi primera cita</button></div>`;
            document.getElementById("btnAgendarVacio").addEventListener("click", mostrarFormularioCita);
        } else {
            lista.innerHTML = ordenadas.map(c => tarjetaCita(c, medicosPorId)).join("");
            enlazarAccionesCitas(lista);
        }
    } catch (error) {
        contenido.innerHTML = `<div class="error-state"><h3>No pudimos cargar tus citas</h3><p>${escaparHTML(error.message)}</p><button type="button" class="btn-primary" id="btnReintentarCitas">Intentar de nuevo</button></div>`;
        document.getElementById("btnReintentarCitas").addEventListener("click", mostrarPanelPaciente);
    }
}

function tarjetaCita(cita, medicosPorId = {}) {
    const medico = medicosPorId[String(cita.medico_id)];
    const nombreMedico = medico ? `Dr./Dra. ${medico.nombre} ${medico.apellido}` : `Médico #${cita.medico_id}`;
    const estado = String(cita.estado || "programada").toLowerCase();
    const puedeCancelar = !["cancelada", "atendida"].includes(estado) && new Date(cita.fecha_hora) > new Date();
    return `<article class="appointment-card">
        <div class="appointment-date"><span>${escaparHTML(new Date(cita.fecha_hora).toLocaleDateString("es-CO", { day: "2-digit" }))}</span><small>${escaparHTML(new Date(cita.fecha_hora).toLocaleDateString("es-CO", { month: "short" }))}</small></div>
        <div class="appointment-info"><h4>${escaparHTML(nombreMedico)}</h4><p><strong>Fecha:</strong> ${fechaLegible(cita.fecha_hora)}</p><p><strong>Motivo:</strong> ${escaparHTML(cita.motivo || "No especificado")}</p></div>
        <div class="appointment-actions"><span class="status-badge status-${escaparHTML(estado)}">${escaparHTML(estadoLegible(estado))}</span>
        ${puedeCancelar ? `<button class="btn-small btn-danger-outline" type="button" data-cancelar-cita="${Number(cita.id)}">Cancelar</button>` : ""}</div>
    </article>`;
}

function enlazarAccionesCitas(contenedor) {
    contenedor.querySelectorAll("[data-cancelar-cita]").forEach(boton => {
        boton.addEventListener("click", async () => {
            const id = boton.dataset.cancelarCita;
            if (!window.confirm("¿Deseas cancelar esta cita? Esta acción no se puede deshacer.")) return;
            boton.disabled = true;
            try {
                const respuesta = await cancelarCita(id);
                mostrarToast(respuesta.mensaje || "Cita cancelada.");
                await mostrarPanelPaciente();
            } catch (error) {
                mostrarToast(error.message);
                boton.disabled = false;
            }
        });
    });
}

async function mostrarCitas(citasPreCargadas = null, medicosPreCargados = null) {
    const contenido = document.getElementById("contenido");
    contenido.innerHTML = `<div class="loading-state" role="status">Cargando tus citas...</div>`;
    try {
        const [respuesta, medicos] = await Promise.all([
            citasPreCargadas ? Promise.resolve({ citas: citasPreCargadas }) : obtenerCitas(),
            medicosPreCargados ? Promise.resolve(Object.values(medicosPreCargados)) : obtenerCatalogoMedicos()
        ]);
        const citas = respuesta.citas || [];
        const mapa = Object.fromEntries(medicos.map(m => [String(m.id), m]));
        contenido.innerHTML = `
            <div class="section-heading"><div><span class="eyebrow">HISTORIAL PERSONAL</span><h3>Mis citas médicas</h3><p>Consulta el estado y los detalles de tus reservas.</p></div><button class="btn-primary" id="btnNuevaCitaLista" type="button">+ Solicitar cita</button></div>
            <div class="filters-row"><label for="filtroEstadoCitas">Filtrar por estado</label><select id="filtroEstadoCitas"><option value="todas">Todas</option><option value="programada">Pendientes</option><option value="confirmada">Confirmadas</option><option value="atendida">Atendidas</option><option value="cancelada">Canceladas</option></select><label for="buscarCita">Buscar médico o motivo</label><input id="buscarCita" type="search" placeholder="Escribe para buscar..."></div>
            <div id="listaCompletaCitas"></div>`;
        document.getElementById("btnNuevaCitaLista").addEventListener("click", mostrarFormularioCita);
        const lista = document.getElementById("listaCompletaCitas");
        function pintar() {
            const estado = document.getElementById("filtroEstadoCitas").value;
            const busqueda = document.getElementById("buscarCita").value.trim().toLowerCase();
            const filtradas = citas.filter(c => {
                const e = String(c.estado || "programada").toLowerCase();
                const m = mapa[String(c.medico_id)];
                const texto = `${m?.nombre || ""} ${m?.apellido || ""} ${c.motivo || ""}`.toLowerCase();
                return (estado === "todas" || e === estado || (estado === "programada" && e === "pendiente")) && texto.includes(busqueda);
            });
            if (!filtradas.length) {
                lista.innerHTML = `<div class="empty-state"><h4>No encontramos citas</h4><p>Prueba con otro filtro o solicita una nueva cita.</p></div>`;
                return;
            }
            lista.innerHTML = filtradas.map(c => tarjetaCita(c, mapa)).join("");
            enlazarAccionesCitas(lista);
        }
        document.getElementById("filtroEstadoCitas").addEventListener("change", pintar);
        document.getElementById("buscarCita").addEventListener("input", pintar);
        pintar();
    } catch (error) {
        contenido.innerHTML = `<div class="error-state"><h3>No se pudieron cargar tus citas</h3><p>${escaparHTML(error.message)}</p></div>`;
    }
}

async function mostrarFormularioCita() {
    const contenido = document.getElementById("contenido");
    contenido.innerHTML = `<div class="loading-state" role="status">Cargando médicos disponibles...</div>`;
    try {
        const medicos = await obtenerCatalogoMedicos();
        const minFecha = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        contenido.innerHTML = `
            <div class="section-heading"><div><span class="eyebrow">NUEVA RESERVA</span><h3>Solicitar una cita médica</h3><p>Completa los datos para registrar tu solicitud.</p></div><button class="btn-secondary" id="btnVolverCitas" type="button">Volver a mis citas</button></div>
            ${medicos.length ? `<form id="formNuevaCita" class="appointment-form">
                <div class="form-group"><label for="citaMedico">Médico *</label><select id="citaMedico" required><option value="">Selecciona un médico</option>${medicos.map(m => `<option value="${Number(m.id)}">${escaparHTML(m.nombre)} ${escaparHTML(m.apellido)} — ${escaparHTML(m.especialidad || "Medicina general")}</option>`).join("")}</select></div>
                <div class="form-row"><div class="form-group"><label for="citaFechaHora">Fecha y hora *</label><input id="citaFechaHora" type="datetime-local" min="${minFecha}" required></div><div class="form-group"><label for="citaMotivo">Motivo de consulta</label><input id="citaMotivo" type="text" maxlength="500" placeholder="Ej. Consulta general"></div></div>
                <div class="form-notice" role="note">El horario debe estar disponible. Si ya está reservado, recibirás un aviso para seleccionar otro.</div>
                <div class="form-actions"><button class="btn-secondary" type="button" id="btnCancelarFormulario">Cancelar</button><button class="btn-primary" type="submit" id="btnGuardarCita">Guardar solicitud</button></div>
            </form>` : `<div class="empty-state"><h4>No hay médicos registrados</h4><p>Por ahora no es posible solicitar una cita. Contacta con la administración de la clínica.</p></div>`}`;
        document.getElementById("btnVolverCitas").addEventListener("click", () => mostrarCitas());
        const btnCancelar = document.getElementById("btnCancelarFormulario");
        if (btnCancelar) btnCancelar.addEventListener("click", () => mostrarPanelPaciente());
        const form = document.getElementById("formNuevaCita");
        if (!form) return;
        form.addEventListener("submit", async event => {
            event.preventDefault();
            const medicoId = Number(document.getElementById("citaMedico").value);
            const fechaHora = document.getElementById("citaFechaHora").value;
            const motivo = document.getElementById("citaMotivo").value.trim();
            if (!medicoId || !fechaHora) {
                mostrarToast("Selecciona un médico y una fecha y hora.");
                return;
            }
            if (new Date(fechaHora) <= new Date()) {
                mostrarToast("Selecciona una fecha y hora futuras.");
                return;
            }
            const boton = document.getElementById("btnGuardarCita");
            boton.disabled = true;
            boton.textContent = "Guardando...";
            try {
                const respuesta = await crearCita({ medico_id: medicoId, fecha_hora: fechaHora, motivo });
                mostrarToast(respuesta.mensaje || "Cita solicitada correctamente.");
                await mostrarPanelPaciente();
            } catch (error) {
                mostrarToast(error.message || "No se pudo guardar la cita.");
                boton.disabled = false;
                boton.textContent = "Guardar solicitud";
            }
        });
    } catch (error) {
        contenido.innerHTML = `<div class="error-state"><h3>No se pudo cargar el formulario</h3><p>${escaparHTML(error.message)}</p><button type="button" class="btn-primary" id="btnReintentarMedicos">Reintentar</button></div>`;
        document.getElementById("btnReintentarMedicos").addEventListener("click", mostrarFormularioCita);
    }
}

/* ===================== Panel del médico ===================== */

function mayusculaInicial(texto) {
    return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
}

function tarjetaCitaMedico(cita) {
    const estado = String(cita.estado || "programada").toLowerCase();
    const fecha = new Date(cita.fecha_hora);
    const fechaValida = !Number.isNaN(fecha.getTime());
    const nombrePaciente = cita.paciente_nombre || `Paciente #${cita.paciente_id}`;
    const fechaTexto = fechaValida
        ? mayusculaInicial(fecha.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }))
        : "Sin fecha";
    const horaTexto = fechaValida
        ? fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
        : "Sin hora";
    const esPendiente = ["programada", "pendiente"].includes(estado);
    const puedeConfirmar = esPendiente && fechaValida && fecha > new Date();
    const aviso = esPendiente && fechaValida && fecha <= new Date()
        ? `<small class="appointment-note">La hora de esta cita ya pasó.</small>` : "";

    return `<article class="appointment-card">
        <div class="appointment-date"><span>${fechaValida ? escaparHTML(fecha.toLocaleDateString("es-CO", { day: "2-digit" })) : "--"}</span><small>${fechaValida ? escaparHTML(fecha.toLocaleDateString("es-CO", { month: "short" })) : ""}</small></div>
        <div class="appointment-info">
            <h4>Paciente: ${escaparHTML(nombrePaciente)}</h4>
            <p><strong>Fecha:</strong> ${escaparHTML(fechaTexto)}</p>
            <p><strong>Hora:</strong> ${escaparHTML(horaTexto)}</p>
            <p><strong>Motivo:</strong> ${escaparHTML(cita.motivo || "No especificado")}</p>
        </div>
        <div class="appointment-actions"><span class="status-badge status-${escaparHTML(estado)}">${escaparHTML(estadoLegible(estado))}</span>
        ${puedeConfirmar ? `<button class="btn-small btn-success" type="button" data-confirmar-cita="${Number(cita.id)}">Confirmar cita</button>` : ""}
        ${aviso}</div>
    </article>`;
}

function enlazarConfirmaciones(contenedor) {
    contenedor.querySelectorAll("[data-confirmar-cita]").forEach(boton => {
        boton.addEventListener("click", async () => {
            const id = boton.dataset.confirmarCita;
            if (!window.confirm("¿Deseas confirmar esta cita?")) return;
            boton.disabled = true;
            boton.textContent = "Confirmando...";
            try {
                const respuesta = await confirmarCita(id);
                mostrarToast(respuesta.mensaje || "Cita confirmada.");
                await mostrarPanelMedico();
            } catch (error) {
                mostrarToast(error.message || "No se pudo confirmar la cita.");
                boton.disabled = false;
                boton.textContent = "Confirmar cita";
            }
        });
    });
}

function pintarListaCitasMedico(idContenedor, citas, vacioTitulo, vacioTexto) {
    const contenedor = document.getElementById(idContenedor);
    if (!citas.length) {
        contenedor.innerHTML = `<div class="empty-state"><h4>${escaparHTML(vacioTitulo)}</h4>${vacioTexto ? `<p>${escaparHTML(vacioTexto)}</p>` : ""}</div>`;
        return contenedor;
    }
    contenedor.innerHTML = citas.map(tarjetaCitaMedico).join("");
    return contenedor;
}

async function mostrarPanelMedico() {
    const contenido = document.getElementById("contenido");
    contenido.innerHTML = `<div class="loading-state" role="status">Cargando tu agenda...</div>`;

    try {
        const respuesta = await obtenerCitas();
        const citas = respuesta.citas || [];
        const porEstado = (...estados) => citas.filter(c => estados.includes(String(c.estado || "").toLowerCase()));
        const masProximaPrimero = (a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora);
        const pendientes = porEstado("programada", "pendiente").sort(masProximaPrimero);
        const confirmadas = porEstado("confirmada").sort(masProximaPrimero);
        const canceladas = porEstado("cancelada").sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora));

        contenido.innerHTML = `
            <div class="section-heading"><div><span class="eyebrow">AGENDA MÉDICA</span><h3>Mis citas</h3>
            <p>Revisa la fecha, la hora y el paciente de cada cita, y confirma las solicitudes pendientes.</p></div></div>
            <div class="stats-grid">
                <article class="stat-card"><span>Pendientes</span><strong>${pendientes.length}</strong><small>Esperando tu confirmación</small></article>
                <article class="stat-card"><span>Confirmadas</span><strong>${confirmadas.length}</strong><small>Ya aceptadas por ti</small></article>
                <article class="stat-card"><span>Canceladas</span><strong>${canceladas.length}</strong><small>Canceladas por pacientes</small></article>
            </div>
            <div class="panel-subheading"><h3>Citas pendientes</h3></div>
            <div id="medicoPendientes"></div>
            <div class="panel-subheading"><h3>Citas confirmadas</h3></div>
            <div id="medicoConfirmadas"></div>
            <div class="panel-subheading"><h3>Citas canceladas</h3></div>
            <div id="medicoCanceladas"></div>`;

        const listaPendientes = pintarListaCitasMedico("medicoPendientes", pendientes,
            "No tienes citas pendientes", "Cuando un paciente solicite una cita contigo, aparecerá aquí para que la confirmes.");
        enlazarConfirmaciones(listaPendientes);
        pintarListaCitasMedico("medicoConfirmadas", confirmadas, "Aún no has confirmado citas", "");
        pintarListaCitasMedico("medicoCanceladas", canceladas, "No hay citas canceladas", "");
    } catch (error) {
        contenido.innerHTML = `<div class="error-state"><h3>No pudimos cargar tu agenda</h3><p>${escaparHTML(error.message)}</p><button type="button" class="btn-primary" id="btnReintentarAgenda">Intentar de nuevo</button></div>`;
        document.getElementById("btnReintentarAgenda").addEventListener("click", mostrarPanelMedico);
    }
}
