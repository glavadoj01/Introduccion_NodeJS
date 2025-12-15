let paginaInicio = `<div style="margin: 2rem auto; padding: 1rem; width:fit-content;">
    <h1>Servidor Express funcionando</h1>
    <p>Rutas disponibles:</p>
    <ul>
        <li style="margin: 1rem auto">Api de Libros externa:
            <ul>
                <li>GET /api/libros/:genero - Obtener libros según el género</li>
                <li>POST /api/persistir/:genero - Persistir libros de un género en la base de datos</li>
            </ul>
        </li>
        <li style="margin: 1rem auto">API Local de Libros:
            <ul>
                <li>POST /libro - Crear un nuevo libro</li>
                <li>PUT /libro/:id - Actualizar o crear un libro por ID</li>
                <li>DELETE /libro/:id - Eliminar un libro por ID</li>
                <li>GET /catalogo - Listar todos los libros en la base de datos</li>
                <li>GET /libro?titulo=... | /libro?autores=... | /libro?genero=... - Obtener libros según filtro</li>
                <li>GET /demo - Ver demostración de las funcionalidades del servidor</li>
            </ul>
        </li>
    </ul>
</div>`;

export { paginaInicio };
