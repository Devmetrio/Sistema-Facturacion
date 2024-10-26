function validateForm(event) {
    event.preventDefault(); // Evita que el formulario se recargue

    const email = document.getElementById("exampleFormControlInput1").value;
    const password = document.getElementById("inputPassword").value;

    // Verifica si el email es exactamente 'mirko@gmail.com'
    if (email !== "mirko@gmail.com") {
        alert("El correo o contraseña no es válido.");
        return false;
    }

    // Verifica si la contraseña es exactamente '123'
    if (password !== "123") {
        alert("La contraseña debe ser 123.");
        return false;
    }

    // Si pasa la validación, redirige al usuario a 'index.html'
    window.location.href = "index.html"; // Redirigir a la página principal o la que desees
    return true;
}
