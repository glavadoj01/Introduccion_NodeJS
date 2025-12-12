import mongoose from "mongoose";

// Interfaz/Esquema de Libro
const LibroSchema = new mongoose.Schema({
	titulo: { type: String, required: true },
	autores: { type: [String], required: true },
	fecha_publicacion: { type: Date, required: true },
	genero: { type: [String], default: null },
	codigo_ISBN: {
		type: [
			{
				type: { type: String },
				identifier: { type: String },
			},
		],
		required: true,
	},
	ISBN_Pr: { type: String, required: true, unique: true },
	descripcion: { type: String, default: null },
});

export { LibroSchema };
