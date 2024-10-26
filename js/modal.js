export function showModal(message) {
    document.getElementById("modalMessage").innerText = message;
    document.getElementById("myModal").style.display = "block";
    const modal = document.getElementById('myModal');
    const closeButton = document.querySelector('.close');
    closeButton.onclick = function () {
        modal.style.display = 'none'; // Oculta el modal
    }

    // Cierra el modal si se hace clic fuera de la caja de contenido
    window.onclick = function (event) {
        if (event.target === modal) {
            modal.style.display = 'none'; // Oculta el modal
        }
    }
}