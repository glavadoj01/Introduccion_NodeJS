// Para el servidor Express
const express = require("express");
const app = express();
// Para la conexión con MongoDB
const mongoose = require("mongoose");
mongoose
	.connect("mongodb://localhost:27017/practicaCRUD")
	.then(() => console.log("Conectado a MongoDB"))
	.catch(err => console.error("Error al conectar a MongoDB => ", err));

// Ruta de prueba para verificar que el servidor funciona
app.get("/", (req, res) => {
	res.send("Servidor Express funcionando");
});

// Iniciar el servidor en el puerto 3000
app.listen(3000, () => {
	console.log("Servidor escuchando en el puerto 3000");
});

// Interfaz/Esquema de Usuario
const UsuarioSchema = new mongoose.Schema({
	nombre: { type: String, required: true },
	email: { type: String, required: true, unique: true },
	fecha_registro: { type: Date, required: true, default: Date.now },
	direccion: { type: String, default: null },
	telefono: { type: String, default: null },
});

// Asociación del esquema con el modelo "Usuario" y exportación
const Usuario = mongoose.model("Usuario", UsuarioSchema, "Usuario");
// El tercer parámetro especifica el nombre exacto de la colección, si no cambia plurales y minusculas

app.post("/usuario/usuario7", async (req, res) => {
	try {
		const nuevoUsuario = await Usuario.create(req.body);
		return res.status(201).json({
			mensaje: "Usuario creado exitosamente",
			usuario: nuevoUsuario,
		});
	} catch (error) {
		res.status(400).json({ mensaje: "Error al crear el usuario", error });
	}
});

app.get("/usuario/:id", async (req, res) => {
	try {
		const usuarioEncontrado = await Usuario.findById(req.params.id);
		if (!usuarioEncontrado) {
			return res.status(404).json({ mensaje: "Usuario no encontrado" });
		}
		res.json(usuarioEncontrado);
	} catch (error) {
		res.status(400).json({ mensaje: "Error al obtener el usuario", error });
	}
});
