async function iniciarSesion(
    email,
    password
) {

    const data = await apiRequest(
        "/auth/login",
        {
            method: "POST",

            body: JSON.stringify({
                email,
                password
            })
        }
    );


    localStorage.setItem(
        "access_token",
        data.access_token
    );


    localStorage.setItem(
        "usuario",
        JSON.stringify(
            data.usuario
        )
    );


    return data;
}


async function registrarUsuario(
    nombre,
    apellido,
    email,
    password
) {

    return await apiRequest(
        "/auth/registro",
        {
            method: "POST",

            body: JSON.stringify({

                nombre,
                apellido,
                email,
                password

            })
        }
    );
}


function cerrarSesion() {

    localStorage.removeItem(
        "access_token"
    );

    localStorage.removeItem(
        "usuario"
    );

    window.location.reload();
}


function obtenerUsuario() {

    const usuario =
        localStorage.getItem(
            "usuario"
        );


    if (!usuario) {

        return null;

    }


    return JSON.parse(
        usuario
    );
}


function estaAutenticado() {

    return Boolean(
        localStorage.getItem(
            "access_token"
        )
    );
}