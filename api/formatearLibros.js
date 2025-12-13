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
		// Aseguramos campos para leer y evitar errores de indefinido/null
		const volInfo = libro.volumeInfo || {};
		const ids = Array.isArray(volInfo.industryIdentifiers) ? volInfo.industryIdentifiers : null;
		const fecha = volInfo.publishedDate ? new Date(volInfo.publishedDate) : null;
		// Si existen ids, como array no vacío, y el primer elemento tiene type e identifier válidos (no vacíos tras trim) => usarlos o si no, null
		const validIds = ids && ids.length > 0 && ids[0].type?.trim() && ids[0].identifier?.trim() ? ids : null;
		// Si es distinto de null, usar validIds, si no, asignar un array con un ID por defecto
		const codigoISBN = validIds ? validIds : [{ type: "ISBN", identifier: `No disponible nº${idFaltante}` }];
		// Si validIds es distinto de null, usar el primer ID para ISBN_Pr, si no, asignar el mismo valor por defecto e incrementar el contador
		const isbnPr = validIds
			? `${validIds[0].type}-${validIds[0].identifier}`
			: `ISBN-No disponible nº${idFaltante++}`;
		// El operador ++ se aplica despues de la lectura (en ambos: asigna a codigo, asigna a Pr, y luego, incrementa)

		return {
			// En postman, podemos ver en que sub-objeto se encuentra cada campo requerido y tambien, que algunos se encuentran vacíos => Asignar valores por defecto
			titulo: volInfo.title ?? "Título no disponible",
			autores: volInfo.authors ?? ["Autor no disponible"],
			fecha_publicacion: fecha && !isNaN(fecha.valueOf()) ? fecha : new Date(Date.now()), // Si no hay fecha o es inválida, asignar la fecha actual
			genero: volInfo.categories ?? null,
			codigo_ISBN: codigoISBN,
			ISBN_Pr: isbnPr,
			descripcion: volInfo.description ?? null,
			// Los valores por defecto deben ir acorde al tipo de dato esperado por el esquema Libro (null, string, [string], etc)
		};
	});
	// Devolver el array de libros formateados
	return librosFormateados;
}

export { formatearLibros };
