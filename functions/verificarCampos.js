/**
 *  Verifica los campos de un objeto datosLibro.
 *  @param {Object} datosLibro
 *  @returns {number} Código de error o 0 si es válido
 */
function verificarCampos(datosLibro) {
	// Verificar que se envíen los campos obligatorios
	if (verificarTitulo(datosLibro.titulo) === false) return 1; // Falta título
	if (verificarAutor(datosLibro.autores) === false) return 2; // Falta autor o no es un array[autor/es]
	if (verificarFecha(datosLibro.fecha_publicacion) === false) return 3; // Falta fecha o formato incorrecto

	// Verificar los formatos de los campos opcionales si están presentes
	if (datosLibro.genero && verificarGenero(datosLibro.genero) === false) return 4; // Formato incorrecto en género
	if (datosLibro.codigo_ISBN && verificarISBN(datosLibro.codigo_ISBN) === false) return 5; // Formato incorrecto en código_ISBN
	if (datosLibro.descripcion && verificarDescripcion(datosLibro.descripcion) === false) return 6; // Formato incorrecto en descripción

	return 0; // Todos los campos son válidos
}

function verificarTitulo(titulo = null) {
	if (titulo === null || typeof titulo !== "string" || titulo.trim() === "") return false;
	return true; // Título válido
}

function verificarAutor(autor = null) {
	if (autor === null || !Array.isArray(autor) || autor.length === 0) return false;
	return true; // Autor válido
}

function verificarFecha(fecha = null) {
	// No hay fecha
	if (fecha === null) return false;

	// Verificar si es instancia de Date
	if (fecha instanceof Date) {
		// Date:inválida es instancia de Date, pero noEsNumero
		return !isNaN(fecha.valueOf()); // Devuelve !noEsNumero
	}

	if (typeof fecha === "string") {
		return !isNaN(Date.parse(fecha)); // string parseable a fecha válida
	}

	return false; // Formato incorrecto
}

function verificarGenero(genero) {
	if (!Array.isArray(genero) || genero.length === 0) return false;
	return true; // Género válido
}

function verificarISBN(codigo_ISBN) {
	if (!Array.isArray(codigo_ISBN)) return false;
	for (let { type, identifier } of codigo_ISBN) {
		if (typeof type !== "string" || typeof identifier !== "string") {
			return false;
		}
		if (type.trim() === "" || identifier.trim() === "") {
			return false;
		}
	}
	return true; // Código ISBN válido
}

function verificarDescripcion(descripcion) {
	if (typeof descripcion !== "string") return false;
	if (descripcion.trim() === "") return false;
	return true; // Descripción válida
}

export {
	verificarCampos,
	verificarTitulo,
	verificarAutor,
	verificarFecha,
	verificarGenero,
	verificarISBN,
	verificarDescripcion,
};
