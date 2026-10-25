/* Catálogo público de médicos.
   Al cargar la página hace un GET al backend, que consulta la base de datos en la nube. */

async function cargarMedicosPublicos() {
    const contenedor = document.getElementById("medicosPublicos");
    if (!contenedor) return;

    contenedor.innerHTML = '<div class="loading-state" role="status">Conectando con el servidor... la primera carga puede tardar hasta un minuto.</div>';

    try {
        const data = await apiRequest("/medicos/publico", { method: "GET" });
        const medicos = data.medicos || [];

        if (!medicos.length) {
            contenedor.innerHTML = '<div class="empty-state"><h4>Aún no hay médicos registrados</h4><p>Cuando el administrador registre médicos, aparecerán aquí.</p></div>';
            return;
        }

        contenedor.innerHTML = medicos.map(m => `
            <article class="doctor-admin-card">
                <div class="doctor-avatar" aria-hidden="true">${escaparHTML((m.nombre || "M").charAt(0).toUpperCase())}</div>
                <div class="doctor-admin-info">
                    <h4>Dr./Dra. ${escaparHTML(m.nombre)} ${escaparHTML(m.apellido)}</h4>
                    <p><strong>Especialidad:</strong> ${escaparHTML(m.especialidad || "No especificada")}</p>
                </div>
            </article>`).join("");
    } catch (error) {
        const sinConexion = error instanceof TypeError;
        const mensaje = sinConexion
            ? "No se pudo conectar con el servidor. Si estaba inactivo, puede tardar hasta un minuto en despertar."
            : error.message;
        contenedor.innerHTML = `<div class="error-state"><h4>No pudimos cargar los médicos</h4><p>${escaparHTML(mensaje)}</p><button type="button" class="btn-primary" id="btnReintentarPublico">Intentar de nuevo</button></div>`;
        document.getElementById("btnReintentarPublico").addEventListener("click", cargarMedicosPublicos);
    }
}
