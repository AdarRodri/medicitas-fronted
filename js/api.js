const API_URL = `${API_BASE_URL}/api`;


async function apiRequest(
    endpoint,
    options = {}
) {

    const token =
        localStorage.getItem(
            "access_token"
        );


    const headers = {

        "Content-Type":
            "application/json",

        ...(options.headers || {})

    };


    if (token) {

        headers.Authorization =
            `Bearer ${token}`;

    }


    const response = await fetch(
        `${API_URL}${endpoint}`,
        {
            ...options,
            headers
        }
    );


    const data =
        await response
            .json()
            .catch(() => ({}));


    if (!response.ok) {

        throw new Error(
            data.error ||
            data.msg ||
            "Ocurrió un error"
        );

    }


    return data;
}
async function obtenerMedicos() {

    return await apiRequest(
        "/medicos",
        {
            method: "GET"
        }
    );
}