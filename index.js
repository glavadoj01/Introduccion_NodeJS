const express = require("express");
const app = express();

app.get("/", (req, res) => {
	res.send("Servidor Express funcionando");
});

app.get("/clima", async (req, res) => {
	const ciudad = req.query.ciudad || "zafra";

	if (!ciudad) return res.status(400).json({ error: "Debes indicar una ciudad usando ?ciudad=Nombre" });

	try {
		const { latitud, longitud } = await obtenerCoordenadas(ciudad);
		let clima = await obtenerTiempo(latitud, longitud, ciudad);
		return res.json(clima);
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
});

app.listen(3000, () => {
	console.log("Servidor escuchando en el puerto 3000");
});

async function obtenerCoordenadas(ciudad = "zafra", format = "json") {
	const url = `https://geocoding-api.open-meteo.com/v1/search?name=${ciudad}&count=1&language=es&format=${format}`;

	try {
		// input: RequestInfo | URL string  ; output: Promise<Response>
		const respuesta = await fetch(url);
		if (respuesta && respuesta.status !== 200) {
			throw new Error(`Error en la solicitud de coordenadas: ${respuesta.status} ${respuesta.statusText}`);
		}
		// transformar la respuesta en json
		const datos = await respuesta.json();
		if (!datos.results || datos.results.length === 0) {
			throw new Error(`No se encontraron resultados para la ciudad: ${ciudad}`);
		}
		// obtener el primer resultado/objeto del JSON
		const lugar = datos.results[0];
		// desestructuración del objeto (lugar) para obtener latitud y longitud
		const coordenadas = {
			latitud: lugar.latitude,
			longitud: lugar.longitude,
		};
		// devuelve objeto coordenadas = {latitud:xx, longitud:yy}
		return coordenadas;
	} catch (error) {
		throw error;
	}
}

async function obtenerTiempo(latitud, longitud, ciudad) {
	const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitud}&longitude=${longitud}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weathercode,windspeed_10m`;
	try {
		// input: RequestInfo | URL string  ; output: Promise<Response>
		const respuesta = await fetch(url);
		if (respuesta.status !== 200) {
			throw new Error(
				`Error en la solicitud de datos meteorológicos: ${respuesta.status} ${respuesta.statusText}`
			);
		}
		// transformar la respuesta en json
		const datos = await respuesta.json();
		if (!datos.current_weather || !datos.hourly) {
			throw new Error(`No se encontraron datos meteorológicos para las coordenadas: ${latitud}, ${longitud}`);
		}
		/*
        Construcción de propiedades directas
        */
		// Hora actual del registro/cunsulta (intervalos de 15')
		const horaActual = new Date(datos.current_weather.time);
		// Array de horas de los registros horarios (intervalos de 1h)
		const horasRegistro = datos.hourly.time.map(h => new Date(h));
		// Obtención de temperatura y viento actuales con sus escalas
		const temperatura = datos.current_weather.temperature;
		const escalaTemperatura = datos.current_weather_units.temperature;
		const viento = datos.current_weather.windspeed;
		const escalaViento = datos.current_weather_units.windspeed;

		/*
        Búsqueda de la hora más próxima (anterior en punto) en los registros horarios y obtención de la humedad relativa
        */
		// Creo una copia de la hora actual y le pongo minutos, segundos y milisegundos a 0
		const horaMasProxima = new Date(horaActual.getTime());
		// Si no creo una copia, al modificar horaMasProxima también se modifica horaActual (enlace a referencia)
		horaMasProxima.setMinutes(0, 0, 0);

		// Averiguo el índice de la hora más próxima en el array de horas de los registros horarios
		const indice = horasRegistro.findIndex(d => d.getTime() == horaMasProxima.getTime());
		if (indice === -1) {
			throw new Error(`No se encontró la última hora en punto en los registros horarios.`);
		}

		// Obtengo la humedad relativa a partir del índice obtenido, ya que está en el mismo orden que el registro de horas
		const humedad = datos.hourly.relative_humidity_2m[indice];

		// Devuelvo un objeto con las propiedades requeridas
		return {
			ciudad: ciudad,
			hora: horaActual,
			horaMasProxima: horaMasProxima,
			indice: indice,
			temperatura: temperatura,
			escalaTemperatura: escalaTemperatura,
			viento: viento,
			escalaViento: escalaViento,
			humedad: humedad,
			escalaHumedad: "%",
		};
	} catch (error) {
		throw error;
	}
}
