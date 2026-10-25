document.addEventListener("DOMContentLoaded", () => {
    const loginSection = document.getElementById("loginSection");
    const registroSection = document.getElementById("registroSection");
    const appSection = document.getElementById("appSection");
    const mainNav = document.getElementById("mainNav");
    const loginForm = document.getElementById("loginForm");
    const registroForm = document.getElementById("registroForm");
    const contenido = document.getElementById("contenido");
    const welcome = document.getElementById("welcome");

    function mostrarLogin() {
        loginSection.classList.remove("hidden");
        registroSection.classList.add("hidden");
        appSection.classList.add("hidden");
        mainNav.classList.add("hidden");
    }

    function mostrarRegistro() {
        loginSection.classList.add("hidden");
        registroSection.classList.remove("hidden");
        appSection.classList.add("hidden");
        mainNav.classList.add("hidden");
    }

    async function mostrarApp() {
        loginSection.classList.add("hidden");
        registroSection.classList.add("hidden");
        appSection.classList.remove("hidden");
        mainNav.classList.remove("hidden");
        const usuario = obtenerUsuario();
        if (usuario) {
            welcome.textContent = `Hola, ${usuario.nombre}`;
            const btnCitas = document.getElementById("btnCitas");
            btnCitas.textContent = usuario.rol === "medico" ? "Mi agenda" : "Mis citas";
        }
        // El botón "Gestionar médicos" solo lo ve el administrador.
        document.getElementById("btnMedicos").classList.toggle("hidden", usuario?.rol !== "admin");

        if (usuario?.rol === "paciente") {
            await mostrarPanelPaciente();
        } else if (usuario?.rol === "medico") {
            await mostrarPanelMedico();
        } else if (usuario?.rol === "admin") {
            await mostrarGestionMedicos();
        } else {
            contenido.innerHTML = `<h3>Inicio</h3><p>Bienvenido al sistema MediCitas.</p>`;
        }
    }

    loginForm.addEventListener("submit", async event => {
        event.preventDefault();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        try {
            const data = await iniciarSesion(email, password);
            mostrarToast(data.mensaje || "Sesión iniciada correctamente.");
            await mostrarApp();
        } catch (error) {
            mostrarToast(error.message);
        }
    });

    registroForm.addEventListener("submit", async event => {
        event.preventDefault();
        const nombre = document.getElementById("registroNombre").value.trim();
        const apellido = document.getElementById("registroApellido").value.trim();
        const email = document.getElementById("registroEmail").value.trim();
        const password = document.getElementById("registroPassword").value;
        try {
            const data = await registrarUsuario(nombre, apellido, email, password);
            mostrarToast(data.mensaje || "Cuenta creada correctamente.");
            registroForm.reset();
            mostrarLogin();
            document.getElementById("email").value = email;
        } catch (error) {
            mostrarToast(error.message);
        }
    });

    document.getElementById("btnMostrarRegistro").addEventListener("click", mostrarRegistro);
    document.getElementById("btnMostrarLogin").addEventListener("click", mostrarLogin);
    document.getElementById("btnCerrarSesion").addEventListener("click", cerrarSesion);

    document.getElementById("btnInicio").addEventListener("click", async () => {
        const usuario = obtenerUsuario();
        if (usuario?.rol === "paciente") await mostrarPanelPaciente();
        else if (usuario?.rol === "medico") await mostrarPanelMedico();
        else if (usuario?.rol === "admin") await mostrarGestionMedicos();
        else contenido.innerHTML = `<h3>Inicio</h3><p>Bienvenido al sistema MediCitas.</p>`;
    });

    document.getElementById("btnCitas").addEventListener("click", async () => {
        const usuario = obtenerUsuario();
        if (usuario?.rol === "paciente") await mostrarCitas();
        else if (usuario?.rol === "medico") await mostrarPanelMedico();
        else contenido.innerHTML = `<h3>Gestión de citas</h3><p>Selecciona un módulo autorizado.</p>`;
    });

    document.getElementById("btnMedicos").addEventListener("click", mostrarGestionMedicos);

    document.getElementById("btnPerfil").addEventListener("click", async () => {
        try {
            const data = await apiRequest("/auth/perfil", { method: "GET" });
            const u = data.usuario;
            contenido.innerHTML = `<div class="section-heading"><div><span class="eyebrow">INFORMACIÓN PERSONAL</span><h3>Mi perfil</h3><p>Datos asociados a tu cuenta de MediCitas.</p></div></div>
                <div class="profile-grid"><div class="profile-item"><span>Nombre</span><strong>${escaparHTML(u.nombre)} ${escaparHTML(u.apellido)}</strong></div>
                <div class="profile-item"><span>Correo electrónico</span><strong>${escaparHTML(u.email)}</strong></div>
                <div class="profile-item"><span>Tipo de cuenta</span><strong>${escaparHTML(u.rol)}</strong></div></div>`;
        } catch (error) {
            mostrarToast(error.message);
        }
    });

    // GET al backend al abrir la página (catálogo público de médicos).
    cargarMedicosPublicos();

    if (estaAutenticado()) mostrarApp();
    else mostrarLogin();
});

function mostrarToast(mensaje) {
    const toast = document.getElementById("toast");
    toast.textContent = mensaje;
    toast.classList.add("show");
    window.clearTimeout(mostrarToast.timer);
    mostrarToast.timer = window.setTimeout(() => toast.classList.remove("show"), 3500);
}
