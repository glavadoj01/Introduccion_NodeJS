/**
 * Obtiene libros según el género literario
 * @param {string} genero Genéro literario
 * @returns {Promise<Object>} Objeto con los libros del género solicitado con formato API
 */
async function obtenerLibrosPorGenero(genero) {
	const url = `https://www.googleapis.com/books/v1/volumes?q=subject:${genero}`;
	try {
		// Consulta a la API externa para obtener libros por género
		// fetch => input: RequestInfo | URL:string  ; output: Promise<Response>
		const coleccionLibrosGenero = await fetch(url);
		// Verificación de la respuesta
		if (!coleccionLibrosGenero || coleccionLibrosGenero.status !== 200) {
			throw new Error(
				`Error en la solicitud de libros => Status: ${coleccionLibrosGenero.status} | Mensaje: ${coleccionLibrosGenero.statusText}`
			);
		}
		// Transformar la respuesta en JSON
		const datos = await coleccionLibrosGenero.json();
		// Verificación de resultados parseados
		if (!datos.items || datos.items.length === 0) {
			throw new Error(`No se encontraron libros para el género: ${genero}`);
		}
		// Devolver los datos obtenidos
		return datos;
		// Captura de errores
	} catch (error) {
		// Lanzar el error generado para su manejo en la ruta
		throw error;
	}
}

export { obtenerLibrosPorGenero };
