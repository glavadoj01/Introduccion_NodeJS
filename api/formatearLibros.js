/**
 * Formatea la colección de libros obtenida desde la API externa con los campos requeridos
 * @param {Object} coleccionLibros Colección de libros obtenida desde la API externa
 * @returns {Promise<Array>} Array de libros formateados
 */
async function formatearLibros(coleccionLibros) {
	/* Respuesta de API:
        "kind": "books#volumes",
        "totalItems": 1000000,
        "items": [...]
    */

	let idFaltante = 1; // Contador para asignar IDs únicos si faltan
	// Para cada libro en items, crear un nuevo objeto con los campos requeridos, utilizamos map ("para cada objeto/libro en items")
	const librosFormateados = coleccionLibros.items.map(libro => {
		return {
			// En postman, podemos ver en que sub-objeto se encuentra cada campo requerido y tambien, que algunos se encuentran vacíos => Asignar valores por defecto
			titulo: libro.volumeInfo.title || "Título no disponible",
			autores: libro.volumeInfo.authors || ["Autor no disponible"],
			fecha_publicacion: libro.volumeInfo.publishedDate ? new Date(libro.volumeInfo.publishedDate) : null,
			genero: libro.volumeInfo.categories || null,
			codigo_ISBN: libro.volumeInfo.industryIdentifiers || [{ type: "ISBN", identifier: "No disponible" }],
			ISBN_Pr:
				libro.volumeInfo.industryIdentifiers && libro.volumeInfo.industryIdentifiers.length > 0
					? libro.volumeInfo.industryIdentifiers[0].type + libro.volumeInfo.industryIdentifiers[0].identifier
					: `No disponible nº${idFaltante++}`, // Asignar un ID único si falta e incrementar el contador
			descripcion: libro.volumeInfo.description || null,
		};
	});
	// Devolver el array de libros formateados
	return librosFormateados;
}

export { formatearLibros };
