/* ================================
REQUISITOS Y CONFIGURACION PREVIA:
================================ */
// Importacion de librerias
import express from "express";
import mongoose from "mongoose";

// Asociacion de metodos de express a la variable app
const app = express();

// Middleware para parsear JSON
app.use(express.json());
// En postman, seleccionar Body -> raw -> JSON => Enviar formato JSON

// Para la conexión con MongoDB
mongoose
	.connect("mongodb://localhost:27017/apiLibros")
	.then(() => console.log("Conectado a MongoDB"))
	.catch(err => console.error("Error al conectar a MongoDB => ", err.message));

// Interfaz/Esquema de Libro
const LibroSchema = new mongoose.Schema({
	titulo: { type: String, required: true },
	autores: { type: Array, required: true },
	fecha_publicacion: { type: Date, required: true },
	genero: { type: Array, default: null },
	codigo_ISBN: { type: Array, unique: true, required: true },
	descripcion: { type: String, default: null },
});

// Asociación del esquema con el modelo "Libro"
const Libros = mongoose.model("Libros", LibroSchema, "Libros");
// El tercer parámetro especifica el nombre exacto de la colección, si no cambia plurales y minusculas

/* ================================
Funciones auxiliares API externa:
================================ */
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
		if (!coleccionLibrosGenero || coleccionLibrosGenero.status != 200) {
			throw new Error(
				`Error en la solicitud de libros => Status: ${coleccionLibrosGenero.status} | Mensaje: ${coleccionLibrosGenero.statusText}`
			);
		}
		// Transformar la respuesta en JSON
		const datos = await coleccionLibrosGenero.json();
		// Verificación de resultados parseados
		if (!datos.items || datos.items.length == 0) {
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
	// Para cada libro en items, crear un nuevo objeto con los campos requeridos, utilizamos map ("para cada objeto/libro en items")
	const librosFormateados = coleccionLibros.items.map(libro => {
		return {
			// En postman, podemos ver en que sub-objeto se encuentra cada campo requerido y tambien, que algunos se encuentran vacíos => Asignar valores por defecto
			titulo: libro.volumeInfo.title || "Título no disponible",
			autores: libro.volumeInfo.authors || ["Autor no disponible"],
			fecha_publicacion: libro.volumeInfo.publishedDate ? new Date(libro.volumeInfo.publishedDate) : null,
			genero: libro.volumeInfo.categories || ["Género no disponible"],
			codigo_ISBN: libro.volumeInfo.industryIdentifiers || ["ISBN no disponible"],
			descripcion: libro.volumeInfo.description || "Descripción no disponible",
		};
	});
	// Devolver el array de libros formateados
	return librosFormateados;
}

/* ================================
Rutas y métodos de la API local:
================================ */
// Ruta de prueba para verificar que el servidor funciona
app.get("/", (_req, res) => {
	res.send("Servidor Express funcionando");
});

// Inicio de servidor en el puerto 3000
app.listen(3000, () => {
	console.log("Servidor Express escuchando en el puerto 3000");
});

// Obtencion de libros según el género
app.get("/api/libros/:genero", async (req, res) => {
	// Obtener el género de los parámetros de la ruta; ej => /api/libros/romance
	const genero = req.params.genero ? String(req.params.genero) : "ficcion";
	// Verificar que no sea un string vacío
	if (!genero) {
		return res
			.status(400)
			.json({ error: "Debes indicar un género literario en la ruta con: api/libros/MiGeneroFavorito" });
	}

	try {
		// Obtener los libros desde la API externa
		const coleccionLibros = await obtenerLibrosPorGenero(genero);
		// Verificar que se hayan obtenido libros
		if (!coleccionLibros || coleccionLibros.totalItems === 0) {
			return res.status(404).json({ mensaje: `No se encontraron libros para el género: ${genero}` });
		}
		// Formatear los libros obtenidos
		const librosFormateados = await formatearLibros(coleccionLibros);
		// Devolver los libros formateados en la respuesta
		return res.status(200).json(librosFormateados);
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
});

// TODO: Por Hacer
// Ruta para persistencia
app.post("/api/persistir/:genero", async (req, res) => {
	try {
	} catch (error) {}
});

// TODO: Verificar Campos?; Si ya existe y Randomizar el parametro opcional ISBN si no llega
// Ruta post para guardar un libro en la base de datos
app.post("/libro", async (req, res) => {
	try {
		const nuevoLibro = await Libros.create(req.body);
		return res.status(201).json({
			mensaje: "Libro creado exitosamente",
			libro: nuevoLibro,
		});
	} catch (error) {
		return res.status(400).json({ mensaje: "Error al crear el libro", error: error.message });
	}
});

// TODO: Verificar Campos? o lo pilla el try/catch?
// Ruta put para actualizar/crear un libro en la base de datos
app.put("/libro/:id", async (req, res) => {
	const id = req.params.id;
	const datosActualizados = req.body;
	try {
		const libroActualizado = await Libros.findByIdAndUpdate(id, datosActualizados, { new: true, upsert: true });

		return res.status(201).json({
			mensaje: "Libro actualizado exitosamente",
			libro: libroActualizado,
		});
	} catch (error) {
		return res.status(500).json({ mensaje: "Error al conectar con la BD", error: error.message });
	}
});

// TODO: Por Hacer
// Ruta delete para eliminar un libro en la base de datos
app.delete("/libro/:id", async (req, res) => {
	const id = req.params.id;
	try {
	} catch (error) {}
});

// Ruta get para listar todos los libros en la base de datos
app.get("/catalogo", async (_req, res) => {
	try {
		const libros = await Libros.find();
		if (libros.length === 0) {
			return res.status(404).json({ mensaje: "No se encontraron libros en la base de datos" });
		}
		return res.status(201).json(libros);
	} catch (error) {
		return res.status(500).json({ mensaje: "Error al conectar con la BD", error: error.message });
	}
});

// TODO: Por Hacer
// Ruta get para obtener un libro según el filtro envíado (título, autor, género)
app.get("/libro", async (req, res) => {
	// Determinar el tipo de filtro y su valor
	let tipoFiltro, valor;
	if (req.query.titulo) {
		tipoFiltro = "titulo";
		valor = req.query.titulo;
	} else if (req.query.autor) {
		tipoFiltro = "autor";
		valor = req.query.autor;
	} else if (req.query.genero) {
		tipoFiltro = "genero";
		valor = req.query.genero;
	} else {
		return res.status(400).json({
			mensaje: "Debes enviar uno de estos parámetros: titulo, autor o genero; ej => /libro?autor=cervantes",
		});
	}

	// Verificar que el valor sea string
	if (typeof valor !== "string" || valor.trim() === "") {
		return res.status(400).json({ mensaje: "El valor del filtro debe ser un texto" });
	}

	// Realizar la búsqueda según el tipo de filtro
	try {
		let resultados = [];
		// TODO: Por Hacer ¿Función?

		// Verificar que se hayan encontrado resultados para el filtro
		if (!resultados || resultados.length === 0) {
			return res.status(404).json({ mensaje: `No se encontraron libros para el filtro ${tipoFiltro}: ${valor}` });
		}
		return res.status(201).json(resultados);
	} catch (error) {
		return res.status(500).json({ mensaje: "Error al conectar con la BD", error: error.message });
	}
});
