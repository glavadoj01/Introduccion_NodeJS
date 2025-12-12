/* ================================
REQUISITOS Y CONFIGURACION PREVIA:
================================ */
// Importacion de librerias externas
import express from "express";
import mongoose from "mongoose";
// Importacion de funciones auxiliares
import { obtenerLibrosPorGenero } from "./api/obtenerLibrosPorGenero.js";
import { formatearLibros } from "./api/formatearLibros.js";
import {
	verificarCampos,
	verificarTitulo,
	verificarAutor,
	verificarFecha,
	verificarGenero,
	verificarISBN,
	verificarDescripcion,
} from "./functions/verificarCampos.js";
// Importacion del esquema/interfaz de Libro
import { LibroSchema } from "./interface/libroSchema.js";
// Importacion de la página de bienvenida
import { paginaInicio } from "./html/paginaInicio.js";
import { errorRuta } from "./html/errorRuta.js";

/* ================================
Configuración de Express y Mongoose:
================================ */
// Asociacion de metodos de express a la variable app
const app = express();
// Middleware para parsear JSON
app.use(express.json()); // En postman, seleccionar Body -> raw -> JSON => Enviar formato JSON
// Para la conexión con MongoDB
mongoose
	.connect("mongodb://localhost:27017/apiLibros")
	.then(() => console.log("Conectado a MongoDB"))
	.catch(err => console.error("Error al conectar a MongoDB => ", err.message));
// Asociación del esquema con el modelo "Libro"
const Libros = mongoose.model("Libros", LibroSchema, "Libros");
// El tercer parámetro especifica el nombre exacto de la colección, si no cambia plurales y minusculas

/* ================================
Rutas y métodos de la API local:
================================ */
// Inicio de servidor en el puerto 3000
app.listen(3000, () => {
	console.log("Servidor Express escuchando en el puerto 3000");
});

// Ruta de prueba para verificar que el servidor funciona
app.get("/", (req, res) => {
	let respuesta = "";
	if (req.query.error === "ruta") {
		respuesta += errorRuta;
	}
	respuesta += paginaInicio;
	res.send(respuesta);
});

