/* NOTA IMPORTANTE:
1º Dependencias: npm install
2º LEVANTAR CON: npm start   (o node tarea.js; start configurado en package.json para usar nodemon y fichero tarea.js)
3º VISITAR: http://localhost:3000/demo   (explicación y demostración de la API en video e imágenes)

Notas v2:
    - Se eliminan verificaciones innecesarias en las rutas /api/libros/:genero
        y demas rutas (si no hay parametro, no se llega a la ruta => ruta error/predeterminada)
    - En la ruta PUT /libro/:id, runValidators no sirve para validar campos obligatorios en upsert:true,
        por lo que se añade verificación manual previa.
    - Comentarios aclaratorios en el código.
*/
/* ================================
REQUISITOS Y CONFIGURACION PREVIA:
================================ */
// Importacion de librerias externas
import express from "express";
import mongoose from "mongoose";
import path from "path"; // Para redireción de rutas a archivos estáticos
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
import { generarISBN10 } from "./functions/generarISBN10.js";
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
// Middleware para servir archivos estáticos (HTML, CSS, JS, imágenes) (Explicado por IA)
app.use(express.static(path.resolve("html")));
app.use(express.static(path.resolve("img")));

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
	const genero = req.params.genero;

	// ? Incecesario: Si no hay ':genero' en la ruta, no se llega a este punto. Salta ruta "error/predefinida"
	// ? Fragmento comentado de la v.1; en el resto se elimina por claridad
	// Verificar que no sea un string vacío
	// if (!genero) {
	// 	return res
	// 		.status(400)
	// 		.json({ error: "Debes indicar un género literario en la ruta con: api/libros/MiGeneroFavorito" });
	// }

	try {
		// Obtener los libros desde la API externa (la función ya lanza error si no hay libros)
		const coleccionLibros = await obtenerLibrosPorGenero(genero);

		// Formatear los libros obtenidos
		const librosFormateados = await formatearLibros(coleccionLibros);

		// Devolver los libros formateados en la respuesta
		return res.status(200).json(librosFormateados);
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
});

