/* Catálogo y administración de médicos. Solo administradores pueden crear/editar. */

async function listarMedicosAdmin() {
    const data = await apiRequest("/medicos", { method: "GET" });
    return data.medicos || [];
}

async function mostrarGestionMedicos() {
    const usuario = obtenerUsuario();
    const contenido = document.getElementById("contenido");
    if (!usuario || usuario.rol !== "admin") {
        mostrarToast("Solo el administrador puede gestionar médicos.");
        return;
    }

    contenido.innerHTML = `
      <div class="section-heading">
        <div><span class="eyebrow">CATÁLOGO PROFESIONAL</span><h3>Gestión de médicos</h3>
        <p>Registra y actualiza médicos. Los médicos registrados aparecerán en el formulario de solicitud de citas del paciente.</p></div>
      </div>
      <div class="doctor-admin-layout">
        <section class="doctor-form-card">
          <h4 id="tituloFormularioMedico">Registrar médico</h4>
          <p class="doctor-form-help">Los campos marcados con * son obligatorios.</p>
          <form id="formMedicoAdmin" class="appointment-form">
            <input type="hidden" id="medicoIdEditar" value="">
            <div class="form-row">
              <div class="form-group"><label for="medicoNombre">Nombre *</label><input id="medicoNombre" maxlength="100" required></div>
              <div class="form-group"><label for="medicoApellido">Apellido *</label><input id="medicoApellido" maxlength="100" required></div>
            </div>
            <div class="form-group"><label for="medicoEmail">Correo electrónico *</label><input id="medicoEmail" type="email" maxlength="150" required></div>
            <div class="form-group" id="grupoPasswordMedico"><label for="medicoPassword">Contraseña temporal * (mínimo 8 caracteres)</label><input id="medicoPassword" type="password" minlength="8" autocomplete="new-password" required></div>
            <div class="form-row">
              <div class="form-group"><label for="medicoEspecialidad">Especialidad *</label><input id="medicoEspecialidad" maxlength="100" placeholder="Ej. Medicina general" required></div>
              <div class="form-group"><label for="medicoTelefono">Teléfono</label><input id="medicoTelefono" type="tel" maxlength="30" placeholder="Opcional"></div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-secondary hidden" id="btnCancelarEdicionMedico">Cancelar edición</button>
              <button type="submit" class="btn-primary" id="btnGuardarMedico">Registrar médico</button>
            </div>
          </form>
          <div class="form-notice">La cuenta se crea con el rol médico. No se permite crear cuentas médicas desde el registro público.</div>
        </section>
        <section class="doctor-list-card">
          <div class="panel-subheading"><h3>Médicos registrados</h3><button type="button" class="btn-secondary" id="btnRecargarMedicos">Actualizar</button></div>
          <div id="listaMedicosAdmin"><div class="loading-state" role="status">Cargando médicos...</div></div>
        </section>
      </div>`;

    document.getElementById("formMedicoAdmin").addEventListener("submit", guardarMedicoDesdeFormulario);
    document.getElementById("btnCancelarEdicionMedico").addEventListener("click", limpiarFormularioMedico);
    document.getElementById("btnRecargarMedicos").addEventListener("click", cargarListaMedicosAdmin);
    await cargarListaMedicosAdmin();
}

async function cargarListaMedicosAdmin() {
    const contenedor = document.getElementById("listaMedicosAdmin");
    if (!contenedor) return;
    contenedor.innerHTML = '<div class="loading-state" role="status">Cargando médicos...</div>';
    try {
        const medicos = await listarMedicosAdmin();
        if (!medicos.length) {
            contenedor.innerHTML = '<div class="empty-state"><h4>Aún no hay médicos registrados</h4><p>Completa el formulario para registrar el primero. Después aparecerá en el catálogo que utilizan los pacientes.</p></div>';
            return;
        }
        contenedor.innerHTML = medicos.map(m => `
          <article class="doctor-admin-card">
            <div class="doctor-avatar" aria-hidden="true">${escaparHTML((m.nombre || "M").charAt(0).toUpperCase())}</div>
            <div class="doctor-admin-info">
              <h4>Dr./Dra. ${escaparHTML(m.nombre)} ${escaparHTML(m.apellido)}</h4>
              <p><strong>Especialidad:</strong> ${escaparHTML(m.especialidad || "No especificada")}</p>
              <p><strong>Correo:</strong> ${escaparHTML(m.email)}</p>
              <p><strong>Teléfono:</strong> ${escaparHTML(m.telefono || "No registrado")}</p>
            </div>
            <button type="button" class="btn-secondary btn-small" data-editar-medico="${Number(m.id)}">Editar</button>
          </article>`).join("");
        contenedor.querySelectorAll("[data-editar-medico]").forEach(btn => {
            btn.addEventListener("click", () => prepararEdicionMedico(Number(btn.dataset.editarMedico)));
        });
        window.medicosAdminCache = medicos;
    } catch (error) {
        contenedor.innerHTML = `<div class="error-state"><h3>No se pudo cargar el catálogo</h3><p>${escaparHTML(error.message)}</p><button type="button" class="btn-primary" id="btnReintentarCatalogo">Intentar de nuevo</button></div>`;
        const retry = document.getElementById("btnReintentarCatalogo");
        if (retry) retry.addEventListener("click", cargarListaMedicosAdmin);
    }
}