// Obtencion de libros según el género
app.get("/api/libros/:genero", async (req, res) => {
	// Obtener el género de los parámetros de la ruta; ej => /api/libros/romance
	const genero = String(req.params.genero).trim();
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
	// Obtener el género de los parámetros de la ruta; ej => /api/libros/romance
	const genero = String(req.params.genero).trim();
	// Verificar que no sea un string vacío
	if (!genero) {
		return res
			.status(400)
			.json({ error: "Debes indicar un género literario en la ruta con: api/persistir/MiGeneroFavorito" });
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

		// Guardar los libros formateados en la base de datos
		// TODO: Por Hacer
		return null;
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
});

// Ruta post para guardar un libro en la base de datos
app.post("/libro", async (req, res) => {
	let datosLibro = req.body || null; // Por si no se envía el body
	if (datosLibro === null) {
		return res.status(400).json({ mensaje: "Debes enviar los datos del libro en el cuerpo de la solicitud" });
	}
	// Verificar que se envíen los campos obligatorios
	const codigoVerificacion = verificarCampos(datosLibro);
	if (codigoVerificacion !== 0) {
		switch (codigoVerificacion) {
			case 1:
				return res.status(400).json({ mensaje: "Falta o falla campo obligatorio: Titulo" });
			case 2:
				return res.status(400).json({ mensaje: "Falta o falla campo obligatorio: Autor/es" });
			case 3:
				return res.status(400).json({ mensaje: "Falta o falla campo obligatorio: Fecha" });
			case 4:
				return res.status(400).json({ mensaje: "Falla el campo opcional: Genero/s" });
			case 5:
				return res.status(400).json({ mensaje: "Falla el campo opcional: Codigo/s ISBN" });
			case 6:
				return res.status(400).json({ mensaje: "Falla el campo opcional: Descripcion" });
			default:
				return res.status(400).json({ mensaje: "Error desconocido en la verificación de campos" });
		}
	}

	// Generar generos como null si no llega como tal
	if (!datosLibro.genero) {
		datosLibro.genero = null;
	}
	// Generar un código ISBN aleatorio si no se proporciona (restricción única en el esquema)
	if (!datosLibro.codigo_ISBN) {
		datosLibro.codigo_ISBN = [
			{
				type: `ISBN-10`,
				identifier: Math.floor(Math.random() * 10000000000)
					.toString()
					.substring(0, 10)
					.padStart(10, "0"),
			},
		];
	}
	// Siempre asignar el ISBN_Pr basado en el codigo_ISBN proporcionado en 1º lugar (si hay varios)
	datosLibro.ISBN_Pr = datosLibro.codigo_ISBN[0].type + datosLibro.codigo_ISBN[0].identifier;
	// Asegurar que la descripción sea null si no se proporciona
	if (!datosLibro.descripcion) {
		datosLibro.descripcion = null;
	}

	// Crear el nuevo libro en la base de datos
	try {
		const nuevoLibro = await Libros.create(datosLibro);
		return res.status(201).json({
			mensaje: "Libro creado exitosamente",
			libro: nuevoLibro,
		});
	} catch (error) {
		return res.status(400).json({ mensaje: "Error al crear el libro", error: error.message });
	}
});

// Ruta put para actualizar/crear un libro en la base de datos
app.put("/libro/:id", async (req, res) => {
	const id = req.params.id;
	const datosActualizados = req.body || null;
	if (datosActualizados === null) {
		return res.status(400).json({ mensaje: "Debes enviar los datos a actualizar en el cuerpo de la solicitud" });
	}

	// ! ===============================
	// ? ¿Se pueden permitir campos nuevos?
	if (Object.keys(datosActualizados).length === 0) {
		return res.status(400).json({ mensaje: "Debes enviar los datos a actualizar" });
	}
	// ! ===============================
	// ? O solo permitir los campos del esquema
	if (
		!datosActualizados.titulo &&
		!datosActualizados.autores &&
		!datosActualizados.fecha_publicacion &&
		!datosActualizados.genero &&
		!datosActualizados.codigo_ISBN &&
		!datosActualizados.descripcion
	) {
		return res.status(400).json({
			mensaje:
				"Debes enviar al menos un campo válido para actualizar: titulo, autores, fecha_publicacion, genero, codigo_ISBN, descripcion",
		});
	}
	// ! ===============================

	// Verificar los campos que están presentes
	if (datosActualizados.titulo && verificarTitulo(datosActualizados.titulo) === false) {
		return res.status(400).json({ mensaje: "Fallo de formato: Titulo" });
	}
	if (datosActualizados.autores && verificarAutor(datosActualizados.autores) === false) {
		return res.status(400).json({ mensaje: "Fallo de formato: Autor" });
	}
	if (datosActualizados.fecha_publicacion && verificarFecha(datosActualizados.fecha_publicacion) === false) {
		return res.status(400).json({ mensaje: "Fallo de formato: Fecha" });
	}
	if (datosActualizados.genero && verificarGenero(datosActualizados.genero) === false) {
		return res.status(400).json({ mensaje: "Fallo de formato: Genero" });
	}
	if (datosActualizados.codigo_ISBN && verificarISBN(datosActualizados.codigo_ISBN) === false) {
		return res.status(400).json({ mensaje: "Fallo de formato: Codigo_ISBN" });
	}
	if (datosActualizados.descripcion && verificarDescripcion(datosActualizados.descripcion) === false) {
		return res.status(400).json({ mensaje: "Fallo de formato: Descripcion" });
	}

	// Si se actualiza el codigo_ISBN, actualizar tambien el ISBN_Pr
	if (datosActualizados.codigo_ISBN) {
		datosActualizados.ISBN_Pr = datosActualizados.codigo_ISBN[0].type + datosActualizados.codigo_ISBN[0].identifier;
	}

	// Actualizar el libro en la base de datos
	try {
		const libroActualizado = await Libros.findByIdAndUpdate(id, datosActualizados, {
			new: true,
			upsert: true,
			runValidators: true,
		});

		return res.status(200).json({
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
	const id = req.params.id.trim();
	if (!id || id === "") {
		return res.status(400).json({ mensaje: "Debes proporcionar un ID de libro para eliminar" });
	}
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
		return res.status(200).json(libros);
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
	} else if (req.query.autores) {
		tipoFiltro = "autores";
		valor = req.query.autores;
	} else if (req.query.genero) {
		tipoFiltro = "genero";
		valor = req.query.genero;
	} else {
		return res.status(400).json({
			mensaje: "Debes enviar uno de estos parámetros: titulo, autores o genero; ej => /libro?autores=cervantes",
		});
	}

	// Verificar que el valor sea string
	if (typeof valor !== "string" || valor.trim() === "") {
		return res.status(400).json({ mensaje: "El valor del filtro debe ser un texto" });
	}

	// Realizar la búsqueda según el tipo de filtro
	try {
		let resultados = {};
		// TODO: Por Hacer ¿Función?

		// Verificar que se hayan encontrado resultados para el filtro
		if (Object.keys(resultados).length === 0) {
			return res
				.status(404)
				.json({ mensaje: `No se encontraron libros para el filtro de ${tipoFiltro}: ${valor}` });
		}
		return res.status(200).json(resultados);
	} catch (error) {
		return res.status(500).json({ mensaje: "Error al conectar con la BD", error: error.message });
	}
});

// Ruta invalida
app.use((_req, res) => {
	res.status(301).redirect("/?error=ruta");
});
// Alternativa con regex:
// app.get(/.*/, (_req,res) => {
//    res.redirect('/?error=ruta');
// });