// Ruta para persistencia
app.post("/api/persistir/:genero", async (req, res) => {
	// Obtener el género de los parámetros de la ruta; ej => /api/libros/romance
	const genero = req.params.genero;

	try {
		// Obtener los libros desde la API externa (la función ya lanza error si no hay libros)
		const coleccionLibros = await obtenerLibrosPorGenero(genero);

		// Formatear los libros obtenidos
		const librosFormateados = await formatearLibros(coleccionLibros);

		// Guardar los libros formateados en la base de datos
		let librosGuardados = [];
		for (const libroData of librosFormateados) {
			const nuevoLibro = await Libros.create(libroData);
			if (!nuevoLibro) {
				return res.status(500).json({
					mensaje: `Error al guardar el libro (${libroData.titulo}) en la base de datos. Operación abortada tras guardar ${librosGuardados.length} libros.`,
					libro: libroData,
				});
			}
			librosGuardados.push(nuevoLibro);
		}
		return res.status(201).json({
			mensaje: `Se han guardado ${librosGuardados.length} elementos del género ${genero} guardados exitosamente`,
			libros: librosGuardados,
		});
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
});

// Array de campos permitidos para actualizar (prettier-ignore, para que el formateador no lo divida en varias líneas)
// prettier-ignore
const camposPermitidos = ["titulo", "autores", "fecha_publicacion", "genero", "codigo_ISBN", "descripcion"]

// Ruta post para guardar un libro en la base de datos
app.post("/libro", async (req, res) => {
	let datosLibro = req.body || null; // Por si no se envía el body
	if (datosLibro === null) {
		return res.status(400).json({ mensaje: "Debes enviar los datos del libro en el cuerpo de la solicitud" });
	}

	// Verificar que no se envíen campos no permitidos
	if (Object.keys(datosLibro).some(key => !camposPermitidos.includes(key))) {
		// some = "algún" => Sí alguna clave no(!) esta incluida en el array de campos permitidos.
		return res.status(400).json({
			mensaje:
				"Solo se permiten los siguientes campos para Libro: titulo, autores, fecha_publicacion, genero?, codigo_ISBN?, descripcion? (? = opcional)",
		});
	}

	// Verificar que se envíen los campos obligatorios
	const codigoVerificacion = verificarCampos(datosLibro);
	if (codigoVerificacion !== 0) {
		switch (codigoVerificacion) {
			case 1:
				return res.status(400).json({ mensaje: "Falta o falla campo obligatorio: Titulo -> String" });
			case 2:
				return res.status(400).json({ mensaje: "Falta o falla campo obligatorio: Autor/es -> Array[String]" });
			case 3:
				// prettier-ignore
				return res.status(400).json({ mensaje: "Falta o falla campo obligatorio: Fecha -> Convertible a Date: yyyy | yyyy-mm-dd" });
			case 4:
				return res.status(400).json({ mensaje: "Falla el campo opcional: Genero/s -> Array[String]" });
			case 5:
				// prettier-ignore
				return res.status(400).json({ mensaje: "Falla el campo opcional: Codigo/s ISBN -> Array[Objetc{type,identifier}]" });
			case 6:
				return res.status(400).json({ mensaje: "Falla el campo opcional: Descripcion -> String" });
			default:
				return res.status(400).json({ mensaje: "Error desconocido en la verificación de campos" });
		}
	}

	// Generar generos como null si no llega como tal
	if (!datosLibro.genero) {
		datosLibro.genero = null;
	}

	// Generar un código ISBN aleatorio si no se proporciona (restricción única en el esquema, pero no obligatoria para usuario POST-PUT)
	if (!datosLibro.codigo_ISBN) {
		datosLibro.codigo_ISBN = generarISBN10();
	}
	// Siempre asignar el ISBN_Pr basado en el codigo_ISBN proporcionado en 1º lugar (si hay varios)
	datosLibro.ISBN_Pr = datosLibro.codigo_ISBN[0].type + "-" + datosLibro.codigo_ISBN[0].identifier;

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
// Para pruebas de generar si no existe: MongoDb requiere un ObjectId válido como id en la ruta (123 no vale) => Ejecutar:
// node -e "console.log(new (require('mongoose')).Types.ObjectId())"
// Proporciona un ObjectId válido para usar en la ruta si se quiere crear un libro nuevo
app.put("/libro/:id", async (req, res) => {
	const id = req.params.id;
	const datosActualizados = req.body || null;
	if (datosActualizados === null) {
		return res.status(400).json({ mensaje: "Debes enviar los datos a actualizar en el cuerpo de la solicitud" });
	}

	// Verificar que no se envíen campos no permitidos
	if (
		Object.keys(datosActualizados).length === 0 ||
		Object.keys(datosActualizados).some(
			// some = "algún" => Sí alguna clave no(!) esta incluida en el array de campos permitidos.
			key => !camposPermitidos.includes(key)
		)
	) {
		return res.status(400).json({
			mensaje:
				"Solo se permiten los siguientes campos para actualizar: titulo, autores, fecha_publicacion, genero, codigo_ISBN, descripcion",
		});
	}

	// Verificar los campos que están presentes (!== undefined). (Le pongo el === false por recomendación de Miguel Angel, sé que no es necesario)
	if (datosActualizados.titulo !== undefined && verificarTitulo(datosActualizados.titulo) === false) {
		return res.status(400).json({ mensaje: "Fallo de formato: Titulo -> String" });
	}
	if (datosActualizados.autores !== undefined && verificarAutor(datosActualizados.autores) === false) {
		return res.status(400).json({ mensaje: "Fallo de formato: Autores -> Array[String]" });
	}
	// prettier-ignore
	if (datosActualizados.fecha_publicacion !== undefined && verificarFecha(datosActualizados.fecha_publicacion) === false) {
		return res.status(400).json({ mensaje: "Fallo de formato: Fecha -> Convertible a Date: yyyy | yyyy-mm-dd" });
    }
	if (datosActualizados.genero !== undefined && verificarGenero(datosActualizados.genero) === false) {
		return res.status(400).json({ mensaje: "Fallo de formato: Genero -> Array[String]" });
	}
	if (datosActualizados.codigo_ISBN !== undefined && verificarISBN(datosActualizados.codigo_ISBN) === false) {
		return res.status(400).json({ mensaje: "Fallo de formato: Codigo_ISBN -> Array[Objetc{type,identifier}]" });
	}
	if (datosActualizados.descripcion !== undefined && verificarDescripcion(datosActualizados.descripcion) === false) {
		return res.status(400).json({ mensaje: "Fallo de formato: Descripcion -> String" });
	}

	// Si se actualiza el codigo_ISBN, actualizar tambien el ISBN_Pr
	if (datosActualizados.codigo_ISBN) {
		datosActualizados.ISBN_Pr =
			datosActualizados.codigo_ISBN[0].type + "-" + datosActualizados.codigo_ISBN[0].identifier;
	}

	// Actualizar el libro en la base de datos
	try {
		// 1º Ver si existe el libro
		const libroExistente = await Libros.findById(id);
		if (!libroExistente) {
			// 2º Si no existe: verificar que se envíen todos los campos obligatorios para crear
			if (!datosActualizados.titulo || !datosActualizados.autores || !datosActualizados.fecha_publicacion) {
				return res.status(400).json({
					mensaje:
						"El libro no existe. Para crearlo debes enviar los campos obligatorios: titulo, autores y fecha_publicacion",
				});
			}
			// 3º Si no existe y se envían los campos obligatorios: asegurar codigoISBN e ISBN_Pr (si no se envían => Random)
			if (!datosActualizados.codigo_ISBN) {
				datosActualizados.codigo_ISBN = generarISBN10();
				datosActualizados.ISBN_Pr =
					datosActualizados.codigo_ISBN[0].type + "-" + datosActualizados.codigo_ISBN[0].identifier;
			}

			// 4º Asegurar genero y descripcion como null si no se envían
			if (!datosActualizados.genero) {
				datosActualizados.genero = null;
			}
			if (!datosActualizados.descripcion) {
				datosActualizados.descripcion = null;
			}
		}

		// 5º Actualizar o crear el libro
		const libroActualizado = await Libros.findByIdAndUpdate(id, datosActualizados, {
			// new:true -> Devolver el documento modificado (no el original)
			new: true,
			// upsert:true -> Si no existe, crear uno nuevo con los datos proporcionados
			upsert: true,
			// No vale, solo valida los campos que sí envío (y ya he verificado yo de antemano), no que existan todos los obligatorios
			// Se mantiene por mayor seguiridad y por verificar en origen y destino
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

// Ruta delete para eliminar un libro en la base de datos
app.delete("/libro/:id", async (req, res) => {
	const id = req.params.id;

	try {
		const libroEliminado = await Libros.findByIdAndDelete(id);
		if (!libroEliminado) {
			return res.status(404).json({ mensaje: "Libro no encontrado", id: id });
		}
		return res.status(200).json({
			mensaje: "Libro eliminado exitosamente",
			libro: libroEliminado,
		});
	} catch (error) {
		return res.status(500).json({ mensaje: "Error al conectar con la BD", error: error.message });
	}
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

// Ruta get para obtener un libro según el filtro envíado (título, autor, género)
app.get("/libro", async (req, res) => {
	try {
		// Determinar los tipos de filtros y sus valores (deben estar en el try catch para evitar fallos de definición faltante)
		let filtros = {};
		if (req.query.titulo) {
			filtros.titulo = { $regex: req.query.titulo, $options: "i" }; // "i": Búsqueda case-insensitive
		}
		if (req.query.autores) {
			filtros.autores = { $regex: req.query.autores, $options: "i" };
		}
		if (req.query.genero) {
			filtros.genero = { $regex: req.query.genero, $options: "i" };
		}
		// Verificar que se haya enviado al menos un filtro
		if (Object.keys(filtros).length === 0) {
			return res.status(400).json({
				mensaje:
					"Debes enviar al menos, uno de estos parámetros: titulo, autores o genero; ej => /libro?autores=cervantes",
			});
		}

		// Verificar que el valor/regex sea string
		for (const key in filtros) {
			if (!filtros[key].$regex || typeof filtros[key].$regex !== "string") {
				return res.status(400).json({ mensaje: "El valor del filtro debe ser un texto" });
			}
		}

		// Realizar la búsqueda según el tipo de filtro
		const resultados = await Libros.find(filtros);

		// Generar un resumen de los filtros aplicados
		const resumen = Object.entries(filtros)
			.map(([k, v]) => `${k}='${v.$regex}'`)
			.join(" | ");

		// Verificar que se hayan encontrado resultados para el filtro
		if (resultados.length === 0) {
			return res.status(404).json({ mensaje: `No se encontraron libros para: ( ${resumen} )` });
		}

		return res.status(200).json({ mensaje: `Filtros aplicados: ${resumen}`, resultado: resultados });
	} catch (error) {
		return res.status(500).json({ mensaje: "Error al conectar con la BD", error: error.message });
	}
});

// Ruta para la página de demostración
app.get("/demo", (_req, res) => {
	res.redirect("/demostracion.html");
});

// Rutas invalidas o no definidas: redirigir a la página de inicio(/) con mensaje de error
app.use((_req, res) => {
	res.status(301).redirect("/?error=ruta");
});
// Alternativa con regex:
// app.get(/.*/, (_req,res) => {
//    res.redirect('/?error=ruta');
// });
