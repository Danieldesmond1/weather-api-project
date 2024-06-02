import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import dotenv from "dotenv";

// Load environment variables from .env file into process.env
dotenv.config();

const app = express();
const port = 3000;

function getHumidityMessage(humidity) {
  if (humidity >= 0 && humidity < 30) {
    return "Low humidity, which can cause dry 😣skin and irritation 🤢.";
  } else if (humidity >= 30 && humidity < 60) {
    return "Comfortable 😎 humidity levels for most people 😁.";
  } else if (humidity >= 60 && humidity <= 100) {
    return "High humidity, ☀ which can make the air feel warmer 🥵 and can lead to discomfort, 🤕 and other issues.";
  } else {
    return "Invalid humidity level.";
  }
}

function formatTimeToAmPm(dateTimeString) {
  const date = new Date(dateTimeString);
  let hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const minutesStr = minutes < 10 ? "0" + minutes : minutes;
  return `${hours}:${minutesStr} ${ampm}`;
}

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

app.get("/", async (req, res) => {
  res.render("index.ejs");
});

app.post("/city", async (req, res) => {
  const city = req.body.city;
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;

  try {
    // First, get the latitude and longitude for the city
    const geoResponse = await axios.get(
      `http://api.openweathermap.org/geo/1.0/direct?q=${city}&appid=${apiKey}`
    );
    if (geoResponse.data.length > 0) {
      const { lat, lon } = geoResponse.data[0];

      // Then, get the weather data for the latitude and longitude
      const weatherResponse = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`
      );
      const weatherMain = weatherResponse.data.weather[0].main;
      const weatherDescription = weatherResponse.data.weather[0].description;
      const humidity = weatherResponse.data.main.humidity;
      const humidityMessage = getHumidityMessage(humidity);
      const country = weatherResponse.data.sys.country;

      res.render("result.ejs", {
        location: city,
        latitude: lat,
        longitude: lon,
        weatherMain,
        weatherDescription,
        humidity,
        humidityMessage,
        country: country,
      });
    } else {
      res.render("result.ejs", {
        location: city,
        latitude: "N/A",
        longitude: "N/A",
        weatherMain: "N/A",
        weatherDescription: "N/A",
        humidity: "N/A",
        humidityMessage: "N/A",
        country: "N/A",
      });
    }
  } catch (error) {
    console.log(error);
    res.render("result.ejs", {
      location: city,
      latitude: "Error",
      longitude: "Error",
      weatherMain: "Error",
      weatherDescription: "Error",
      humidity: "Error",
      humidityMessage: "Error",
      country: "Error",
    });
  }
});

app.post("/tomorrow", async (req, res) => {
  const tomorrow = req.body.tomorrow;
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;

  try {
    // First, get the latitude and longitude for the tomorrow
    const geoResponse = await axios.get(
      `http://api.openweathermap.org/geo/1.0/direct?q=${tomorrow}&appid=${apiKey}`
    );
    if (geoResponse.data.length > 0) {
      const { lat, lon } = geoResponse.data[0];

      // Then, get the weather data for the latitude and longitude
      const weatherResponse = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`
      );
      const weatherMain = weatherResponse.data.weather[0].main;
      const weatherDescription = weatherResponse.data.weather[0].description;
      const humidity = weatherResponse.data.main.humidity;
      const humidityMessage = getHumidityMessage(humidity);

      // Get the weather forecast for the next 5 days (every 3 hours) using the 5 Day / 3 Hour Forecast API
      const forecastResponse = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}`
      );
      const forecastData = forecastResponse.data.list;

      // Extract tomorrow's forecast data
      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrowDateString = tomorrowDate.toISOString().split("T")[0]; // Format to YYYY-MM-DD

      // Check for rain in tomorrow's forecast data and get the exact time
      const rainTimes = forecastData
        .filter(
          (forecast) =>
            forecast.dt_txt.startsWith(tomorrowDateString) &&
            forecast.weather.some((w) => w.main.toLowerCase() === "rain")
        )
        .map((forecast) => formatTimeToAmPm(forecast.dt_txt));

      res.render("tomorrow.ejs", {
        location: tomorrow,
        latitude: lat,
        longitude: lon,
        weatherMain,
        weatherDescription,
        humidity,
        humidityMessage,
        rainTimes,
      });
    } else {
      res.render("tomorrow.ejs", {
        location: tomorrow,
        latitude: "N/A",
        longitude: "N/A",
        weatherMain: "N/A",
        weatherDescription: "N/A",
        humidity: "N/A",
        humidityMessage: "N/A",
        rainTimes: [],
      });
    }
  } catch (error) {
    console.log(error);
    res.render("tomorrow.ejs", {
      location: tomorrow,
      latitude: "Error",
      longitude: "Error",
      weatherMain: "Error",
      weatherDescription: "Error",
      humidity: "Error",
      humidityMessage: "Error",
      rainTimes: [],
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
