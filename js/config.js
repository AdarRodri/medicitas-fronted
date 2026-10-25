/* Dirección del backend.
   - En tu computador (localhost) usa el backend local.
   - Desplegado, usa la URL pública del backend: cámbiala por la tuya (sin "/" al final). */
const BACKEND_PRODUCCION = "https://medicitas-api-4j9t.onrender.com/";

const API_BASE_URL =
    location.hostname === "localhost" || location.hostname === "127.0.0.1"
        ? "http://127.0.0.1:5000"
        : BACKEND_PRODUCCION;