async function guardarMedicoDesdeFormulario(event) {
    event.preventDefault();
    const id = document.getElementById("medicoIdEditar").value;
    const nombre = document.getElementById("medicoNombre").value.trim();
    const apellido = document.getElementById("medicoApellido").value.trim();
    const email = document.getElementById("medicoEmail").value.trim().toLowerCase();
    const password = document.getElementById("medicoPassword").value;
    const especialidad = document.getElementById("medicoEspecialidad").value.trim();
    const telefono = document.getElementById("medicoTelefono").value.trim();

    if (!nombre || !apellido || !email || !especialidad) {
        mostrarToast("Completa todos los campos obligatorios.");
        return;
    }
    if (!id && password.length < 8) {
        mostrarToast("La contraseña debe tener al menos 8 caracteres.");
        return;
    }

    const boton = document.getElementById("btnGuardarMedico");
    boton.disabled = true;
    try {
        if (id) {
            await apiRequest(`/medicos/${Number(id)}`, {
                method: "PUT",
                body: JSON.stringify({ nombre, apellido, especialidad, telefono: telefono || null })
            });
            mostrarToast("Datos del médico actualizados correctamente.");
        } else {
            await apiRequest("/medicos", {
                method: "POST",
                body: JSON.stringify({ nombre, apellido, email, password, especialidad, telefono: telefono || null })
            });
            mostrarToast("Médico registrado correctamente. Ya puede aparecer en el catálogo de citas.");
        }
        limpiarFormularioMedico();
        await cargarListaMedicosAdmin();
    } catch (error) {
        mostrarToast(error.message || "No se pudo guardar el médico.");
    } finally {
        boton.disabled = false;
    }
}

function prepararEdicionMedico(id) {
    const medico = (window.medicosAdminCache || []).find(m => Number(m.id) === Number(id));
    if (!medico) {
        mostrarToast("No se encontró el médico seleccionado.");
        return;
    }
    document.getElementById("medicoIdEditar").value = medico.id;
    document.getElementById("medicoNombre").value = medico.nombre || "";
    document.getElementById("medicoApellido").value = medico.apellido || "";
    document.getElementById("medicoEmail").value = medico.email || "";
    document.getElementById("medicoEmail").disabled = true;
    document.getElementById("medicoPassword").required = false;
    document.getElementById("medicoPassword").value = "";
    document.getElementById("grupoPasswordMedico").classList.add("hidden");
    document.getElementById("medicoEspecialidad").value = medico.especialidad || "";
    document.getElementById("medicoTelefono").value = medico.telefono || "";
    document.getElementById("tituloFormularioMedico").textContent = "Editar médico";
    document.getElementById("btnGuardarMedico").textContent = "Guardar cambios";
    document.getElementById("btnCancelarEdicionMedico").classList.remove("hidden");
    document.getElementById("formMedicoAdmin").scrollIntoView({ behavior: "smooth", block: "start" });
}

function limpiarFormularioMedico() {
    const form = document.getElementById("formMedicoAdmin");
    if (!form) return;
    form.reset();
    document.getElementById("medicoIdEditar").value = "";
    document.getElementById("medicoEmail").disabled = false;
    document.getElementById("medicoPassword").required = true;
    document.getElementById("grupoPasswordMedico").classList.remove("hidden");
    document.getElementById("tituloFormularioMedico").textContent = "Registrar médico";
    document.getElementById("btnGuardarMedico").textContent = "Registrar médico";
    document.getElementById("btnCancelarEdicionMedico").classList.add("hidden");
}
