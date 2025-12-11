// Para el servidor Express
import express from "express";
import mongoose from "mongoose";

// Asociacion de metodos de express a la variable app
const app = express();

// Middleware para parsear JSON
// En postman, seleccionar Body -> raw -> JSON => Enviar formato JSON
app.use(express.json());

// Para la conexión con MongoDB
mongoose
	.connect("mongodb://localhost:27017/practicaCRUD")
	.then(() => console.log("Conectado a MongoDB"))
	.catch(err => console.error("Error al conectar a MongoDB => ", err.message));

// Interfaz/Esquema de Usuario
const UsuarioSchema = new mongoose.Schema({
	nombre: { type: String, required: true },
	email: { type: String, required: true, unique: true },
	fecha_registro: { type: Date, default: Date.now },
	direccion: { type: String, default: null },
	telefono: { type: String, default: null },
});

// Asociación del esquema con el modelo "Usuario"
const Usuario = mongoose.model("Usuario", UsuarioSchema, "Usuario");
// El tercer parámetro especifica el nombre exacto de la colección, si no cambia plurales y minusculas

// Ruta de prueba para verificar que el servidor funciona
app.get("/", (_req, res) => {
	res.send("Servidor Express funcionando");
});

// Ruta Crear Usuario
app.post("/usuario", async (req, res) => {
	try {
		const nuevoUsuario = await Usuario.create(req.body);
		return res.status(201).json({
			mensaje: "Usuario creado exitosamente",
			usuario: nuevoUsuario,
		});
	} catch (error) {
		res.status(400).json({ mensaje: "Error al crear el usuario", error: error.message });
	}
});

// Ruta Listar Todos los Usuarios
app.get("/usuario", async (_req, res) => {
	try {
		const usuarios = await Usuario.find();
		if (usuarios.length === 0) {
			return res.status(404).json({ mensaje: "No se encontrarón usuarios" });
		}
		return res.status(201).json(usuarios);
	} catch (error) {
		return res.status(500).json({ mensaje: "Error al conectar con la BD", error: error.message });
	}
});

// Ruta Obtener Usuarios por id
app.get("/usuario/:id", async (req, res) => {
	try {
		const usuarioEncontrado = await Usuario.findById(req.params.id);
		if (!usuarioEncontrado) {
			return res.status(404).json({ mensaje: "Usuario no encontrado", id: req.params.id });
		}
		return res.status(201).json(usuarioEncontrado);
	} catch (error) {
		return res.status(500).json({ mensaje: "Error al conectar con la BD", error: error.message });
	}
});

// Actualizar Usuario por id
app.put("/usuario/:id", async (req, res) => {
	const id = req.params.id;
	const datosActualizados = req.body;
	try {
		const usuarioActualizado = await Usuario.findByIdAndUpdate(id, datosActualizados, { new: true, upsert: true });

		return res.status(201).json({
			mensaje: "Usuario actualizado exitosamente",
			usuario: usuarioActualizado,
		});
	} catch (error) {
		return res.status(500).json({ mensaje: "Error al conectar con la BD", error: error.message });
	}
});

// Iniciar el servidor en el puerto 3000
app.listen(3000, () => {
	console.log("Actualización del Srv 😀");
	console.log("Servidor escuchando en el puerto 3000");
});
